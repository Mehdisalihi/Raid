import axios from 'axios';
import { db } from './db';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/v1',
});

api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
            if (!navigator.onLine) throw new Error('لا يوجد اتصال بالإنترنت وبيانات الدخول غير مخزنة.');
            throw error;
        }
    },
    // ... existing register and getMe ...
    register: async (name, email, password, phone) => {
        const response = await api.post('/auth/register', { name, email, password, phone });
        return response.data;
    },
    getMe: async () => {
        if (!navigator.onLine) {
            return JSON.parse(localStorage.getItem('user'));
        }
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export default api;

