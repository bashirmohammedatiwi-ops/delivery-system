/**
 * تواريخ بتوقيت العراق (Asia/Baghdad, UTC+3)
 * يُفترض أن process.env.TZ = 'Asia/Baghdad' مضبوط عند بدء السيرفر
 */

function getIraqDateStr(d) {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getIraqDateTimeStr(d) {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    const s = String(dt.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

module.exports = { getIraqDateStr, getIraqDateTimeStr };
