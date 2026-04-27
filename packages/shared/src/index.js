export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SA-u-nu-latn', {
        style: 'currency',
        currency: 'MRU',
    }).format(amount);
};

export const formatDate = (date) => {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn').format(new Date(date));
};

export const calculateLineTotal = (qty, price) => {
    return parseFloat(qty) * parseFloat(price);
};

export const API_CONFIG = {
    BASE_URL: 'http://localhost:4000/v1',
    ENDPOINTS: {
        AUTH: '/auth',
        PRODUCTS: '/products',
        SALES: '/sales',
        CUSTOMERS: '/customers',
        SUPPLIERS: '/suppliers',
        EXPENSES: '/expenses',
        REPORTS: '/reports'
    }
};
