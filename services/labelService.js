const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BLACK = '#000000';
const WHITE = '#ffffff';
const COLORS = {
    headerBg: WHITE,
    headerText: BLACK,
    tableHeader: WHITE,
    rowAlt: WHITE,
    rowNormal: WHITE,
    labelBg: WHITE,
    labelText: BLACK,
    valueText: BLACK,
    gridLine: BLACK
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

// يرسم النص بترتيب أسطر صحيح: نلف النص الأصلي ثم نطبّق rev على كل سطر عند الرسم
function textRTL(doc, str, x, y, options) {
    const width = options?.width ?? Infinity;
    const align = options?.align ?? 'right';
    const lineGap = options?.lineGap ?? 0;
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

function getArabicFont(doc) {
    // 1) خط داخل المشروع (يعمل على Windows و Linux و Docker) - PDFKit يدعم TTF فقط
    const projectFont = path.join(__dirname, '..', 'fonts', 'Amiri-Regular.ttf');
    if (fs.existsSync(projectFont)) {
        doc.registerFont('Arabic', projectFont);
        return 'Arabic';
    }
    // 2) Linux: خطوط النظام (يجب تثبيتها على السيرفر)
    const linuxFonts = [
        '/usr/share/fonts/truetype/amiri/Amiri-Regular.ttf',     // fonts-amiri
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',       // fonts-dejavu-core
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
    ];
    for (const fp of linuxFonts) {
        if (fs.existsSync(fp)) {
            doc.registerFont('Arabic', fp);
            return 'Arabic';
        }
    }
    // 3) Windows
    const sysRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';
    const winFonts = ['tahoma.ttf', 'arial.ttf', 'segoeui.ttf'];
    for (const f of winFonts) {
        const fp = path.join(sysRoot, 'Fonts', f);
        if (fs.existsSync(fp)) {
            doc.registerFont('Arabic', fp);
            return 'Arabic';
        }
    }
    return 'Helvetica';
}

function generateBarcodeBase64(shipmentNumber) {
    return new Promise((resolve, reject) => {
        bwipjs.toBuffer({
            bcid: 'code128',
            text: shipmentNumber,
            scale: 1,
            height: 4
        }, (err, png) => {
            if (err) reject(err);
            else resolve(png.toString('base64'));
        });
    });
}

async function generateQRBase64(shipmentNumber) {
    return QRCode.toDataURL(shipmentNumber, { width: 90, margin: 1 });
}

function formatIQD(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

async function createLabelPDF(order) {
    const w = 420;
    const h = 420;
    const doc = new PDFDocument({ size: [w, h], margin: 0 });
    const chunks = [];
    doc.on('data', chunks.push.bind(chunks));
    const pdfPromise = new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const font = getArabicFont(doc);
    const setArabic = () => doc.font(font);
    const setNumeric = () => doc.font('Helvetica');
    const MARGIN = 6;
    const cw = w - MARGIN * 2;
    const GAP = 2;
    const xRight = w - MARGIN;
    let y = MARGIN;

    doc.rect(MARGIN, MARGIN, cw, h - MARGIN * 2).lineWidth(1).strokeColor(BLACK).stroke();

    setArabic();
    // ─── هيدر: شركة ديما الحياة (بنفس أسلوب PDF) ───
    const headerH = 36;
    doc.rect(MARGIN, y, cw, headerH).fill(COLORS.headerBg);
    doc.rect(MARGIN, y, cw, headerH).lineWidth(0.5).strokeColor(BLACK).stroke();
    doc.fillColor(COLORS.headerText).fontSize(14);
    textRTL(doc, 'شركة ديما الحياة', MARGIN + 8, y + 8, { width: cw - 16, align: 'center' });
    doc.fontSize(9);
    textRTL(doc, 'نظام إدارة التوصيل', MARGIN + 8, y + 24, { width: cw - 16, align: 'center' });
    y += headerH + GAP;

    // ─── صف الباركود و QR ───
    const qrW = 68;
    const barW = cw - qrW - GAP;
    const barH = 36;

    doc.rect(MARGIN, y, barW, barH).fillAndStroke(WHITE, BLACK);
    doc.rect(MARGIN + barW + GAP, y, qrW, barH).fillAndStroke(WHITE, BLACK);

    const barcodePng = await generateBarcodeBase64(order.ShipmentNumber);
    const barPadH = 20;
    const barPadV = 6;
    const barDisplayW = barW - barPadH * 2;
    const barDisplayH = barH - barPadV * 2;
    doc.image(Buffer.from(barcodePng, 'base64'), MARGIN + barPadH, y + barPadV / 2, { fit: [barDisplayW, barDisplayH] });

    const qrData = await generateQRBase64(order.ShipmentNumber);
    doc.image(qrData, MARGIN + barW + GAP + (qrW - 36) / 2, y + 2, { width: 36 });
    doc.fillColor(BLACK).fontSize(7);
    setNumeric();
    doc.text(order.ShipmentNumber, MARGIN + barW + GAP + 4, y + 28, { width: qrW - 8, align: 'right' });
    setArabic();
    y += barH + GAP;

    // ─── جدول البيانات: أسلوب PDF (حدود، ألوان، doc.text مع width و align) ───
    const gridTop = y;
    const gridBottom = h - MARGIN - 2;
    const gridH = gridBottom - gridTop;

    const labelW = 70;
    const halfW = (cw - GAP) / 2;
    const valW = halfW - labelW - GAP;

    const hasNotes = order.Notes && order.Notes.trim();
    const rowCount = hasNotes ? 10 : 9;
    const ROW_GAP = 4;
    const rh = (gridH - (rowCount - 1) * ROW_GAP) / rowCount;

    function drawLabelCell(x, cellW, cellH, text) {
        doc.rect(x, y, cellW, cellH).fill(COLORS.labelBg);
        doc.rect(x, y, cellW, cellH).lineWidth(0.4).strokeColor(BLACK).stroke();
        setArabic();
        doc.fillColor(BLACK).fontSize(7);
        textRTL(doc, text + ':', x + 4, y + (cellH - 10) / 2 + 2, { width: cellW - 8, align: 'right' });
    }

    function drawValueCell(x, cellW, cellH, text, alt, noRev, noWrap, isNumeric) {
        const bg = alt ? COLORS.rowAlt : COLORS.rowNormal;
        doc.rect(x, y, cellW, cellH).fill(bg);
        doc.rect(x, y, cellW, cellH).lineWidth(0.4).strokeColor(BLACK).stroke();
        if (isNumeric) setNumeric();
        else setArabic();
        const str = String(text ?? '-').slice(0, 40);
        doc.fillColor(BLACK).fontSize(9);
        const cy = y + (cellH - 11) / 2 + 2;
        if (noWrap) {
            const displayLine = rev(str);
            const lw = doc.widthOfString(displayLine) || 0;
            const xx = x + cellW - 4 - lw;
            doc.text(displayLine, xx, cy, { align: 'left' });
        } else {
            textRTL(doc, str, x + 4, cy, { width: cellW - 8, align: 'right' });
        }
        setArabic();
    }

    function row2(lbl1, val1, lbl2, val2, noRev1, noRev2, alt, val2NoWrap, val1Numeric, val2Numeric) {
        const x1 = MARGIN;
        const x2 = MARGIN + valW + GAP;
        const x3 = MARGIN + halfW + GAP;
        const x4 = MARGIN + halfW + valW + GAP * 2;

        drawLabelCell(x4, labelW, rh, lbl1);
        drawValueCell(x3, valW, rh, val1, alt, noRev1, false, val1Numeric);
        drawLabelCell(x2, labelW, rh, lbl2);
        drawValueCell(x1, valW, rh, val2, alt, noRev2, val2NoWrap, val2Numeric);
        y += rh + ROW_GAP;
    }

    function row1(lbl, val, noRev, emphasize, valNumeric) {
        doc.rect(MARGIN, y, cw, rh).fill(emphasize ? COLORS.tableHeader : COLORS.rowNormal);
        doc.rect(MARGIN, y, cw, rh).lineWidth(0.4).strokeColor(BLACK).stroke();
        if (emphasize) {
            setArabic();
            doc.fillColor(COLORS.headerText).fontSize(9);
            textRTL(doc, lbl + ':', MARGIN + cw - 101, y + (rh - 12) / 2 + 2, { width: 95, align: 'right' });
            doc.fontSize(11);
            if (valNumeric) setNumeric();
            textRTL(doc, String(val ?? '-').slice(0, 60), MARGIN + 6, y + (rh - 12) / 2, { width: cw - 116, align: 'left' });
            setArabic();
        } else {
            doc.rect(MARGIN + cw - 90, y, 90, rh).fill(COLORS.labelBg);
            setArabic();
            doc.fillColor(COLORS.labelText).fontSize(7);
            textRTL(doc, lbl + ':', MARGIN + cw - 86, y + (rh - 10) / 2 + 2, { width: 82, align: 'right' });
            doc.fillColor(COLORS.valueText).fontSize(9);
            if (valNumeric) setNumeric();
            textRTL(doc, String(val ?? '-'), MARGIN + 6, y + (rh - 10) / 2 + 2, { width: cw - 100, align: 'right' });
            setArabic();
        }
        y += rh + ROW_GAP;
    }

    setArabic();
    let alt = false;
    row2('المتجر', order.StoreName, 'هاتف المتجر', order.StorePhone, false, true, alt, false, false, true);
    alt = !alt;

    doc.rect(MARGIN, y, cw, rh).fill(COLORS.labelBg);
    doc.rect(MARGIN, y, cw, rh).lineWidth(0.4).strokeColor(BLACK).stroke();
    doc.fillColor(BLACK).fontSize(8);
    textRTL(doc, 'عنوان التسليم' + ':', MARGIN + 6, y + (rh - 10) / 2 + 2, { width: cw - 12, align: 'right' });
    y += rh + ROW_GAP;

    const fullAddr = (order.RegionName ? order.RegionName + ' - ' : '') + (order.Address || '');
    doc.rect(MARGIN, y, cw, rh).fill(COLORS.rowAlt);
    doc.rect(MARGIN, y, cw, rh).lineWidth(0.4).strokeColor(BLACK).stroke();
    doc.fillColor(BLACK).fontSize(9);
    textRTL(doc, (fullAddr || '-').toString().slice(0, 90), MARGIN + 6, y + (rh - 10) / 2 + 2, { width: cw - 12, align: 'right' });
    y += rh + ROW_GAP;
    alt = !alt;

    row2('اسم المستلم', order.CustomerName, 'هاتف المستلم', order.CustomerPhone, false, true, alt, false, false, true);
    alt = !alt;

    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const deliveryText = order.FreeDelivery ? 'مجاني' : formatIQD(driverDelivery) + ' د.ع';
    // المبالغ تحتوي "د.ع" عربي - نستخدم خط العربية وليس Helvetica
    row2('مبلغ الفاتورة', formatIQD(order.AmountIQD) + ' د.ع', 'مبلغ التوصيل', deliveryText, true, true, alt, true, false, false);
    alt = !alt;

    row1('المبلغ النهائي', formatIQD(order.TotalIQD) + ' دينار عراقي', true, true, false);

    if (hasNotes) {
        row1('الملاحظات', order.Notes.trim().slice(0, 80), false, false, false);
    }

    const dateStr = (order.CreatedDate || new Date().toISOString()).replace('T', ' ').slice(0, 19);
    row2('عدد القطع', String(order.Pieces || 1), 'تاريخ الشحنة', dateStr, true, true, alt, false, true, true);
    alt = !alt;
    row2('رقم الطلب', order.AdminOrderNo ?? '-', 'رقم الشحنة', order.ShipmentNumber, true, true, alt, false, true, true);

    doc.end();
    return pdfPromise;
}

module.exports = {
    generateBarcodeBase64,
    generateQRBase64,
    createLabelPDF,
    formatIQD
};
