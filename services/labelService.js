const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const COLORS = {
    brand: '#047857',
    brandDark: '#064e3b',
    paper: '#ffffff',
    muted: '#64748b',
    line: '#cbd5e1',
    lineSoft: '#e2e8f0',
    text: '#0f172a',
    textSoft: '#475569',
    heroBg: '#ecfdf5',
    stripe: '#f8fafc',
    stripeAlt: '#f1f5f9',
    totalBg: '#d1fae5',
    totalBorder: '#34d399',
    white: '#ffffff'
};

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

function textRTL(doc, str, x, y, options) {
    const width = options?.width ?? Infinity;
    const align = options?.align ?? 'right';
    const lineGap = options?.lineGap ?? 1;
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
        doc.text(displayLine, xx, y + dy, { align: 'left' });
        dy += lineH + lineGap;
    });
    return dy;
}

function rtlBlockHeight(doc, str, width, fontSize) {
    doc.fontSize(fontSize);
    const lines = wrapRTL(doc, String(str || '-').trim() || '-', width);
    const lineH = doc.currentLineHeight();
    return Math.max(lineH, lines.length * lineH + (lines.length - 1));
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
                scale: 2,
                height: 10,
                includetext: true,
                textxalign: 'center',
                textsize: 8
            },
            (err, png) => {
                if (err) reject(err);
                else resolve(png.toString('base64'));
            }
        );
    });
}

async function generateQRBase64(shipmentNumber) {
    return QRCode.toDataURL(String(shipmentNumber || ''), { width: 200, margin: 1, errorCorrectionLevel: 'M' });
}

function formatIQD(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

/**
 * ملصق شحنة (~١٤٨×١٦٩ مم) — عرض ٤٢٠ نقطة للتوافق مع الطابعات، ارتفاع ٤٨٠ لاستيعاب العنوان والملاحظات
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
    const setAr = () => doc.font(fonts.regular);
    const setArBold = () => doc.font(fonts.bold);
    const setNumBold = () => doc.font('Helvetica-Bold');

    const M = 10;
    const cw = w - M * 2;
    let y = M;

    const fullAddr = [order.RegionName, order.Address].filter(Boolean).join(' — ') || order.Address || '-';
    const hasNotes = order.Notes && String(order.Notes).trim();
    const notesText = hasNotes ? String(order.Notes).trim() : '';

    /* ─── إطار خارجي ناعم ─── */
    doc.save();
    doc.roundedRect(M - 2, M - 2, cw + 4, h - (M - 2) * 2, 8).lineWidth(1.2).strokeColor(COLORS.line).stroke();
    doc.restore();

    /* ─── شريط علامة تجارية ─── */
    const headerH = 38;
    doc.roundedRect(M, y, cw, headerH, 6).fill(COLORS.brandDark);
    doc.fillColor(COLORS.white).opacity(1);
    setArBold();
    doc.fontSize(15);
    textRTL(doc, 'شركة ديما الحياة', M + 8, y + 7, { width: cw - 16, align: 'center' });
    setAr();
    doc.fontSize(8.5);
    doc.fillColor('#A7F3D0');
    textRTL(doc, 'ملصق توصيل — نظام إدارة التوصيل', M + 8, y + 24, { width: cw - 16, align: 'center' });
    y += headerH + 6;

    /* ─── رقم الشحنة بارز (LTR للأرقام) ─── */
    const heroH = 36;
    doc.roundedRect(M, y, cw, heroH, 4).fill(COLORS.heroBg);
    doc.roundedRect(M, y, cw, heroH, 4).lineWidth(0.6).strokeColor(COLORS.totalBorder).stroke();
    setNumBold();
    doc.fillColor(COLORS.brandDark).fontSize(20);
    doc.text(String(order.ShipmentNumber || '—'), M, y + 9, { width: cw, align: 'center' });
    setAr();
    y += heroH + 6;

    /* ─── باركود + QR ─── */
    const qrSize = 52;
    const gapCodes = 8;
    const barW = cw - qrSize - gapCodes;
    const codeRowH = 48;
    doc.roundedRect(M, y, barW, codeRowH, 3).fill(COLORS.paper);
    doc.roundedRect(M, y, barW, codeRowH, 3).lineWidth(0.5).strokeColor(COLORS.lineSoft).stroke();
    doc.roundedRect(M + barW + gapCodes, y, qrSize, codeRowH, 3).fill(COLORS.paper);
    doc.roundedRect(M + barW + gapCodes, y, qrSize, codeRowH, 3).lineWidth(0.5).strokeColor(COLORS.lineSoft).stroke();

    const barcodePng = await generateBarcodeBase64(order.ShipmentNumber);
    doc.image(Buffer.from(barcodePng, 'base64'), M + 6, y + 3, { fit: [barW - 12, codeRowH - 6] });

    const qrData = await generateQRBase64(order.ShipmentNumber);
    const qrImgY = y + (codeRowH - qrSize + 6) / 2;
    doc.image(qrData, M + barW + gapCodes + (qrSize - 46) / 2, qrImgY, { width: 46 });
    y += codeRowH + 8;

    /* ─── مساحة المحتوى: لا يتجاوز التذييل ─── */
    const footH = 42;
    const fy = h - M - footH;
    const row2H = 22;
    const moneyH = 30;
    const addrTitleH = 16;

    setAr();
    doc.fontSize(9);

    const addrW = cw - 16;
    const addrFont = 10;
    let addrH = rtlBlockHeight(doc, fullAddr, addrW, addrFont) + 14;
    addrH = Math.min(Math.max(addrH, 28), 86);

    let notesH = 0;
    let showNotes = !!hasNotes;
    if (showNotes) {
        notesH = rtlBlockHeight(doc, notesText, addrW, 8.5) + 12;
        notesH = Math.min(Math.max(notesH, 20), 62);
    }

    function contentBottomEstimate() {
        let b = y + row2H * 2 + addrTitleH + addrH + moneyH + 6;
        if (showNotes && notesH > 0) b += 14 + notesH + 6;
        return b;
    }
    while (contentBottomEstimate() > fy && addrH > 26) addrH -= 8;
    while (contentBottomEstimate() > fy && showNotes && notesH > 18) notesH -= 6;
    if (contentBottomEstimate() > fy) showNotes = false;

    function pairRow(labelRight, valRight, labelLeft, valLeft, bgAlt) {
        const half = (cw - 6) / 2;
        const labW = 58;
        const vW = half - labW - 4;
        const xR = M;
        const xRLab = xR + vW + 4;
        const xL = M + half + 6;
        const xLLab = xL + vW + 4;
        const bg = bgAlt ? COLORS.stripeAlt : COLORS.stripe;
        doc.rect(xR, y, half, row2H).fill(bg);
        doc.rect(xL, y, half, row2H).fill(bg);
        doc.rect(xR, y, half, row2H).lineWidth(0.35).strokeColor(COLORS.lineSoft).stroke();
        doc.rect(xL, y, half, row2H).lineWidth(0.35).strokeColor(COLORS.lineSoft).stroke();
        setArBold();
        doc.fillColor(COLORS.muted).fontSize(7.5);
        textRTL(doc, labelRight + ':', xRLab + 2, y + 6, { width: labW - 4, align: 'right' });
        textRTL(doc, labelLeft + ':', xLLab + 2, y + 6, { width: labW - 4, align: 'right' });
        setAr();
        doc.fillColor(COLORS.text).fontSize(9.5);
        textRTL(doc, String(valRight ?? '—'), xR + 4, y + 5, { width: vW - 4, align: 'right' });
        setAr();
        doc.fillColor(COLORS.text).fontSize(9.5);
        textRTL(doc, String(valLeft ?? '—'), xL + 4, y + 5, { width: vW - 4, align: 'right' });
        y += row2H;
    }

    pairRow('المتجر', order.StoreName || '—', 'هاتف المتجر', order.StorePhone || '—', false);
    pairRow('المستلم', order.CustomerName || '—', 'هاتف المستلم', order.CustomerPhone || '—', true);

    /* عنوان التسليم */
    doc.rect(M, y, cw, 16).fill(COLORS.brand);
    setArBold();
    doc.fillColor(COLORS.white).fontSize(9);
    textRTL(doc, 'عنوان التسليم', M + 8, y + 4, { width: cw - 16, align: 'right' });
    y += 16;

    doc.rect(M, y, cw, addrH).fill(COLORS.paper);
    doc.rect(M, y, cw, addrH).lineWidth(0.45).strokeColor(COLORS.line).stroke();
    setAr();
    doc.fillColor(COLORS.text).fontSize(addrFont);
    textRTL(doc, fullAddr, M + 8, y + 6, { width: cw - 16, align: 'right' });
    y += addrH + 6;

    /* شريط المبالغ */
    const third = (cw - 8) / 3;
    const inv = formatIQD(order.AmountIQD) + ' د.ع';
    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const delTxt = order.FreeDelivery ? 'مجاني' : formatIQD(driverDelivery) + ' د.ع';
    const totalTxt = formatIQD(order.TotalIQD) + ' د.ع';

    const moneyY = y;
    doc.rect(M, moneyY, third, moneyH).fill(COLORS.stripe);
    doc.rect(M + third + 4, moneyY, third, moneyH).fill(COLORS.stripe);
    doc.rect(M + (third + 4) * 2, moneyY, third, moneyH).fill(COLORS.totalBg);
    [0, 1, 2].forEach((i) => {
        const x0 = M + i * (third + 4);
        doc.rect(x0, moneyY, third, moneyH).lineWidth(0.45).strokeColor(i === 2 ? COLORS.totalBorder : COLORS.lineSoft).stroke();
    });
    setArBold();
    doc.fillColor(COLORS.muted).fontSize(7);
    textRTL(doc, 'الفاتورة', M + 6, moneyY + 5, { width: third - 12, align: 'center' });
    textRTL(doc, 'التوصيل', M + third + 10, moneyY + 5, { width: third - 12, align: 'center' });
    textRTL(doc, 'النهائي', M + (third + 4) * 2 + 6, moneyY + 5, { width: third - 12, align: 'center' });
    setAr();
    doc.fillColor(COLORS.text).fontSize(9);
    textRTL(doc, inv, M + 6, moneyY + 16, { width: third - 12, align: 'center' });
    doc.fillColor(order.FreeDelivery ? COLORS.brand : COLORS.text).fontSize(9);
    textRTL(doc, delTxt, M + third + 10, moneyY + 16, { width: third - 12, align: 'center' });
    setArBold();
    doc.fillColor(COLORS.brandDark).fontSize(11);
    textRTL(doc, totalTxt, M + (third + 4) * 2 + 6, moneyY + 14, { width: third - 12, align: 'center' });
    setAr();
    y += moneyH + 6;

    if (showNotes && notesH > 0) {
        doc.rect(M, y, cw, 14).fill('#fff7ed');
        doc.rect(M, y, cw, 14).lineWidth(0.35).strokeColor('#fdba74').stroke();
        setArBold();
        doc.fillColor('#9a3412').fontSize(8);
        textRTL(doc, 'ملاحظات', M + 8, y + 3, { width: cw - 16, align: 'right' });
        y += 14;
        doc.rect(M, y, cw, notesH).fill('#fffbeb');
        doc.rect(M, y, cw, notesH).lineWidth(0.35).strokeColor('#fed7aa').stroke();
        setAr();
        doc.fillColor('#7c2d12').fontSize(8.5);
        textRTL(doc, notesText, M + 8, y + 5, { width: cw - 16, align: 'right' });
        y += notesH + 6;
    }

    /* تذييل */
    doc.roundedRect(M, fy, cw, footH, 4).fill(COLORS.stripeAlt);
    doc.roundedRect(M, fy, cw, footH, 4).lineWidth(0.55).strokeColor(COLORS.line).stroke();
    const dateStr = (order.CreatedDate || new Date().toISOString()).replace('T', ' ').slice(0, 16);
    const halfF = (cw - 8) / 2;
    setArBold();
    doc.fillColor(COLORS.muted).fontSize(7);
    textRTL(doc, 'عدد القطع', M + 8, fy + 8, { width: 72, align: 'right' });
    setNumBold();
    doc.fillColor(COLORS.text).fontSize(11);
    doc.text(String(order.Pieces || 1), M + 8, fy + 18, { width: halfF - 16, align: 'right' });
    setArBold();
    doc.fillColor(COLORS.muted).fontSize(7);
    textRTL(doc, 'تاريخ الإنشاء', M + halfF + 4, fy + 8, { width: 80, align: 'right' });
    setAr();
    doc.fillColor(COLORS.textSoft).fontSize(8.5);
    textRTL(doc, dateStr, M + halfF + 4, fy + 17, { width: halfF - 12, align: 'right' });
    doc.moveTo(M + 8, fy + 28).lineTo(M + cw - 8, fy + 28).lineWidth(0.35).strokeColor(COLORS.lineSoft).stroke();
    setArBold();
    doc.fillColor(COLORS.muted).fontSize(7.5);
    textRTL(doc, 'رقم الطلب (إداري)', M + 8, fy + 32, { width: 120, align: 'right' });
    setNumBold();
    doc.fillColor(COLORS.brand).fontSize(13);
    doc.text(String(order.AdminOrderNo ?? '—'), M + 8, fy + 30, { width: cw - 24, align: 'right' });

    doc.end();
    return pdfPromise;
}

module.exports = {
    generateBarcodeBase64,
    generateQRBase64,
    createLabelPDF,
    formatIQD
};
