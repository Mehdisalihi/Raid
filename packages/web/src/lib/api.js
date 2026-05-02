import axios from 'axios';
import { db, addToOutbox } from './db';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/v1',
});

// Cache for mapping local IDs to server IDs if needed
const localToServerMap = new Map();

api.interceptors.request.use(async (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // OFFLINE QUEUING LOGIC
    if (typeof window !== 'undefined' && !navigator.onLine && ['post', 'put', 'delete'].includes(config.method)) {
        console.log(`📡 App Offline: Queuing ${config.method.toUpperCase()} request for ${config.url}`);
        
        // Robust URL parsing: /v1/products/123 or /products
        const path = config.url.split('?')[0]; // Remove query params
        const segments = path.split('/').filter(Boolean);
        
        // Common resource names in our DB
        const validTables = ['products', 'customers', 'suppliers', 'invoices', 'expenses', 'clients', 'organizations', 'users'];
        
        let actualTable = segments.find(s => validTables.includes(s));
        
        // Fallback: If not in validTables, take the first segment after 'v1' or the first segment
        if (!actualTable) {
            const v1Index = segments.indexOf('v1');
            actualTable = v1Index !== -1 ? segments[v1Index + 1] : segments[0];
        }

        // MAPPING: API resource name -> Dexie table name
        const tableMapping = {
            'customers': 'clients',
            'suppliers': 'clients',
            // Add others if they differ
        };
        const dexieTable = tableMapping[actualTable] || actualTable;

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
            if (config.method === 'post') {
                await db[dexieTable].add({ ...config.data, id: mockResponseData.id, sync_status: 'pending_push' });
            } else if (config.method === 'put') {
                await db[dexieTable].update(recordId, { ...config.data, sync_status: 'pending_push' });
            } else if (config.method === 'delete') {
                await db[dexieTable].delete(recordId);
            }
        }

        // Throw a custom error that can be caught as "Success (Offline)"
        const offlineError = new Error('OFFLINE_QUEUED');
        offlineError.data = mockResponseData;
        throw offlineError;
    }

    return config;
});

// Global response interceptor to handle the "OFFLINE_QUEUED" trick
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.message === 'OFFLINE_QUEUED') {
            return Promise.resolve({ data: error.data, status: 200, statusText: 'OK (Offline)', config: error.config });
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


