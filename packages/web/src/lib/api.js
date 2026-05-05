import axios from 'axios';
import { db, addToOutbox, cacheApiData, getLocalData } from './db';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://backend-dedamed222s-projects.vercel.app/v1',
});

// Cache for mapping local IDs to server IDs if needed
const localToServerMap = new Map();

// ────────────────────────────────────────────
// TABLE MAPPING: URL path segment → Dexie table
// ────────────────────────────────────────────
const URL_TO_TABLE = {
    'products': 'products',
    'customers': 'clients',
    'suppliers': 'clients', // Using clients table for both
    'invoices': 'invoices',
    'expenses': 'expenses',
    'warehouses': 'warehouses',
    'sales': 'invoices',
    'purchases': 'invoices',
    'returns': 'invoices',
    'users': 'users',
    'organizations': 'organizations',
};

// Special compound routes that need custom local handling
const SPECIAL_ROUTES = {
    'debts/debtors': 'debts_debtors',
    'debts/creditors': 'debts_creditors',
    'expenses/categories': 'expense_categories',
    'reports/stats': 'cached_stats',
    'reports/activities': null,
    'reports/charts': null,
    'reports/top-products': null,
};

function resolveTableFromUrl(url) {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    // Remove 'v1' prefix if present
    const idx = segments.indexOf('v1');
    const relevant = idx !== -1 ? segments.slice(idx + 1) : segments;

    // Check special compound routes first
    const compound = relevant.slice(0, 2).join('/');
    if (compound in SPECIAL_ROUTES) {
        return { table: SPECIAL_ROUTES[compound], isSpecial: true, compound };
    }

    // Standard table lookup
    const resource = relevant[0];
    return { table: URL_TO_TABLE[resource] || resource, isSpecial: false };
}

// ────────────────────────────────────────────
// SHARED OFFLINE WRITE HANDLER
// ────────────────────────────────────────────
async function handleOfflineWrite(config) {
    try {
        console.log(`📡 Handling ${config.method.toUpperCase()} offline/network failure for ${config.url}`);
        
        let payload = config.data;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch { payload = {}; }
        }
        if (!payload || typeof payload !== 'object') payload = {};

        const { table: dexieTable } = resolveTableFromUrl(config.url);
        
        const path = config.url.split('?')[0];
        const segments = path.split('/').filter(Boolean);
        const idx = segments.indexOf('v1');
        const relevant = idx !== -1 ? segments.slice(idx + 1) : segments;
        
        const method = (config.method || '').toLowerCase();
        const recordId = method === 'post' ? null : relevant[relevant.length - 1];
        const resource = relevant[0] || dexieTable;
        
        let mockResponseData = { id: recordId || 'local_' + Date.now(), ...payload };

        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const user = userStr ? JSON.parse(userStr) : null;
        const orgId = user?.organizationId || 1;

        // Update local database immediately
        if (dexieTable && db[dexieTable]) {
            try {
                if (method === 'post') {
                    // Remove string ID to let Dexie generate a valid auto-increment integer ID
                    const { id: _temp, ...recordData } = payload;
                    const newRecord = { 
                        ...recordData, 
                        sync_status: 'pending_push', 
                        createdAt: new Date().toISOString() 
                    };
                    
                    const localId = await db[dexieTable].add(newRecord);
                    mockResponseData.id = localId; // Return the correct integer ID to the UI
                    
                    // SPECIAL LOGIC: Update UI tables and stock
                    if (['sales', 'purchases', 'returns'].includes(resource)) {
                        let customer = null;
                        if (newRecord.customerName) {
                            customer = { name: newRecord.customerName };
                        } else if (newRecord.customerId) {
                            const localCust = await db.clients.get(Number(newRecord.customerId));
                            customer = localCust ? { name: localCust.name, id: localCust.id } : { id: newRecord.customerId };
                        }

                        let supplier = null;
                        if (newRecord.supplierId) {
                            const localSupp = await db.clients.get(Number(newRecord.supplierId));
                            supplier = localSupp ? { name: localSupp.name, id: localSupp.id } : { id: newRecord.supplierId };
                        }

                        const invRecord = {
                            ...newRecord,
                            id: localId, // Ensure it has the same ID
                            invoiceNo: newRecord.invoiceNo || `LOCAL-${Date.now()}`,
                            type: resource === 'sales' ? 'SALE' : resource === 'purchases' ? 'PURCHASE' : 'RETURN',
                            customer,
                            supplier,
                        };
                        
                        if (dexieTable !== 'invoices') {
                            await db.invoices.put(invRecord);
                        }

                        // Update stock locally
                        if (newRecord.items && Array.isArray(newRecord.items)) {
                            for (const item of newRecord.items) {
                                const productId = item.id || item.productId;
                                if (productId) {
                                    const product = await db.products.get(Number(productId));
                                    if (product) {
                                        const qtyChange = resource === 'sales' ? -item.quantity : (resource === 'purchases' || resource === 'returns') ? item.quantity : 0;
                                        await db.products.update(Number(productId), { 
                                            stockQty: (product.stockQty || 0) + qtyChange 
                                        });
                                    }
                                }
                            }
                        }
                    }
                } else if (method === 'put') {
                    const numericId = Number(recordId);
                    if (!isNaN(numericId)) {
                        await db[dexieTable].update(numericId, { ...payload, sync_status: 'pending_push' });
                        if (db.invoices) {
                            const exists = await db.invoices.get(numericId);
                            if (exists) await db.invoices.update(numericId, { ...payload });
                        }
                    }
                } else if (method === 'delete') {
                    const numericId = Number(recordId);
                    if (!isNaN(numericId)) {
                        await db[dexieTable].delete(numericId);
                        if (db.invoices) await db.invoices.delete(numericId);
                    }
                }
            } catch (e) {
                console.error('Failed to update local DB logic:', e);
            }
        }

        // Add to outbox AFTER local DB so we use the actual localId if it was a POST
        await addToOutbox(
            resource,
            mockResponseData.id, 
            method === 'post' ? 'INSERT' : method === 'put' ? 'UPDATE' : 'DELETE', 
            payload,
            orgId
        );

        return { 
            data: { ...mockResponseData, offline: true }, 
            status: 200, 
            statusText: 'OK (Offline/Queued)', 
            headers: {}, 
            config 
        };
    } catch (criticalError) {
        console.error('CRITICAL ERROR in handleOfflineWrite:', criticalError);
        // Fallback response to avoid crashing the app
        return { 
            data: { error: 'Offline save failed internally', offline: true }, 
            status: 500, 
            statusText: 'Internal Error', 
            headers: {}, 
            config 
        };
    }
}

// ────────────────────────────────────────────
// REQUEST INTERCEPTOR — Pre-emptive Offline
// ────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Pre-emptive offline check
    if (typeof window !== 'undefined' && !navigator.onLine && ['post', 'put', 'delete'].includes(config.method)) {
        config.adapter = async () => await handleOfflineWrite(config);
    }

    return config;
});

// ────────────────────────────────────────────
// RESPONSE INTERCEPTOR — Offline queue success + Auto-cache
// ────────────────────────────────────────────
api.interceptors.response.use(
    async (response) => {
        // Auto-cache successful GET responses into IndexedDB
        if (response.config && response.config.method === 'get' && response.data) {
            try {
                const { table, isSpecial, compound } = resolveTableFromUrl(response.config.url);
                
                if (isSpecial && compound === 'reports/stats') {
                    await db.cached_stats.put({ key: 'dashboard_stats', ...response.data });
                } else if (table && db[table] && Array.isArray(response.data)) {
                    cacheApiData(table, response.data).catch(() => {});
                }
            } catch (e) {}
        }
        return response;
    },
    async (error) => {
        const { config, response } = error;
        
        // If the request explicitly wants to skip offline handling (like from SyncService)
        if (config?.skipOffline) {
            return Promise.reject(error);
        }

        const isNetworkError = !response || 
                               error.code === 'ERR_NETWORK' || 
                               error.code === 'ECONNABORTED' || 
                               error.message === 'Network Error' ||
                               error.message.includes('timeout') ||
                               error.message.includes('ERR_CONNECTION_REFUSED');
        
        // Handle network errors for GET requests — serve from local cache
        if (config && config.method === 'get' && isNetworkError) {
            console.warn(`🔌 Network error fallback for GET ${config.url}`);
            try {
                const { table, isSpecial, compound } = resolveTableFromUrl(config.url);
                if (isSpecial) {
                    if (compound === 'reports/stats') {
                        const cached = await db.cached_stats.get('dashboard_stats');
                        if (cached) {
                            const { key, ...stats } = cached;
                            return { data: stats, status: 200, statusText: 'OK (Local Cache)', config };
                        }
                    }
                    return { data: [], status: 200, statusText: 'OK (Empty Local)', config };
                }
                
                if (table && db[table]) {
                    let localData;
                    if (config.url.includes('/customers')) {
                        localData = await db.clients.where('role').notEqual('supplier').toArray();
                    } else if (config.url.includes('/suppliers')) {
                        localData = await db.clients.where('role').equals('supplier').toArray();
                    } else {
                        localData = await getLocalData(table);
                    }
                    return { data: localData, status: 200, statusText: 'OK (Local Cache)', config };
                }
            } catch (localErr) {}
        }

        // ⚠️ CRITICAL: Handle network errors for WRITE requests — Queue for later
        if (config && ['post', 'put', 'delete'].includes(config.method) && isNetworkError) {
            console.warn(`🔌 Network error during WRITE ${config.url}. Queuing for background sync.`);
            return await handleOfflineWrite(config);
        }
        
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        try {
            if (!navigator.onLine) {
                // Offline Login Logic
                const user = await db.users.where('email').equals(email).first();
                if (user && user.password_hash === btoa(password)) { // Simple local hash check
                    return { token: 'offline_token', user };
                }
                throw new Error('فشل تسجيل الدخول أوفلاين. تحقق من البيانات.');
            }

            const response = await api.post('/auth/login', { email, password });
            
            if (response.data.user) {
                // DATA ISOLATION: Check if this is a DIFFERENT user than the last one cached.
                // If yes, or if no old user exists, we MUST clear the local business database.
                try {
                    const oldUserStr = localStorage.getItem('user');
                    let isDifferentUser = true;
                    if (oldUserStr) {
                        const oldUser = JSON.parse(oldUserStr);
                        if (oldUser.id === response.data.user.id) {
                            isDifferentUser = false;
                        }
                    }
                    if (isDifferentUser) {
                        const { clearBusinessData } = await import('@/lib/db');
                        await clearBusinessData();
                    }
                } catch (e) {
                    console.error('Error during data isolation check:', e);
                }

                // Cache user data for offline login
                await db.users.put({
                    ...response.data.user,
                    password_hash: btoa(password), // Caching a simple hash for offline comparison
                    server_id: response.data.user.id
                });
            }
            
            return response.data;
        } catch (error) {
            if (!navigator.onLine && error.message !== 'OFFLINE_QUEUED') throw new Error('لا يوجد اتصال بالإنترنت وبيانات الدخول غير مخزنة.');
            throw error;
        }
    },
    loginGuest: async () => {
        // Guest login is basically a fresh isolated session
        try {
            const { clearBusinessData } = await import('@/lib/db');
            await clearBusinessData();
        } catch (e) {}

        const response = await api.post('/auth/guest');
        return response.data;
    },
    register: async (name, email, password, phone) => {
        const response = await api.post('/auth/register', { name, email, password, phone });
        return response.data;
    },
    getMe: async () => {
        if (!navigator.onLine) {
            const cachedUser = localStorage.getItem('user');
            return cachedUser ? JSON.parse(cachedUser) : null;
        }
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export default api;
