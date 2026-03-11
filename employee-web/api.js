/**
 * واجهة API لتطبيق الموظفين
 */
const API_BASE = '';

function getAuthToken() {
    return localStorage.getItem('appToken') || '';
}

function getAuthHeaders(extra = {}) {
    const token = getAuthToken();
    const headers = { ...extra };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

async function apiGet(url) {
    const res = await fetch(API_BASE + url, { headers: getAuthHeaders() });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
        try {
            const j = JSON.parse(text);
            throw new Error(j.error || text || res.statusText);
        } catch (e) {
            if (e instanceof Error && e.message) throw e;
            throw new Error(text || res.statusText);
        }
    }
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

async function apiPost(url, body) {
    const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body || {})
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
        try {
            const j = JSON.parse(text);
            throw new Error(j.error || text || res.statusText);
        } catch (e) {
            if (e instanceof Error && e.message) throw e;
            throw new Error(text || res.statusText);
        }
    }
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

async function apiPut(url, body) {
    const res = await fetch(API_BASE + url, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body || {})
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
        try { const j = JSON.parse(text); throw new Error(j.error || text || res.statusText); } catch (e) {
            if (e instanceof Error && e.message) throw e; throw new Error(text || res.statusText);
        }
    }
    return text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
}

async function apiPostBlob(url, body) {
    const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    return res.blob();
}

window.api = {
    auth: {
        login: (username, password) => apiPost('/api/auth/login', { username, password }),
        logout: () => apiPost('/api/auth/logout', {}),
        me: () => apiGet('/api/auth/me'),
        getToken: getAuthToken,
        setToken: (t) => { if (t) localStorage.setItem('appToken', t); else localStorage.removeItem('appToken'); }
    },
    orders: {
        create: (data) => apiPost('/api/orders', data),
        getById: (id) => apiGet('/api/orders/' + id),
        update: (id, data) => apiPut('/api/orders/' + id, data),
        getAll: (filters = {}) => {
            const q = new URLSearchParams();
            if (filters.search) q.set('search', filters.search);
            if (filters.status) q.set('status', filters.status);
            if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) q.set('dateTo', filters.dateTo);
            if (filters.limit) q.set('limit', filters.limit);
            return apiGet('/api/orders?' + q.toString());
        },
        assignDriver: (num, driverId) => apiPost('/api/orders/assign', { shipmentNumber: num, driverId }),
        print: async (order) => {
            const blob = await apiPostBlob('/api/label/pdf', order);
            return URL.createObjectURL(blob);
        },
        markLabelPrinted: (orderId) => apiPost('/api/orders/' + orderId + '/mark-label-printed', {})
    },
    drivers: {
        getAll: () => apiGet('/api/drivers?active=true'),
        verifyPassword: (password) => apiPost('/api/drivers/verify-password', { password })
    },
    regions: {
        getAll: () => apiGet('/api/regions')
    },
    settings: {
        getDefaults: () => apiGet('/api/settings/defaults')
    }
};
