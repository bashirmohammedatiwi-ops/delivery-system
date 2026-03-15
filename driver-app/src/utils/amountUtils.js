/**
 * المبلغ المستحق = المبلغ النهائي - أجرة التوصيل
 * المبلغ المستحق الكلي = إجمالي المبلغ النهائي - إجمالي أجور التوصيل
 */
function getAmountDue(order) {
  const total = Number(order.TotalIQD ?? order.totaliqd) || 0;
  const freeDelivery = !!(order.FreeDelivery === 1 || order.FreeDelivery === '1' || order.FreeDelivery === true);
  const deliveryAmt = freeDelivery
    ? (Number(order.WaivedDeliveryIQD ?? order.waiveddeliveryiqd) || 0)
    : (Number(order.DeliveryFeeIQD ?? order.deliveryfeeiqd) || 0);
  return total - deliveryAmt;
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
  return Math.round(total * 100) / 100;
}
