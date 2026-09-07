import { isDeferredOrder } from './format';

export function searchOrders(orders, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return orders;
  return orders.filter((o) => {
    const haystack = [
      o.ShipmentNumber,
      o.CustomerName,
      o.Address,
      o.RegionName,
      o.StoreName,
      o.CustomerPhone,
      o.AdminOrderNo,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q) || String(o.ShipmentNumber).includes(q);
  });
}

export function sortOrders(orders, sortKey) {
  const list = [...orders];
  switch (sortKey) {
    case 'amount_desc':
      return list.sort((a, b) => (Number(b.TotalIQD) || 0) - (Number(a.TotalIQD) || 0));
    case 'amount_asc':
      return list.sort((a, b) => (Number(a.TotalIQD) || 0) - (Number(b.TotalIQD) || 0));
    case 'deferred_first':
      return list.sort((a, b) => {
        const da = isDeferredOrder(a) ? 1 : 0;
        const db = isDeferredOrder(b) ? 1 : 0;
        return db - da;
      });
    case 'shipment':
      return list.sort((a, b) =>
        String(a.ShipmentNumber || '').localeCompare(String(b.ShipmentNumber || ''), 'ar')
      );
    default:
      return list;
  }
}

export function filterByRegion(orders, region) {
  if (!region || region === 'all') return orders;
  return orders.filter((o) => (o.RegionName || '') === region);
}

export function getUniqueRegions(orders) {
  const set = new Set();
  for (const o of orders || []) {
    if (o.RegionName) set.add(o.RegionName);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
}

export function calcOrdersTotalIQD(orders) {
  return (orders || []).reduce((sum, o) => sum + (Number(o.TotalIQD) || 0), 0);
}

export function calcOrdersAmountDue(orders) {
  return (orders || []).reduce((sum, o) => {
    const total = Number(o.TotalIQD) || 0;
    const free = !!(o.FreeDelivery === 1 || o.FreeDelivery === '1' || o.FreeDelivery === true);
    const delivery = free
      ? Number(o.WaivedDeliveryIQD) || 0
      : Number(o.DeliveryFeeIQD) || 0;
    return sum + (total - delivery);
  }, 0);
}

export function buildOrderShareText(order) {
  if (!order) return '';
  const lines = [
    `📦 طلب #${order.ShipmentNumber}`,
    `👤 ${order.CustomerName || '—'}`,
    `📞 ${order.CustomerPhone || '—'}`,
    `📍 ${order.Address || '—'}`,
    order.RegionName ? `🗺 ${order.RegionName}` : null,
    `💰 ${order.TotalIQD || 0} د.ع`,
  ].filter(Boolean);
  return lines.join('\n');
}

export const SORT_OPTIONS = [
  { key: 'default', label: 'الافتراضي' },
  { key: 'deferred_first', label: 'المؤجلة أولاً' },
  { key: 'amount_desc', label: 'الأعلى مبلغاً' },
  { key: 'amount_asc', label: 'الأقل مبلغاً' },
  { key: 'shipment', label: 'رقم الشحنة' },
];
