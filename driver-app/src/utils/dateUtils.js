/**
 * تواريخ بتوقيت العراق (Asia/Baghdad)
 * استخدام getLocalDateStr بدلاً من toISOString().slice(0,10)
 */

const IRAQ_TZ = 'Asia/Baghdad';

export function getLocalDateStr(d) {
  const dt = d || new Date();
  return dt.toLocaleDateString('en-CA', { timeZone: IRAQ_TZ });
}

export function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T12:00:00+03:00');
  d.setDate(d.getDate() + delta);
  return getLocalDateStr(d);
}
