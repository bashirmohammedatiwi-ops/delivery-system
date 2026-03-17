/**
 * تاريخ اليوم بتوقيت العراق حسب وقت بداية اليوم (من الإعدادات)
 * dayStartHour: 0 = منتصف الليل، 12 = الظهر، إلخ
 */
function getTodayInIraq(dayStartHour = 0) {
    const now = new Date();
    const iraqHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Baghdad', hour: 'numeric', hour12: false }), 10);
    const iraqDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
    if (iraqHour < dayStartHour) {
        const d = new Date(iraqDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }
    return iraqDate;
}

module.exports = { getTodayInIraq };
