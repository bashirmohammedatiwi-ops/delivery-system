/**
 * واجهة API للويب - تستبدل preload/Electron بـ fetch
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
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

async function apiPost(url, body) {
    const res = await fetch(API_BASE + url, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body || {})
    });
    const text = await res.text().catch(() => res.statusText || '');
    if (!res.ok) {
        try {
            const j = JSON.parse(text);
            throw new Error(j.error || j.message || text);
        } catch (e) {
            if (e instanceof SyntaxError) throw new Error(text || res.statusText);
            throw e;
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
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

async function apiDelete(url) {
    const res = await fetch(API_BASE + url, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    const text = await res.text();
    if (!text) return { success: true };
    try { return JSON.parse(text); } catch { return { success: true }; }
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
    showMessage: async (msg, title) => alert(title ? title + '\n\n' + msg : msg),
    showConfirm: async (msg) => confirm(msg),

    auth: {
        login: (username, password) => apiPost('/api/auth/login', { username, password }),
        employeeSession: () => apiPost('/api/auth/employee-session', {}),
        logout: () => apiPost('/api/auth/logout', {}),
        me: () => apiGet('/api/auth/me'),
        getToken: getAuthToken,
        setToken: (token) => { if (token) localStorage.setItem('appToken', token); else localStorage.removeItem('appToken'); }
    },

    orders: {
        create: (data) => apiPost('/api/orders', data),
        getAll: (filters = {}) => {
            const q = new URLSearchParams();
            if (filters.search) q.set('search', filters.search);
            if (filters.driverId) q.set('driverId', filters.driverId);
            if (filters.status) q.set('status', filters.status);
            if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) q.set('dateTo', filters.dateTo);
            if (filters.limit) q.set('limit', filters.limit);
            return apiGet('/api/orders?' + q.toString());
        },
        getByShipment: (num) => apiGet('/api/orders/shipment/' + encodeURIComponent(num)),
        getById: (id) => apiGet('/api/orders/' + id),
        update: (id, data) => apiPut('/api/orders/' + id, data),
        updateStatus: (id, status) => apiPost('/api/orders/update-status', { orderId: parseInt(id), status }),
        delete: (id) => apiDelete('/api/orders/' + id),
        assignDriver: (num, driverId) => apiPost('/api/orders/assign', { shipmentNumber: num, driverId }),
        assignByDriverCode: (num, driverCode) => apiPost('/api/orders/assign-by-code', { shipmentNumber: num, driverCode }),
        returnFromDriver: (num) => apiPost('/api/orders/return', { shipmentNumber: num }),

        /** طباعة الملصق - يعيد URL للفتح في نافذة جديدة */
        print: async (order) => {
            const blob = await apiPostBlob('/api/label/pdf', order);
            return URL.createObjectURL(blob);
        },
        markLabelPrinted: (orderId) => apiPost('/api/orders/' + orderId + '/mark-label-printed', {}),
        markReturnedOrderReceived: (orderId) => apiPost('/api/orders/' + orderId + '/receive-returned', {})
    },

    drivers: {
        verifyPassword: (password) => apiPost('/api/drivers/verify-password', { password }),
        getAll: (opts) => apiGet(opts?.all ? '/api/drivers?active=false' : '/api/drivers'),
        getActive: () => apiGet('/api/drivers?active=true'),
        create: (name, phone) => apiPost('/api/drivers', { name, phone }),
        update: (id, name, phone, active) => apiPut('/api/drivers/' + id, { name, phone, active }),
        delete: (id) => apiDelete('/api/drivers/' + id),
        createAccount: (id, username, password) => apiPost('/api/drivers/create-account', { driverId: parseInt(id), username: username || undefined, password: password || undefined }),
        regeneratePassword: (id, password) => apiPost('/api/drivers/regenerate-password', { driverId: parseInt(id), password }),
        getCredentials: (id) => apiPost('/api/driver-credentials', { driverId: parseInt(id) }),
        collectFees: (driverId, orderDate) => apiPost('/api/drivers/collect-fees', { driverId: parseInt(driverId), orderDate }),
        getFeesCollectedStatus: (driverId, orderDate) => apiGet(`/api/drivers/fees-collected-status?driverId=${driverId}&orderDate=${encodeURIComponent(orderDate)}`)
    },

    notifications: {
        getFreeDeliveryOverrides: () => apiGet('/api/notifications/free-delivery-overrides'),
        markAsReviewed: (id) => apiPost('/api/notifications/' + id + '/review', {})
    },
    settings: {
        getDefaults: () => apiGet('/api/settings/defaults'),
        updateDefaults: (data) => apiPut('/api/settings/defaults', data)
    },
    regions: {
        getAll: () => apiGet('/api/regions'),
        create: (regionName, deliveryFeeIQD, regionArea) => apiPost('/api/regions', { regionName, deliveryFeeIQD, regionArea }),
        update: (id, regionName, deliveryFeeIQD, regionArea) => apiPut('/api/regions/' + id, { regionName, deliveryFeeIQD, regionArea }),
        delete: (id) => apiDelete('/api/regions/' + id)
    },

    users: {
        getAll: () => apiGet('/api/users'),
        create: (username, password, displayName, role, secretCode) => apiPost('/api/users', { username, password, displayName, role, secretCode }),
        update: (id, data) => apiPut('/api/users/' + id, data),
        delete: (id) => apiDelete('/api/users/' + id)
    },

    reports: {
        driverByRange: (driverId, dateFrom, dateTo) =>
            apiGet(`/api/reports/driver?driverId=${driverId}&dateFrom=${dateFrom}&dateTo=${dateTo || dateFrom}`),
        companyByRange: (dateFrom, dateTo) =>
            apiGet(`/api/reports/company?dateFrom=${dateFrom}&dateTo=${dateTo || dateFrom}`),
        dailySummary: (dateFrom, dateTo, driverIds) => {
            const q = new URLSearchParams({ dateFrom, dateTo: dateTo || dateFrom });
            if (driverIds && driverIds.length) q.set('driverIds', driverIds.join(','));
            return apiGet('/api/reports/daily-summary?' + q);
        },

        driverReportPDF: async (report) => {
            const blob = await apiPostBlob('/api/reports/driver-pdf', report);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `تقرير-سائق-${report.driver?.DriverName || 'driver'}-${report.date || 'report'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            return null;
        },
        dailySummaryReportPDF: async (report) => {
            const blob = await apiPostBlob('/api/reports/daily-summary-pdf', report);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `تقرير-يومي-ملخص-${report.dateFrom || ''}-${report.dateTo || ''}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            return null;
        },
        companyReportPDF: async (report) => {
            const blob = await apiPostBlob('/api/reports/company-pdf', report);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `تقرير-يومي-${report.date || 'report'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            return null;
        },
        savePDF: async ({ base64, defaultName }) => {
            return { saved: true, path: defaultName };
        }
    }
};
