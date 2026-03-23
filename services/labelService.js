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
                scale: 5,
                height: 22,
                includetext: true,
                textxalign: 'center',
                textsize: 11
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

/**
 * ملصق أبيض/أسود — مناسب للطابعات الحرارية
 * 420×480 نقطة، عربي (أميري) + أرقام واضحة
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

    const footH = 48;
    const fy = h - M - footH;

    /* إطار مزدوج */
    doc.lineWidth(1.5).strokeColor(K);
    doc.rect(M, M, cw, h - M * 2).stroke();
    doc.lineWidth(0.6);
    doc.rect(M + 2, M + 2, cw - 4, h - M * 2 - 4).stroke();

    /* شريط علوي: أسود + نص أبيض */
    const headerH = 34;
    doc.rect(M + 3, y + 3, cw - 6, headerH).fill(K);
    setArBold();
    doc.fontSize(14);
    textRTL(doc, 'شركة ديما الحياة', M + 10, y + 8, { width: cw - 20, align: 'center', fill: W });
    setAr();
    doc.fontSize(8);
    textRTL(doc, 'ملصق توصيل', M + 10, y + 22, { width: cw - 20, align: 'center', fill: W });
    y += headerH + 8;

    /* رقم الشحنة */
    const heroH = 40;
    doc.rect(M + 3, y, cw - 6, heroH).fill(W).strokeColor(K).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fillColor(K).fontSize(22);
    doc.text(String(order.ShipmentNumber || '—'), M + 6, y + 10, { width: cw - 12, align: 'center' });
    y += heroH + 6;

    /* صف الباركود (عريض) + QR */
    const qrBox = 68;
    const gapQ = 6;
    const barW = cw - 6 - qrBox - gapQ;
    const codeRowH = 88;
    const bx = M + 3;
    doc.rect(bx, y, barW, codeRowH).fill(W).strokeColor(K).lineWidth(0.8).stroke();
    doc.rect(bx + barW + gapQ, y, qrBox, codeRowH).fill(W).strokeColor(K).lineWidth(0.8).stroke();

    const barcodePng = await generateBarcodeBase64(order.ShipmentNumber);
    doc.image(Buffer.from(barcodePng, 'base64'), bx + 4, y + 4, { fit: [barW - 8, codeRowH - 8] });

    const qrData = await generateQRBase64(order.ShipmentNumber);
    const qrDraw = Math.min(qrBox - 10, codeRowH - 10);
    doc.image(qrData, bx + barW + gapQ + (qrBox - qrDraw) / 2, y + (codeRowH - qrDraw) / 2, { width: qrDraw });
    y += codeRowH + 6;

    const row2H = 26;
    const gapMid = 5;
    const half = (cw - 6 - gapMid) / 2;
    const labCol = 56;
    const moneyH = 34;
    const addrTitleH = 15;

    setAr();
    doc.fontSize(9);

    const addrW = cw - 20;
    const addrFont = 10;
    let addrH = rtlBlockHeight(doc, fullAddr, addrW, addrFont) + 12;
    addrH = Math.min(Math.max(addrH, 30), 100);

    let notesH = 0;
    let showNotes = !!hasNotes;
    if (showNotes) {
        notesH = rtlBlockHeight(doc, notesText, addrW, 9) + 10;
        notesH = Math.min(Math.max(notesH, 22), 70);
    }

    function estBottom() {
        let b = y + row2H * 2 + addrTitleH + addrH + moneyH + 5;
        if (showNotes && notesH > 0) b += 12 + notesH + 5;
        return b;
    }
    while (estBottom() > fy && addrH > 28) addrH -= 6;
    while (estBottom() > fy && showNotes && notesH > 18) notesH -= 5;
    if (estBottom() > fy) showNotes = false;

    /* توزيع المسافة الرأسية الفائضة على منطقة العنوان */
    let slack = fy - estBottom();
    if (slack > 0) addrH = Math.min(addrH + slack, 120);

    function pairRow(labelR, valR, labelL, valL) {
        const xR = M + 3;
        const xL = xR + half + gapMid;
        const vWR = half - labCol - 4;
        const vWL = half - labCol - 4;
        doc.rect(xR, y, half, row2H).fill(W).strokeColor(K).lineWidth(0.45).stroke();
        doc.rect(xL, y, half, row2H).fill(W).strokeColor(K).lineWidth(0.45).stroke();
        setArBold();
        doc.fontSize(7.5);
        textRTL(doc, labelR + ':', xR + vWR + 4, y + 8, { width: labCol - 2, align: 'right' });
        textRTL(doc, labelL + ':', xL + vWL + 4, y + 8, { width: labCol - 2, align: 'right' });
        setAr();
        doc.fontSize(10);
        textRTL(doc, String(valR ?? '—'), xR + 4, y + 7, { width: vWR - 2, align: 'right' });
        textRTL(doc, String(valL ?? '—'), xL + 4, y + 7, { width: vWL - 2, align: 'right' });
        y += row2H;
    }

    pairRow('المتجر', order.StoreName || '—', 'هاتف المتجر', order.StorePhone || '—');
    pairRow('المستلم', order.CustomerName || '—', 'هاتف المستلم', order.CustomerPhone || '—');

    /* عنوان التسليم — شريط مميز أحادي اللون */
    doc.rect(M + 3, y, cw - 6, addrTitleH).fill(K);
    setArBold();
    doc.fontSize(9);
    textRTL(doc, 'عنوان التسليم', M + 8, y + 3, { width: cw - 16, align: 'right', fill: W });
    y += addrTitleH;

    doc.rect(M + 3, y, cw - 6, addrH).fill(W).strokeColor(K).lineWidth(0.6).stroke();
    setAr();
    doc.fillColor(K).fontSize(addrFont);
    textRTL(doc, fullAddr, M + 10, y + 6, { width: addrW, align: 'right' });
    y += addrH + 5;

    /* المبالغ — ثلاث خانات متساوية بعرض الملصق */
    const inv = formatIQD(order.AmountIQD) + ' د.ع';
    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const delTxt = order.FreeDelivery ? 'توصيل مجاني' : formatIQD(driverDelivery) + ' د.ع';
    const totalTxt = formatIQD(order.TotalIQD) + ' د.ع';
    const colGap = 4;
    const third = (cw - 6 - colGap * 2) / 3;
    const mx = M + 3;
    for (let i = 0; i < 3; i++) {
        const x0 = mx + i * (third + colGap);
        doc.rect(x0, y, third, moneyH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
    }
    setArBold();
    doc.fontSize(7);
    textRTL(doc, 'مبلغ الفاتورة', mx + 4, y + 4, { width: third - 8, align: 'center' });
    textRTL(doc, 'أجرة التوصيل', mx + third + colGap + 4, y + 4, { width: third - 8, align: 'center' });
    textRTL(doc, 'المبلغ النهائي', mx + (third + colGap) * 2 + 4, y + 4, { width: third - 8, align: 'center' });
    setAr();
    doc.fontSize(10);
    textRTL(doc, inv, mx + 4, y + 16, { width: third - 8, align: 'center' });
    textRTL(doc, delTxt, mx + third + colGap + 4, y + 16, { width: third - 8, align: 'center' });
    setArBold();
    doc.fontSize(11);
    textRTL(doc, totalTxt, mx + (third + colGap) * 2 + 4, y + 14, { width: third - 8, align: 'center' });
    setAr();
    y += moneyH + 5;

    if (showNotes && notesH > 0) {
        doc.rect(M + 3, y, cw - 6, 12).fill(K);
        setArBold();
        doc.fontSize(8);
        textRTL(doc, 'ملاحظات', M + 8, y + 2, { width: cw - 16, align: 'right', fill: W });
        y += 12;
        doc.rect(M + 3, y, cw - 6, notesH).fill(W).strokeColor(K).lineWidth(0.55).stroke();
        setAr();
        doc.fillColor(K).fontSize(9);
        textRTL(doc, notesText, M + 10, y + 5, { width: addrW, align: 'right' });
        y += notesH + 5;
    }

    /* تذييل — ثلاثة أعمدة على كامل العرض */
    doc.rect(M + 3, fy, cw - 6, footH).fill(W).strokeColor(K).lineWidth(1).stroke();
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
    doc.fillColor(K).fontSize(7);
    textRTL(doc, 'عدد القطع', c1, fy + 6, { width: tw, align: 'center' });
    textRTL(doc, 'تاريخ الإنشاء', c2, fy + 6, { width: tw, align: 'center' });
    textRTL(doc, 'رقم الطلب (إداري)', c3, fy + 6, { width: tw, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(K);
    doc.text(String(order.Pieces || 1), c1, fy + 22, { width: tw, align: 'center' });
    setAr();
    doc.fillColor(K).fontSize(9);
    textRTL(doc, dateStr, c2, fy + 20, { width: tw, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(K);
    doc.text(String(order.AdminOrderNo ?? '—'), c3, fy + 20, { width: tw, align: 'center' });

    doc.end();
    return pdfPromise;
}

module.exports = {
    generateBarcodeBase64,
    generateQRBase64,
    createLabelPDF,
    formatIQD
};
