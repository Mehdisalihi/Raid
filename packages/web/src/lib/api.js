import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/v1',
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },
    register: async (name, email, password, phone) => {
        const response = await api.post('/auth/register', { name, email, password, phone });
        return response.data;
    },
    loginGuest: async () => {
        return {
            token: 'guest_token',
            user: {
                id: 'guest',
                name: 'زائر',
                email: 'guest@raid.com',
                role: 'guest'
            }
        };
    },
    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

export default api;
