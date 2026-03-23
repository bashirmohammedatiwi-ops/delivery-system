const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/** طابعة أحادية اللون: أسود على أبيض فقط */
const K = '#000000';
const W = '#ffffff';

function rev(str) {
    if (!str || typeof str !== 'string') return str;
    return str.split(/\s+/).reverse().join(' ');
}

function wrapRTL(doc, text, width) {
    const s = String(text || '').trim() || '-';
    const tokens = s.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [s];
    const lines = [];
    let current = [];
    let currentW = 0;
    const spaceW = doc.widthOfString(' ') || 2;
    for (const tok of tokens) {
        const w = doc.widthOfString(tok);
        if (current.length && currentW + spaceW + w > width) {
            lines.push(current.join(' '));
            current = [tok];
            currentW = w;
        } else {
            current.push(tok);
            currentW += (current.length > 1 ? spaceW : 0) + w;
        }
    }
    if (current.length) lines.push(current.join(' '));
    return lines;
}

/** نص عربي مع تفاف ومحاذاة يمين/وسط مناسبة لـ PDFKit */
function textRTL(doc, str, x, y, options) {
    const width = options?.width ?? Infinity;
    const align = options?.align ?? 'right';
    const lineGap = options?.lineGap ?? 0.5;
    const fill = options?.fill ?? K;
    const lineH = doc.currentLineHeight();
    const raw = String(str || '-').trim() || '-';
    const lines = width < Infinity ? wrapRTL(doc, raw, width) : [raw];
    let dy = 0;
    lines.forEach((line) => {
        const displayLine = rev(line);
        const lw = doc.widthOfString(displayLine) || 0;
        let xx = x;
        if (align === 'right') xx = x + width - lw;
        else if (align === 'center') xx = x + (width - lw) / 2;
        doc.fillColor(fill).text(displayLine, xx, y + dy, { align: 'left' });
        dy += lineH + lineGap;
    });
    return dy;
}

function rtlBlockHeight(doc, str, width, fontSize) {
    doc.fontSize(fontSize);
    const lines = wrapRTL(doc, String(str || '-').trim() || '-', width);
    const lineH = doc.currentLineHeight();
    return Math.max(lineH, lines.length * lineH + Math.max(0, lines.length - 1) * 0.5);
}

function getArabicFont(doc) {
    const projectFont = path.join(__dirname, '..', 'fonts', 'Amiri-Regular.ttf');
    const projectFontBold = path.join(__dirname, '..', 'fonts', 'Amiri-Bold.ttf');
    if (fs.existsSync(projectFont)) {
        doc.registerFont('Arabic', projectFont);
        if (fs.existsSync(projectFontBold)) {
            doc.registerFont('ArabicBold', projectFontBold);
            return { regular: 'Arabic', bold: 'ArabicBold' };
        }
        return { regular: 'Arabic', bold: 'Arabic' };
    }
    const linuxFonts = [
        ['/usr/share/fonts/truetype/amiri/Amiri-Bold.ttf', 'ArabicBold'],
        ['/usr/share/fonts/truetype/amiri/Amiri-Regular.ttf', 'Arabic'],
        ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Arabic'],
        ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 'Arabic']
    ];
    for (const [fontPath, fontName] of linuxFonts) {
        if (fs.existsSync(fontPath)) {
            doc.registerFont(fontName, fontPath);
            return { regular: fontName, bold: fontName };
        }
    }
    const sysRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    const winFonts = ['tahoma.ttf', 'arial.ttf', 'segoeui.ttf'];
    for (const f of winFonts) {
        const fp = path.join(sysRoot, 'Fonts', f);
        if (fs.existsSync(fp)) {
            doc.registerFont('Arabic', fp);
            return { regular: 'Arabic', bold: 'Arabic' };
        }
    }
    return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function generateBarcodeBase64(shipmentNumber) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer(
            {
                bcid: 'code128',
                text: String(shipmentNumber || ''),
                scale: 17,
                height: 22,
                includetext: true,
                textxalign: 'center',
                textsize: 13
            },
            (err, png) => {
                if (err) reject(err);
                else resolve(png.toString('base64'));
            }
        );
    });
}

async function generateQRBase64(shipmentNumber) {
    return QRCode.toDataURL(String(shipmentNumber || ''), {
        width: 240,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
    });
}

function formatIQD(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

/** أبعاد PNG من ترويسة IHDR */
function pngIhdrDimensions(buf) {
    if (!buf || buf.length < 24 || buf[0] !== 0x89) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** تنظيف رقم الطلب الإداري من رموز مثل * ، الفاصلة */
function cleanAdminOrderNo(v) {
    if (v == null || v === '') return '—';
    let s = String(v).trim();
    s = s.replace(/^[\s*#:،]+/, '').replace(/[\s,،;.]+$/g, '').trim();
    const onlyDigits = s.replace(/[^\d]/g, '');
    if (onlyDigits.length > 0 && /^[\s*#،,.\d]+$/.test(String(v).trim())) return onlyDigits;
    return s || '—';
}

function formatLabelDateTime(d) {
    const raw = (d || '').replace('T', ' ').trim();
    if (!raw) return '—';
    const date = raw.slice(0, 10);
    const time = raw.slice(11, 16);
    if (date.length === 10 && time.length >= 4) return `${date}    ${time}`;
    return raw.slice(0, 19);
}

function isPhoneLike(s) {
    const t = String(s ?? '').trim();
    if (!t || t === '—') return false;
    return /^[\d+\s\-٠-٩۰-۹]+$/.test(t) && /\d/.test(t);
}

function hLine(doc, x1, x2, y, lineWidth = 0.85, dashed = false) {
    doc.save();
    doc.strokeColor(K).lineWidth(lineWidth);
    if (dashed) doc.dash(4, { space: 3 });
    doc.moveTo(x1, y).lineTo(x2, y).stroke();
    if (dashed) doc.undash();
    doc.restore();
}

/**
 * ملصق أبيض/أسود — باركود بارز (الرقم يظهر تحت الأشرطة فقط)، باقي الحقول منظّمة
 */
async function createLabelPDF(order) {
    const w = 420;
    const h = 420;
    const doc = new PDFDocument({ size: [w, h], margin: 0 });
    const chunks = [];
    doc.on('data', chunks.push.bind(chunks));
    const pdfPromise = new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const fonts = getArabicFont(doc);
    const setAr = () => {
        doc.font(fonts.regular).fillColor(K);
    };
    const setArBold = () => {
        doc.font(fonts.bold).fillColor(K);
    };

    const M = 7;
    const cw = w - M * 2;
    let y = M;

    const fullAddr = [order.RegionName, order.Address].filter(Boolean).join(' — ') || order.Address || '-';
    const notesRaw = order.Notes != null ? String(order.Notes).trim() : '';
    const hasNotesContent = !!notesRaw;

    const footH = 42;
    const fy = h - M - footH;

    const innerL = M + 4;
    const innerW = cw - 8;

    doc.lineWidth(1.2).strokeColor(K);
    doc.rect(M, M, cw, h - M * 2).stroke();

    /* رأس مضغوط ثم باركود مباشرة (بدون تكرار رقم الشحنة كبيراً في الأعلى) */
    const headerH = 38;
    hLine(doc, innerL, innerL + innerW, y + 2, 1, false);
    setArBold();
    doc.fontSize(17);
    textRTL(doc, 'شركة ديما الحياة', innerL + 6, y + 7, { width: innerW - 12, align: 'center', fill: K });
    setAr();
    doc.fontSize(10.5);
    textRTL(doc, 'ملصق توصيل', innerL + 6, y + 24, { width: innerW - 12, align: 'center', fill: K });
    y += headerH;
    hLine(doc, innerL, innerL + innerW, y, 0.9, false);
    y += 8;

    const row2H = 36;
    const gapMid = 6;
    const half = (innerW - gapMid) / 2;
    const labCol = 72;
    let moneyH = 52;
    /** بعد فاصل الأزواج: خط رفيع + فراغ قبل مربع العنوان (بدون عنوان «عنوان التسليم») */
    const addrBlockH = 8;

    setAr();
    doc.fontSize(11);
    const addrW = innerW - 16;
    const addrFont = 15;
    setArBold();
    let addrH = rtlBlockHeight(doc, fullAddr, addrW, addrFont) + 14;
    addrH = Math.min(Math.max(addrH, 32), 100);
    setAr();
    let notesH = rtlBlockHeight(doc, hasNotesContent ? notesRaw : '—', addrW, 11.5) + 12;
    notesH = Math.min(Math.max(notesH, 22), 72);

    const yBarcodeTop = y;
    const barRowMax = 122;
    let barRowH = Math.min(102, barRowMax);

    /** y بعد خطّي الباركود وقبل y+=5 الذي يسبق صف الأزواج */
    function yBeforePairRows(barH) {
        return yBarcodeTop + barH + 6;
    }

    function measureContentBottom(barH) {
        let b = yBeforePairRows(barH) + 5 + 2 * (3 + row2H);
        b += 7;
        b += addrBlockH;
        b += addrH + 6;
        b += moneyH + 4;
        b += 14 + 4 + notesH + 8;
        return b;
    }

    while (measureContentBottom(barRowH) > fy && barRowH > 56) barRowH -= 2;
    while (measureContentBottom(barRowH) > fy && moneyH > 44) moneyH -= 2;
    while (measureContentBottom(barRowH) > fy && addrH > 22) addrH -= 4;
    while (measureContentBottom(barRowH) > fy && notesH > 16) notesH -= 3;

    while (barRowH < barRowMax && measureContentBottom(barRowH + 2) <= fy) barRowH += 2;

    let slack = fy - measureContentBottom(barRowH);
    if (slack > 0) addrH = Math.min(addrH + slack, 110);

    /* باركود: يملأ المنطقة قدر الإمكان — الرقم مطبوع تحت الأشرطة */
    y = yBarcodeTop;
    const bx = innerL;
    const barW = innerW;
    doc.rect(bx, y, barW, barRowH).fill(W).strokeColor(K).lineWidth(0.9).stroke();
    const barcodeBuf = Buffer.from(await generateBarcodeBase64(order.ShipmentNumber), 'base64');
    const padY = 4;
    const maxH = barRowH - padY * 2;
    /** عرض الباركود ≈ ٣/٤ عرض الملصق الداخلي، متمركز */
    const targetBarW = innerW * 0.75;
    const dim = pngIhdrDimensions(barcodeBuf);
    let dw = targetBarW;
    let dh = maxH;
    if (dim && dim.width > 0 && dim.height > 0) {
        dh = dim.height * (targetBarW / dim.width);
        if (dh > maxH) {
            const r = maxH / dh;
            dh = maxH;
            dw = targetBarW * r;
        }
    }
    const ix = innerL + (innerW - dw) / 2;
    const iy = y + padY + (maxH - dh) / 2;
    doc.image(barcodeBuf, ix, iy, { width: dw, height: dh });
    y += barRowH;
    hLine(doc, innerL, innerL + innerW, y + 3, 0.55, true);
    y += 5;
    hLine(doc, innerL, innerL + innerW, y, 0.85, false);

    y += 6;

    function pairRow(labelR, valR, labelL, valL) {
        const xR = innerL;
        const xL = xR + half + gapMid;
        const vWR = half - labCol - 4;
        const vWL = half - labCol - 4;
        hLine(doc, innerL, innerL + innerW, y, 0.45, true);
        y += 3;
        doc.rect(xR, y, half, row2H).fill(W).strokeColor(K).lineWidth(0.5).stroke();
        doc.rect(xL, y, half, row2H).fill(W).strokeColor(K).lineWidth(0.5).stroke();
        doc.moveTo(xR + half, y).lineTo(xR + half, y + row2H).lineWidth(0.45).strokeColor(K).stroke();
        setArBold();
        doc.fontSize(10);
        textRTL(doc, labelR + ':', xR + vWR + 4, y + 11, { width: labCol - 2, align: 'right', fill: K });
        textRTL(doc, labelL + ':', xL + vWL + 4, y + 11, { width: labCol - 2, align: 'right', fill: K });
        const drawVal = (val, x, vw) => {
            const t = String(val ?? '—');
            if (isPhoneLike(t)) {
                doc.font('Helvetica-Bold').fontSize(16).fillColor(K);
                doc.text(t, x, y + 8, { width: vw, align: 'right' });
            } else {
                setAr();
                doc.fontSize(12.5);
                textRTL(doc, t, x, y + 9, { width: vw, align: 'right', fill: K });
            }
        };
        drawVal(valR, xR + 4, vWR - 2);
        drawVal(valL, xL + 4, vWL - 2);
        setAr();
        y += row2H;
    }

    pairRow('المتجر', order.StoreName || '—', 'هاتف المتجر', order.StorePhone || '—');
    pairRow('المستلم', order.CustomerName || '—', 'هاتف المستلم', order.CustomerPhone || '—');
    hLine(doc, innerL, innerL + innerW, y + 1, 0.4, true);
    y += 7;

    hLine(doc, innerL, innerL + innerW, y, 0.4, false);
    y += 8;

    doc.rect(innerL, y, innerW, addrH).fill(W).strokeColor(K).lineWidth(0.6).stroke();
    setArBold();
    doc.fillColor(K).fontSize(addrFont);
    textRTL(doc, fullAddr, innerL + 8, y + 8, { width: addrW, align: 'right', fill: K });
    y += addrH + 6;

    /* المبالغ — الخط الكامل تحت الأرقام وليس فوقها */
    const inv = formatIQD(order.AmountIQD) + ' د.ع';
    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const delTxt = order.FreeDelivery ? 'توصيل مجاني' : formatIQD(driverDelivery) + ' د.ع';
    const totalTxt = formatIQD(order.TotalIQD) + ' د.ع';
    const colGap = 5;
    const third = (innerW - colGap * 2) / 3;
    const mx = innerL;
    const xFinal = mx;
    const xDel = mx + third + colGap;
    const xInv = mx + 2 * (third + colGap);
    doc.rect(xFinal, y, third, moneyH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    doc.rect(xDel, y, third, moneyH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    doc.rect(xInv, y, third, moneyH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    doc.moveTo(xFinal + third, y).lineTo(xFinal + third, y + moneyH).lineWidth(0.5).strokeColor(K).stroke();
    doc.moveTo(xDel + third, y).lineTo(xDel + third, y + moneyH).lineWidth(0.5).strokeColor(K).stroke();
    setArBold();
    doc.fontSize(10);
    textRTL(doc, 'المبلغ النهائي', xFinal + 4, y + 4, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, 'أجرة التوصيل', xDel + 4, y + 4, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, 'مبلغ الفاتورة', xInv + 4, y + 4, { width: third - 8, align: 'center', fill: K });
    setArBold();
    doc.fontSize(17);
    textRTL(doc, totalTxt, xFinal + 4, y + 20, { width: third - 8, align: 'center', fill: K });
    setArBold();
    doc.fontSize(15);
    textRTL(doc, delTxt, xDel + 4, y + 22, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, inv, xInv + 4, y + 22, { width: third - 8, align: 'center', fill: K });
    setAr();
    y += moneyH;
    hLine(doc, innerL, innerL + innerW, y, 0.95, false);
    y += 4;

    setArBold();
    doc.fontSize(11.5);
    textRTL(doc, 'ملاحظات', innerL + 8, y + 2, { width: innerW - 16, align: 'right', fill: K });
    y += 14;
    hLine(doc, innerL + 24, innerL + innerW - 24, y, 0.6, true);
    y += 4;
    doc.rect(innerL, y, innerW, notesH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    setAr();
    doc.fillColor(K).fontSize(11.5);
    if (hasNotesContent) {
        textRTL(doc, notesRaw, innerL + 8, y + 6, { width: addrW, align: 'right', fill: K });
    } else {
        setArBold();
        doc.fontSize(13);
        textRTL(doc, '—', innerL + 8, y + 8, { width: addrW, align: 'center', fill: K });
    }
    y += notesH + 4;
    hLine(doc, innerL, innerL + innerW, y, 0.9, false);
    y += 4;

    hLine(doc, innerL, innerL + innerW, fy - 2, 1.2, false);
    doc.rect(innerL, fy, innerW, footH).fill(W).strokeColor(K).lineWidth(0.9).stroke();
    const xSep1 = mx + third + colGap;
    const xSep2 = mx + 2 * third + 2 * colGap;
    doc.moveTo(xSep1, fy).lineTo(xSep1, fy + footH).lineWidth(0.5).strokeColor(K).stroke();
    doc.moveTo(xSep2, fy).lineTo(xSep2, fy + footH).lineWidth(0.5).strokeColor(K).stroke();

    const dateStr = formatLabelDateTime(order.CreatedDate || new Date().toISOString());
    const c1 = mx + 4;
    const c2 = xSep1 + 4;
    const c3 = xSep2 + 4;
    const tw = third - 8;

    setArBold();
    doc.fontSize(9.5);
    textRTL(doc, 'عدد القطع', c1, fy + 6, { width: tw, align: 'center', fill: K });
    textRTL(doc, 'تاريخ الإنشاء', c2, fy + 6, { width: tw, align: 'center', fill: K });
    textRTL(doc, 'رقم الطلب الإداري', c3, fy + 6, { width: tw, align: 'center', fill: K });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(K);
    doc.text(String(order.Pieces || 1), c1, fy + 24, { width: tw, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(K);
    doc.text(dateStr, c2, fy + 22, { width: tw, align: 'center' });
    const adminClean = cleanAdminOrderNo(order.AdminOrderNo);
    doc.font('Helvetica-Bold').fontSize(20).fillColor(K);
    doc.text(adminClean, c3, fy + 22, { width: tw, align: 'center' });

    doc.end();
    return pdfPromise;
}

module.exports = {
    generateBarcodeBase64,
    generateQRBase64,
    createLabelPDF,
    formatIQD
};
