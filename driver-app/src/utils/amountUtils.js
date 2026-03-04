/**
 * معادلة المبلغ المستحق من تطبيق الويب (app.js)
 * التوصيل مجاني: المستحق = الفاتورة - أجرة التوصيل المعفاة
 * غير مجاني: المستحق = مبلغ الفاتورة (AmountIQD)
 */
function getAmountDue(order) {
  const amountIQD = Number(order.AmountIQD ?? order.amountiqd) || 0;
  const waivedIQD = Number(order.WaivedDeliveryIQD ?? order.waiveddeliveryiqd) || 0;
  const freeDelivery = !!(order.FreeDelivery === 1 || order.FreeDelivery === '1' || order.FreeDelivery === true);
  if (freeDelivery) return Math.max(0, amountIQD - waivedIQD);
  return amountIQD;
}

/**
 * حساب إجمالي المبلغ المستحق - من الطلبات الموصّلة فقط (مطابق لتطبيق الويب)
 * الطلبات المرتجعة لا تدخل في الحساب
 */
export function calcTotalAmountDue(deliveredOrders) {
  const delivered = Array.isArray(deliveredOrders) ? deliveredOrders : [];
  let total = 0;
  for (const o of delivered) {
    total += getAmountDue(o);
  }
  return Math.max(0, Math.round(total * 100) / 100);
}
