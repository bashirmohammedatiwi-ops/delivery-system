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

export async function markOrderReturned(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/api/driver/orders/${orderId}/return`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'فشل إرجاع الطلب');
  return data;
}
