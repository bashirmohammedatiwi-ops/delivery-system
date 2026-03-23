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
                scale: 6,
                height: 26,
                includetext: true,
                textxalign: 'center',
                textsize: 12
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

function hLine(doc, x1, x2, y, lineWidth = 0.85, dashed = false) {
    doc.save();
    doc.strokeColor(K).lineWidth(lineWidth);
    if (dashed) doc.dash(4, { space: 3 });
    doc.moveTo(x1, y).lineTo(x2, y).stroke();
    if (dashed) doc.undash();
    doc.restore();
}

/**
 * ملصق أبيض/أسود — تنسيق واضح، خطوط فاصلة، باركود بعرض كامل
 */
async function createLabelPDF(order) {
    const w = 420;
    const h = 480;
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
    const hasNotes = order.Notes && String(order.Notes).trim();
    const notesText = hasNotes ? String(order.Notes).trim() : '';

    const footH = 54;
    const fy = h - M - footH;

    const innerL = M + 4;
    const innerW = cw - 8;

    doc.lineWidth(1.2).strokeColor(K);
    doc.rect(M, M, cw, h - M * 2).stroke();

    /* رأس: خلفية بيضاء + خطوط فاصلة (بدون تظليل أسود) */
    const headerH = 38;
    hLine(doc, innerL, innerL + innerW, y + 2, 1.2, false);
    setArBold();
    doc.fontSize(17);
    textRTL(doc, 'شركة ديما الحياة', innerL + 6, y + 8, { width: innerW - 12, align: 'center', fill: K });
    setAr();
    doc.fontSize(10);
    textRTL(doc, 'ملصق توصيل', innerL + 6, y + 26, { width: innerW - 12, align: 'center', fill: K });
    y += headerH;
    hLine(doc, innerL, innerL + innerW, y, 1, false);

    /* رقم الشحنة */
    const heroH = 46;
    y += 6;
    doc.font('Helvetica-Bold').fillColor(K).fontSize(26);
    doc.text(String(order.ShipmentNumber || '—'), innerL, y + 10, { width: innerW, align: 'center' });
    y += heroH;
    hLine(doc, innerL, innerL + innerW, y, 0.9, true);

    /* باركود بعرض الملصق بالكامل */
    const barRowH = 82;
    y += 5;
    const bx = innerL;
    const barW = innerW;
    doc.rect(bx, y, barW, barRowH).fill(W).strokeColor(K).lineWidth(0.7).stroke();
    const barcodePng = await generateBarcodeBase64(order.ShipmentNumber);
    doc.image(Buffer.from(barcodePng, 'base64'), bx + 5, y + 4, { fit: [barW - 10, barRowH - 8] });
    y += barRowH;
    hLine(doc, innerL, innerL + innerW, y + 3, 0.75, true);

    /* صف QR تحت الباركود — لا يضيق عرض الباركود */
    const qrRowH = 46;
    y += 8;
    const qrData = await generateQRBase64(order.ShipmentNumber);
    const qrDraw = 40;
    doc.image(qrData, innerL + (innerW - qrDraw) / 2, y + 3, { width: qrDraw });
    y += qrRowH;
    hLine(doc, innerL, innerL + innerW, y, 1, false);

    const row2H = 32;
    const gapMid = 6;
    const half = (innerW - gapMid) / 2;
    const labCol = 68;
    const moneyH = 42;
    const addrTitleH = 14;

    setAr();
    doc.fontSize(10);

    const addrW = innerW - 16;
    const addrFont = 12;
    let addrH = rtlBlockHeight(doc, fullAddr, addrW, addrFont) + 12;
    addrH = Math.min(Math.max(addrH, 30), 100);

    let notesH = 0;
    let showNotes = !!hasNotes;
    if (showNotes) {
        notesH = rtlBlockHeight(doc, notesText, addrW, 10.5) + 12;
        notesH = Math.min(Math.max(notesH, 24), 76);
    }

    function estBottom() {
        let b = y + 5;
        b += 2 * (3 + row2H);
        b += 2 + 5;
        b += addrTitleH + 2;
        b += addrH + 4 + 4;
        b += moneyH + 4 + 4;
        if (showNotes && notesH > 0) b += 14 + 4 + notesH + 4 + 4;
        return b;
    }
    while (estBottom() > fy && addrH > 28) addrH -= 6;
    while (estBottom() > fy && showNotes && notesH > 18) notesH -= 5;
    if (estBottom() > fy) showNotes = false;

    /* توزيع المسافة الرأسية الفائضة على منطقة العنوان */
    let slack = fy - estBottom();
    if (slack > 0) addrH = Math.min(addrH + slack, 120);

    y += 5;

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
        doc.fontSize(9);
        textRTL(doc, labelR + ':', xR + vWR + 4, y + 10, { width: labCol - 2, align: 'right', fill: K });
        textRTL(doc, labelL + ':', xL + vWL + 4, y + 10, { width: labCol - 2, align: 'right', fill: K });
        setAr();
        doc.fontSize(11.5);
        textRTL(doc, String(valR ?? '—'), xR + 4, y + 8, { width: vWR - 2, align: 'right', fill: K });
        textRTL(doc, String(valL ?? '—'), xL + 4, y + 8, { width: vWL - 2, align: 'right', fill: K });
        y += row2H;
    }

    pairRow('المتجر', order.StoreName || '—', 'هاتف المتجر', order.StorePhone || '—');
    pairRow('المستلم', order.CustomerName || '—', 'هاتف المستلم', order.CustomerPhone || '—');
    hLine(doc, innerL, innerL + innerW, y + 2, 0.45, true);
    y += 5;

    /* عنوان التسليم: خطوط + نص أسود (بدون مربع أسود) */
    setArBold();
    doc.fontSize(11);
    textRTL(doc, 'عنوان التسليم', innerL + 6, y + 2, { width: innerW - 12, align: 'right', fill: K });
    y += addrTitleH;
    hLine(doc, innerL + 20, innerL + innerW - 20, y, 0.9, false);

    doc.rect(innerL, y, innerW, addrH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    setAr();
    doc.fillColor(K).fontSize(addrFont);
    textRTL(doc, fullAddr, innerL + 8, y + 7, { width: addrW, align: 'right', fill: K });
    y += addrH + 4;
    hLine(doc, innerL, innerL + innerW, y, 1, false);
    y += 4;

    /* المبالغ — ثلاث خانات متساوية بعرض الملصق */
    const inv = formatIQD(order.AmountIQD) + ' د.ع';
    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const delTxt = order.FreeDelivery ? 'توصيل مجاني' : formatIQD(driverDelivery) + ' د.ع';
    const totalTxt = formatIQD(order.TotalIQD) + ' د.ع';
    const colGap = 5;
    const third = (innerW - colGap * 2) / 3;
    const mx = innerL;
    for (let i = 0; i < 3; i++) {
        const x0 = mx + i * (third + colGap);
        doc.rect(x0, y, third, moneyH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    }
    const vSep1 = mx + third;
    const vSep2 = mx + third + colGap + third;
    doc.moveTo(vSep1, y).lineTo(vSep1, y + moneyH).lineWidth(0.5).strokeColor(K).stroke();
    doc.moveTo(vSep2, y).lineTo(vSep2, y + moneyH).lineWidth(0.5).strokeColor(K).stroke();
    setArBold();
    doc.fontSize(9);
    textRTL(doc, 'مبلغ الفاتورة', mx + 4, y + 5, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, 'أجرة التوصيل', mx + third + colGap + 4, y + 5, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, 'المبلغ النهائي', mx + (third + colGap) * 2 + 4, y + 5, { width: third - 8, align: 'center', fill: K });
    setAr();
    doc.fontSize(11.5);
    textRTL(doc, inv, mx + 4, y + 20, { width: third - 8, align: 'center', fill: K });
    textRTL(doc, delTxt, mx + third + colGap + 4, y + 20, { width: third - 8, align: 'center', fill: K });
    setArBold();
    doc.fontSize(13);
    textRTL(doc, totalTxt, mx + (third + colGap) * 2 + 4, y + 18, { width: third - 8, align: 'center', fill: K });
    setAr();
    y += moneyH + 4;
    hLine(doc, innerL, innerL + innerW, y, 1, false);
    y += 4;

    if (showNotes && notesH > 0) {
        setArBold();
        doc.fontSize(10);
        textRTL(doc, 'ملاحظات', innerL + 8, y + 2, { width: innerW - 16, align: 'right', fill: K });
        y += 14;
        hLine(doc, innerL + 24, innerL + innerW - 24, y, 0.6, true);
        y += 4;
        doc.rect(innerL, y, innerW, notesH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
        setAr();
        doc.fillColor(K).fontSize(10.5);
        textRTL(doc, notesText, innerL + 8, y + 6, { width: addrW, align: 'right', fill: K });
        y += notesH + 4;
        hLine(doc, innerL, innerL + innerW, y, 0.9, false);
        y += 4;
    }

    hLine(doc, innerL, innerL + innerW, fy - 2, 1.2, false);
    doc.rect(innerL, fy, innerW, footH).fill(W).strokeColor(K).lineWidth(0.9).stroke();
    const xSep1 = mx + third + colGap;
    const xSep2 = mx + 2 * third + 2 * colGap;
    doc.moveTo(xSep1, fy).lineTo(xSep1, fy + footH).lineWidth(0.5).strokeColor(K).stroke();
    doc.moveTo(xSep2, fy).lineTo(xSep2, fy + footH).lineWidth(0.5).strokeColor(K).stroke();

    const dateStr = (order.CreatedDate || new Date().toISOString()).replace('T', ' ').slice(0, 16);
    const c1 = mx + 4;
    const c2 = xSep1 + 4;
    const c3 = xSep2 + 4;
    const tw = third - 8;

    setArBold();
    doc.fontSize(8.5);
    textRTL(doc, 'عدد القطع', c1, fy + 7, { width: tw, align: 'center', fill: K });
    textRTL(doc, 'تاريخ الإنشاء', c2, fy + 7, { width: tw, align: 'center', fill: K });
    textRTL(doc, 'رقم الطلب (إداري)', c3, fy + 7, { width: tw, align: 'center', fill: K });
    doc.font('Helvetica-Bold').fontSize(17).fillColor(K);
    doc.text(String(order.Pieces || 1), c1, fy + 24, { width: tw, align: 'center' });
    setAr();
    doc.fontSize(10.5);
    textRTL(doc, dateStr, c2, fy + 22, { width: tw, align: 'center', fill: K });
    doc.font('Helvetica-Bold').fontSize(18).fillColor(K);
    doc.text(String(order.AdminOrderNo ?? '—'), c3, fy + 22, { width: tw, align: 'center' });

    doc.end();
    return pdfPromise;
}

module.exports = {
    generateBarcodeBase64,
    generateQRBase64,
    createLabelPDF,
    formatIQD
};
