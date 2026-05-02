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
    'suppliers': 'suppliers',
    'invoices': 'invoices',
    'expenses': 'expenses',
    'warehouses': 'warehouses',
    'sales': 'sales',
    'purchases': 'purchases',
    'returns': 'returns',
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
// REQUEST INTERCEPTOR — Offline Write Queuing
// ────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // OFFLINE QUEUING LOGIC for write operations
    if (typeof window !== 'undefined' && !navigator.onLine && ['post', 'put', 'delete'].includes(config.method)) {
        console.log(`📡 App Offline: Queuing ${config.method.toUpperCase()} request for ${config.url}`);
        
        const { table: dexieTable } = resolveTableFromUrl(config.url);
        
        const path = config.url.split('?')[0];
        const segments = path.split('/').filter(Boolean);
        const recordId = config.method === 'post' ? null : segments[segments.length - 1];
        
        // Generate a temporary local ID for POST requests if needed
        let mockResponseData = { id: recordId || 'local_' + Date.now(), ...config.data };

        await addToOutbox(
            dexieTable, 
            recordId || mockResponseData.id, 
            config.method.toUpperCase() === 'POST' ? 'INSERT' : config.method.toUpperCase() === 'PUT' ? 'UPDATE' : 'DELETE', 
            config.data,
            1 // Default organization ID for now
        );

        // Update local database immediately
        if (dexieTable && db[dexieTable]) {
            try {
                if (config.method === 'post') {
                    await db[dexieTable].add({ ...config.data, id: mockResponseData.id, sync_status: 'pending_push' });
                } else if (config.method === 'put') {
                    await db[dexieTable].update(recordId, { ...config.data, sync_status: 'pending_push' });
                } else if (config.method === 'delete') {
                    await db[dexieTable].delete(recordId);
                }
            } catch (e) {
                console.warn('Failed to update local DB:', e);
            }
        }

        // Throw a custom error that can be caught as "Success (Offline)"
        const offlineError = new Error('OFFLINE_QUEUED');
        offlineError.data = mockResponseData;
        throw offlineError;
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
                    // Cache stats as a single keyed record
                    await db.cached_stats.put({ key: 'dashboard_stats', ...response.data });
                } else if (table && db[table] && Array.isArray(response.data)) {
                    // Cache array data silently in background
                    cacheApiData(table, response.data).catch(() => {});
                }
            } catch (e) {
                // Caching failure should never break the app
            }
        }
        return response;
    },
    async (error) => {
        // Handle OFFLINE_QUEUED: return as if it succeeded
        if (error.message === 'OFFLINE_QUEUED') {
            return Promise.resolve({ data: error.data, status: 200, statusText: 'OK (Offline)', config: error.config });
        }
        
        // Handle network errors for GET requests — serve from local cache
        if (error.config && error.config.method === 'get' && (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
            console.warn(`🔌 Offline fallback for GET ${error.config.url}`);
            
            try {
                const { table, isSpecial, compound } = resolveTableFromUrl(error.config.url);
                
                if (isSpecial) {
                    if (compound === 'reports/stats') {
                        const cached = await db.cached_stats.get('dashboard_stats');
                        if (cached) {
                            const { key, ...stats } = cached;
                            return { data: stats, status: 200, statusText: 'OK (Local Cache)', config: error.config };
                        }
                        // If no cached stats, compute from local data
                        const products = await getLocalData('products');
                        const invoices = await getLocalData('invoices');
                        const expenses = await getLocalData('expenses');
                        const sales = await getLocalData('sales');
                        
                        const totalSales = sales.reduce((acc, s) => acc + (s.finalAmount || s.totalAmount || 0), 0)
                            + invoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + (i.finalAmount || 0), 0);
                        const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
                        
                        return {
                            data: { products: products.length, sales: totalSales, expenses: totalExpenses },
                            status: 200,
                            statusText: 'OK (Computed Local)',
                            config: error.config
                        };
                    }
                    if (compound === 'debts/debtors') {
                        return { data: await getLocalData('debts_debtors'), status: 200, statusText: 'OK (Local)', config: error.config };
                    }
                    if (compound === 'debts/creditors') {
                        return { data: await getLocalData('debts_creditors'), status: 200, statusText: 'OK (Local)', config: error.config };
                    }
                    if (compound === 'expenses/categories') {
                        return { data: await getLocalData('expense_categories'), status: 200, statusText: 'OK (Local)', config: error.config };
                    }
                    // reports/activities, reports/charts, reports/top-products — return empty
                    return { data: [], status: 200, statusText: 'OK (Empty Local)', config: error.config };
                }
                
                if (table && db[table]) {
                    const localData = await getLocalData(table);
                    return { data: localData, status: 200, statusText: 'OK (Local Cache)', config: error.config };
                }
            } catch (localErr) {
                console.warn('Local fallback also failed:', localErr);
            }
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
