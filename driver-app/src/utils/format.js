export function formatIQD(n) {
  return `${new Intl.NumberFormat('ar-IQ').format(n || 0)} د.ع`;
}

export function isDeferredOrder(order) {
  return !!(order?.IsDeferred || order?.isdeferred);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء النور';
}
