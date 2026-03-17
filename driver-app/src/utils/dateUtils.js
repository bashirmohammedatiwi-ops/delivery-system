/**
 * تواريخ محلية — تجنب مشكلة UTC (في العراق UTC+3)
 * استخدام getLocalDateStr بدلاً من toISOString().slice(0,10)
 */

export function getLocalDateStr(d) {
  const dt = d || new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return getLocalDateStr(d);
}
