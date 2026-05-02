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
    console.log(`📡 Handling ${config.method.toUpperCase()} offline/network failure for ${config.url}`);
    
    const { table: dexieTable } = resolveTableFromUrl(config.url);
    const path = config.url.split('?')[0];
    const segments = path.split('/').filter(Boolean);
    const recordId = config.method === 'post' ? null : segments[segments.length - 1];
    
    // Generate a temporary local ID for POST requests if needed
    let mockResponseData = { id: recordId || 'local_' + Date.now(), ...config.data };

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const orgId = user?.organizationId || 1;

    const resource = segments[0] || dexieTable;

    await addToOutbox(
        resource, // Store the resource path for SyncService
        recordId || mockResponseData.id, 
        config.method.toUpperCase() === 'POST' ? 'INSERT' : config.method.toUpperCase() === 'PUT' ? 'UPDATE' : 'DELETE', 
        config.data,
        orgId
    );

    // Update local database immediately
    if (dexieTable && db[dexieTable]) {
        try {
            if (config.method === 'post') {
                const newRecord = { ...config.data, id: mockResponseData.id, sync_status: 'pending_push', createdAt: new Date().toISOString() };
                await db[dexieTable].add(newRecord);
                
                // SPECIAL LOGIC: Sales/Purchases/Returns should also appear in 'invoices' table for the UI list
                const resource = segments[0] || '';
                if (resource === 'sales' || resource === 'purchases' || resource === 'returns') {
                    // Try to resolve customer/supplier names from local DB for better UI display
                    let customer = null;
                    if (newRecord.customerName) {
                        customer = { name: newRecord.customerName };
                    } else if (newRecord.customerId) {
                        const localCust = await db.clients.get(newRecord.customerId);
                        customer = localCust ? { name: localCust.name, id: localCust.id } : { id: newRecord.customerId };
                    }

                    let supplier = null;
                    if (newRecord.supplierId) {
                        const localSupp = await db.clients.get(newRecord.supplierId);
                        supplier = localSupp ? { name: localSupp.name, id: localSupp.id } : { id: newRecord.supplierId };
                    }

                    const invRecord = {
                        ...newRecord,
                        invoiceNo: newRecord.invoiceNo || `LOCAL-${Date.now()}`,
                        type: resource === 'sales' ? 'SALE' : resource === 'purchases' ? 'PURCHASE' : 'RETURN',
                        customer,
                        supplier,
                    };
                    
                    // Add to invoices table if not already there (it might be if dexieTable is invoices)
                    if (dexieTable !== 'invoices') {
                        await db.invoices.add(invRecord);
                    }

                    // UPDATE PRODUCT STOCK LOCALLY
                    if (newRecord.items && Array.isArray(newRecord.items)) {
                        for (const item of newRecord.items) {
                            const productId = item.id || item.productId;
                            if (productId) {
                                const product = await db.products.get(productId);
                                if (product) {
                                    // Sale: subtract, Purchase: add, Return: add
                                    const qtyChange = resource === 'sales' ? -item.quantity : (resource === 'purchases' || resource === 'returns') ? item.quantity : 0;
                                    await db.products.update(productId, { 
                                        stockQty: (product.stockQty || 0) + qtyChange 
                                    });
                                }
                            }
                        }
                    }
                }
            } else if (config.method === 'put') {
                await db[dexieTable].update(recordId, { ...config.data, sync_status: 'pending_push' });
                if (db.invoices) {
                    const exists = await db.invoices.get(recordId);
                    if (exists) await db.invoices.update(recordId, { ...config.data });
                }
            } else if (config.method === 'delete') {
                await db[dexieTable].delete(recordId);
                if (db.invoices) await db.invoices.delete(recordId);
            }
        } catch (e) {
            console.warn('Failed to update local DB logic:', e);
        }
    }

    return { 
        data: mockResponseData, 
        status: 200, 
        statusText: 'OK (Offline/Queued)', 
        headers: {}, 
        config 
    };
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
            
            // Cache user data for offline login
            if (response.data.user) {
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
