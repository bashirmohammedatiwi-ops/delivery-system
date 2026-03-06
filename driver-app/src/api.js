/**
 * API service لتطبيق السائق
 */
import { API_BASE_URL } from './config';

async function parseResponse(res) {
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    return {};
  }
  if (text.trim().startsWith('<')) {
    throw new Error('الخادم أعاد صفحة HTML بدلاً من JSON. تأكد أن الخادم محدّث ويعمل: node server.js');
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('رد غير صالح من الخادم. تحقق من اتصالك.');
  }
}

export async function driverLogin(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/driver-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
  return data;
}

export async function driverLogout(token) {
  await fetch(`${API_BASE_URL}/api/auth/driver-logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getDriverProfile(token) {
  const res = await fetch(`${API_BASE_URL}/api/driver/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error('غير مصرح');
  return data;
}

export async function getDriverOrders(token) {
  const res = await fetch(`${API_BASE_URL}/api/driver/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error('فشل تحميل الطلبات');
  return data;
}

export async function markOrderDelivered(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/api/driver/orders/${orderId}/deliver`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تأكيد التوصيل');
  return data;
}

export async function markOrderReturned(token, orderId, returnReason = '') {
  const res = await fetch(`${API_BASE_URL}/api/driver/orders/${orderId}/return`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ returnReason: returnReason.trim() || '' }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل إرجاع الطلب');
  return data;
}

export async function getDriverStats(token, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE_URL}/api/driver/stats?date=${encodeURIComponent(d)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل الإحصائيات');
  return data;
}

export async function getDriverDeliveredOrders(token, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE_URL}/api/driver/delivered-orders?date=${encodeURIComponent(d)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل الطلبات');
  return Array.isArray(data) ? data : [];
}

export async function getDriverReturnedOrders(token, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const res = await fetch(`${API_BASE_URL}/api/driver/returned-orders?date=${encodeURIComponent(d)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل الطلبات');
  return Array.isArray(data) ? data : [];
}

export async function getPendingOrdersByArea(token, dateFrom, dateTo) {
  const from = dateFrom || new Date().toISOString().slice(0, 10);
  const to = dateTo || from;
  const res = await fetch(
    `${API_BASE_URL}/api/driver/pending-orders?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل تحميل الطلبات المنتظرة');
  return Array.isArray(data) ? data : [];
}

export async function receiveOrder(token, shipmentNumber) {
  const num = String(shipmentNumber || '').replace(/\D/g, '').trim() || String(shipmentNumber || '').trim();
  if (!num) throw new Error('أدخل رقم الشحنة');
  const res = await fetch(`${API_BASE_URL}/api/driver/receive-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ shipmentNumber: num }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل استلام الطلب');
  return data;
}
