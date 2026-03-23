const db = require('../database/init');
const feeCollectionService = require('./feeCollectionService');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ─── إعدادات PDF: A4 أفقي (Landscape) ───
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 24;
const FONT_SM = 8;
const FONT_MD = 10;
const FONT_LG = 12;
const FONT_TBL = 7;
const RTL = true;
const ROW_H_MIN = 14;
const HEADER_ROW_H = 26;
const CELL_PAD = 4;
const GAP = 2;
const TBL_W = PAGE_WIDTH - MARGIN * 2; // 794

const COLORS = {
    headerBg: '#0f766e',
    cardBg: '#ffffff',
    tableHeader: '#115e59',
    headerText: '#ffffff',
    rowAlt: '#f0fdfa',
    rowNormal: '#ffffff',
    rowReturned: '#fef2f2',
    gridLine: '#0d9488',
    border: '#14b8a6',
    text: '#134e4a',
    textMuted: '#0f766e',
    primary: '#0f766e'
};

function formatIQD(val) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val || 0));
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

// PDFKit يعرض النص العربي بترتيب معكوس، نعكس الكلمات ليعود العرض صحيحاً
function rev(str) {
    if (!str || typeof str !== 'string') return str;
    return str.split(/\s+/).reverse().join(' ');
}
function txt(str) {
    return (str || '-').toString();
}

// رسم النص العربي متعدد الأسطر بترتيب صحيح (PDFKit يعكس ترتيب الأسطر)
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

const STATUS_LABELS = { New: 'جديد', AssignedToDriver: 'مع السائق', Delivered: 'تم التوصيل', Returned: 'راجع' };

function getFullAddress(o) {
    const region = (o.RegionName || '').trim();
    const addr = (o.Address || '').trim();
    if (region && addr) return region + ' - ' + addr;
    return region || addr || '-';
}

function isOrderReturned(o) {
    if (!o || typeof o !== 'object') return false;
    const s = String(o.Status ?? o.status ?? '').trim();
    return s === 'Returned' || /راجع|returned|canceled|ملغي/i.test(s);
}

// مبلغ التوصيل الذي يأخذه السائق (حتى مع المجاني)
function getDriverDeliveryAmount(order) {
    if (order.FreeDelivery && (order.WaivedDeliveryIQD || 0) > 0) return order.WaivedDeliveryIQD || 0;
    return order.DeliveryFeeIQD || 0;
}

// المبلغ المستحق الكلي = إجمالي المبلغ النهائي - إجمالي أجور التوصيل
// لكل طلب: المستحق = النهائي (TotalIQD) - أجرة التوصيل (مجاني: WaivedDeliveryIQD، غير مجاني: DeliveryFeeIQD)
function getAmountDue(order) {
    const total = Number(order.TotalIQD ?? 0) || 0;
    const free = !!(order.FreeDelivery);
    const deliveryAmt = free ? (Number(order.WaivedDeliveryIQD ?? 0) || 0) : (Number(order.DeliveryFeeIQD ?? 0) || 0);
    return total - deliveryAmt;
}

// ─── رسم الهيدر ───
function drawHeader(doc, title, subtitle, font) {
    doc.rect(0, 0, PAGE_WIDTH, 52).fill(COLORS.headerBg);
    if (font) doc.font(font);
    doc.fillColor('#ffffff').fontSize(18);
    textRTL(doc, txt(title), MARGIN, 14, { width: PAGE_WIDTH - MARGIN * 2, align: 'right' });
    doc.fontSize(9);
    textRTL(doc, txt(subtitle || ''), MARGIN, 34, { width: PAGE_WIDTH - MARGIN * 2, align: 'right' });
}

// ─── رسم بطاقات المعلومات (شكل Excel) ───
function drawCards(doc, cards, y, font) {
    const gap = 10;
    const n = cards.length;
    const cardW = (PAGE_WIDTH - MARGIN * 2 - gap * (n - 1)) / n;
    const cardH = 40;
    cards.forEach((c, i) => {
        const x = PAGE_WIDTH - MARGIN - (i + 1) * (cardW + gap) + gap;
        doc.rect(x, y, cardW, cardH).fillAndStroke(COLORS.rowNormal, COLORS.gridLine);
        doc.font(font).fillColor(COLORS.textMuted).fontSize(FONT_SM);
        textRTL(doc, txt(c.label), x + 8, y + 6, { width: cardW - 16, align: 'right' });
        // المبالغ تحتوي "د.ع" عربي - لا نستخدم Helvetica إلا للأرقام الخالصة
        if (c.numeric && !String(c.value).includes('د.ع')) doc.font('Helvetica');
        doc.fillColor(COLORS.text).fontSize(FONT_MD);
        textRTL(doc, String(c.value), x + 8, y + 20, { width: cardW - 16, align: 'right' });
        doc.font(font);
    });
}

// ─── رأس الجدول - ارتفاع يتكيف مع العناوين متعددة الأسطر ───
function drawTableHead(doc, columns, y, font, compact) {
    doc.font(font).fontSize(compact ? FONT_SM : FONT_MD);
    const lineH = doc.currentLineHeight();
    let headerH = compact ? 22 : HEADER_ROW_H;
    columns.forEach((col, i) => {
        const lines = wrapRTL(doc, txt(col.label), col.width - 6);
        const needH = Math.ceil(lines.length * lineH) + 10;
        if (needH > headerH) headerH = needH;
    });
    headerH = Math.max(compact ? 22 : HEADER_ROW_H, headerH);
    doc.strokeColor(COLORS.gridLine).lineWidth(0.4);
    doc.rect(MARGIN, y, TBL_W, headerH).fillAndStroke(COLORS.tableHeader, COLORS.gridLine);
    let xRight = PAGE_WIDTH - MARGIN;
    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (i > 0) { doc.moveTo(xRight, y).lineTo(xRight, y + headerH).stroke(); }
        doc.font(font).fillColor(COLORS.headerText).fontSize(compact ? FONT_SM : FONT_MD);
        textRTL(doc, txt(col.label), xRight - col.width - 6, y + 4, { width: col.width - 6, align: 'right' });
        xRight -= col.width + GAP;
    }
    return headerH;
}

function getTableRowHeight(doc, columns, cells, font, fontSize, numericIndices) {
    const lineH = doc.currentLineHeight();
    let maxH = ROW_H_MIN;
    columns.forEach((col, i) => {
        const str = String(cells[i] ?? '-');
        const cellW = Math.max(10, col.width - 6);
        const useNum = numericIndices && numericIndices.includes(i);
        const hasArabic = /[\u0600-\u06FF]/.test(str);
        if (useNum && !hasArabic) doc.font('Helvetica').fontSize(fontSize ?? FONT_TBL);
        else doc.font(font).fontSize(fontSize ?? FONT_TBL);
        const lines = wrapRTL(doc, str, cellW);
        doc.font(font);
        const h = lines.length * lineH;
        const needH = Math.ceil(Math.max(h, lineH)) + CELL_PAD * 2;
        if (needH > maxH) maxH = needH;
    });
    return Math.max(ROW_H_MIN, maxH);
}

// ─── صف في الجدول - يتكيف الارتفاع مع النص المتعدد الأسطر ───
function drawTableRow(doc, columns, cells, y, alt, font, fontSize, returned, numericIndices) {
    doc.font(font).fontSize(fontSize ?? FONT_TBL);
    const lineH = doc.currentLineHeight();
    let maxH = ROW_H_MIN;
    columns.forEach((col, i) => {
        const str = String(cells[i] ?? '-');
        const cellW = Math.max(10, col.width - 6);
        const useNum = numericIndices && numericIndices.includes(i);
        const hasArabic = /[\u0600-\u06FF]/.test(str);
        if (useNum && !hasArabic) doc.font('Helvetica');
        const lines = wrapRTL(doc, str, cellW);
        if (useNum && !hasArabic) doc.font(font);
        const h = lines.length * lineH;
        const needH = Math.ceil(Math.max(h, lineH)) + CELL_PAD * 2;
        if (needH > maxH) maxH = needH;
    });
    const rowH = Math.max(ROW_H_MIN, maxH);
    const bg = returned ? COLORS.rowReturned : (alt ? COLORS.rowAlt : COLORS.rowNormal);
    doc.strokeColor(COLORS.gridLine).lineWidth(0.3);
    doc.rect(MARGIN, y, TBL_W, rowH).fillAndStroke(bg, COLORS.gridLine);
    let xRight = PAGE_WIDTH - MARGIN;
    cells.forEach((cell, i) => {
        const w = columns[i].width;
        if (i > 0) { doc.moveTo(xRight, y).lineTo(xRight, y + rowH).stroke(); }
        const useNum = numericIndices && numericIndices.includes(i);
        const cellStr = String(cell ?? '-');
        // إذا احتوى الخيار على عربي (مجاني، د.ع) نستخدم خط العربية
        const hasArabic = /[\u0600-\u06FF]/.test(cellStr);
        if (useNum && !hasArabic) doc.font('Helvetica');
        else doc.font(font);
        doc.fillColor(COLORS.text).fontSize(fontSize ?? FONT_TBL);
        textRTL(doc, cellStr, xRight - w - 4, y + CELL_PAD, { width: w - 6, align: 'right' });
        doc.font(font);
        xRight -= w + GAP;
    });
    return rowH;
}

// ─── عنوان القسم ───
function drawSectionTitle(doc, title, y, font) {
    if (font) doc.font(font);
    doc.fillColor(COLORS.primary).fontSize(FONT_MD);
    textRTL(doc, txt(title), PAGE_WIDTH - MARGIN - 350, y, { width: 200, align: 'right' });
}

// ─── إحصائيات أجور التوصيل ───
function drawDeliveryFeeStats(doc, report, y, font) {
    const countFree = report.countFreeDelivery ?? 0;
    const countPaid = report.countPaidDelivery ?? 0;
    const breakdown = report.deliveryFeeBreakdown ?? {};
    const freeBreakdown = report.freeDeliveryBreakdown ?? {};
    const feeEntries = Object.entries(breakdown).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    const freeEntries = Object.entries(freeBreakdown).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    const gap = 12;
    const cardH = 38;
    const totalW = TBL_W;

    doc.fillColor(COLORS.primary).fontSize(FONT_SM);
    textRTL(doc, 'إحصائيات أجور التوصيل', PAGE_WIDTH - MARGIN - 10, y, { width: 180, align: 'right' });
    y += 20;

    const mainCards = [
        { label: 'مجاني', value: countFree.toString(), width: 110 },
        { label: 'غير مجاني', value: countPaid.toString(), width: 110 }
    ];
    let xRight = PAGE_WIDTH - MARGIN;
    mainCards.forEach((c) => {
        const w = c.width;
        doc.rect(xRight - w, y, w, cardH).fillAndStroke(COLORS.rowNormal, COLORS.gridLine);
        doc.font(font).fillColor(COLORS.textMuted).fontSize(7);
        textRTL(doc, txt(c.label), xRight - w + 6, y + 8, { width: w - 12, align: 'right' });
        doc.font('Helvetica').fillColor(COLORS.text).fontSize(FONT_MD);
        textRTL(doc, String(c.value), xRight - w + 6, y + 20, { width: w - 12, align: 'right' });
        doc.font(font);
        xRight -= w + gap;
    });

    const allEntries = [
        ...freeEntries.map(([amt, c]) => ({ amt: parseFloat(amt), count: c, isFree: true })),
        ...feeEntries.map(([amt, c]) => ({ amt: parseFloat(amt), count: c, isFree: false }))
    ].sort((a, b) => a.amt - b.amt);

    if (allEntries.length > 0) {
        y += cardH + 10;
        doc.font(font).fillColor(COLORS.textMuted).fontSize(7);
        textRTL(doc, 'حسب المبلغ', PAGE_WIDTH - MARGIN - 10, y, { width: 80, align: 'right' });
        y += 14;
        const n = allEntries.length;
        const feeCardW = Math.min(95, (totalW - (n - 1) * 8) / n);
        xRight = PAGE_WIDTH - MARGIN;
        allEntries.forEach(({ amt, count, isFree }) => {
            const label = isFree ? 'مجاني ' + formatIQD(amt) + ' د.ع' : formatIQD(amt) + ' د.ع';
            doc.rect(xRight - feeCardW, y, feeCardW, 32).fillAndStroke(COLORS.rowAlt, COLORS.gridLine);
            doc.font(font).fillColor(COLORS.textMuted).fontSize(6);
            textRTL(doc, label, xRight - feeCardW + 4, y + 4, { width: feeCardW - 8, align: 'right' });
            doc.fillColor(COLORS.text).fontSize(FONT_SM);
            textRTL(doc, count.toString(), xRight - feeCardW + 4, y + 16, { width: feeCardW - 8, align: 'right' });
            doc.font(font);
            xRight -= feeCardW + 8;
        });
        y += 36;
    } else {
        y += cardH + 10;
    }
    return y + 8;
}

// ─── صندوق الملخص ───
function drawSummary(doc, items, y, font) {
    const boxW = TBL_W;
    const boxH = 42;
    doc.rect(MARGIN, y, boxW, boxH).fillAndStroke(COLORS.tableHeader, COLORS.gridLine);
    doc.font(font).fillColor('#ffffff').fontSize(FONT_MD);
    textRTL(doc, 'الملخص', PAGE_WIDTH - MARGIN - 85, y + 14, { width: 75, align: 'right' });
    const n = items.length;
    const itemW = Math.max(90, (boxW - 90 - (n - 1) * 12) / n);
    items.forEach((item, i) => {
        const ix = PAGE_WIDTH - MARGIN - 85 - (i + 1) * (itemW + 12) + 12;
        doc.font(font).fillColor('#e0f2fe').fontSize(FONT_SM);
        textRTL(doc, txt(item.label), ix, y + 6, { width: itemW, align: 'right' });
        // المبالغ تحتوي "د.ع" - نستخدم خط العربية
        if (item.numeric && !String(item.value).includes('د.ع')) doc.font('Helvetica');
        doc.fillColor('#ffffff').fontSize(FONT_LG - 1);
        textRTL(doc, String(item.value), ix, y + 22, { width: itemW, align: 'right' });
        doc.font(font);
    });
}

// ─── الفوتر ───
function drawFooter(doc, font) {
    const fy = PAGE_HEIGHT - 22;
    doc.strokeColor(COLORS.gridLine).lineWidth(0.5).moveTo(MARGIN, fy - 8).lineTo(PAGE_WIDTH - MARGIN, fy - 8).stroke();
    if (font) doc.font(font);
    doc.fillColor(COLORS.textMuted).fontSize(8);
    textRTL(doc, 'شركة ديما الحياة - نظام إدارة التوصيل', MARGIN, fy, { width: PAGE_WIDTH - MARGIN * 2, align: 'center' });
}

// ─── تقرير السائق اليومي ───
async function generateDriverReportPDF(report) {
    const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0,
        autoFirstPage: false
    });
    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const bufferPromise = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const font = getArabicFont(doc);
    doc.font(font);

    let y = 58;
    drawHeader(doc, 'تقرير السائق', 'شركة ديما الحياة', font);

    const validOrders = (report.orders || []).filter(o => !isOrderReturned(o));
    const totalInvoice = validOrders.reduce((s, o) => s + (o.AmountIQD || 0), 0);
    const totalDelivery = validOrders.reduce((s, o) => s + getDriverDeliveryAmount(o), 0);
    const totalNet = validOrders.reduce((s, o) => s + (o.TotalIQD || 0), 0);
    const totalDue = validOrders.reduce((s, o) => s + getAmountDue(o), 0);

    drawCards(doc, [
        { label: 'السائق', value: report.driver.DriverName },
        { label: 'التاريخ', value: report.date },
        { label: 'عدد الطلبات', value: report.count.toString(), numeric: true },
        { label: 'عدد المرتجعات', value: (report.countReturned || 0).toString(), numeric: true },
        { label: 'المبلغ المستحق', value: formatIQD(totalDue) + ' د.ع', numeric: true }
    ], y, font);
    y += 46;

    drawSectionTitle(doc, 'تفاصيل الطلبات', y, font);
    y += 18;

    const cols = [
        { width: 38, label: 'الحالة' },
        { width: 44, label: 'رقم الطلب' },
        { width: 54, label: 'رقم الشحنة' },
        { width: 48, label: 'المتجر' },
        { width: 48, label: 'المستلم' },
        { width: 46, label: 'الهاتف' },
        { width: 80, label: 'العنوان' },
        { width: 18, label: 'قطع' },
        { width: 48, label: 'فاتورة' },
        { width: 48, label: 'توصيل' },
        { width: 48, label: 'النهائي' },
        { width: 48, label: 'المستحق' },
        { width: 28, label: 'سداد' },
        { width: 34, label: 'طباعة' },
        { width: 36, label: 'استلام' },
        { width: 42, label: 'أنشأه' },
        { width: 52, label: 'ملاحظات' }
    ];
    const wrap = (s, n) => (s || '-').toString().slice(0, n);
    const BOTTOM_MARGIN = 85;
    const numericCols = [1, 2, 5, 7, 8, 9, 10, 11, 12];
    const receiveTxt = (o) => isOrderReturned(o) ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';

    y += drawTableHead(doc, cols, y, font, true);

    report.orders.forEach((o, i) => {
        const statusTxt = STATUS_LABELS[o.Status || o.status] || (o.Status || o.status) || '-';
        const driverAmt = getDriverDeliveryAmount(o);
        const due = getAmountDue(o);
        const cells = [
            statusTxt,
            wrap(o.AdminOrderNo, 10),
            wrap(o.ShipmentNumber, 14),
            wrap(o.StoreName, 18),
            wrap(o.CustomerName, 16),
            wrap(o.CustomerPhone, 10),
            wrap(getFullAddress(o), 45),
            (o.Pieces || 1).toString(),
            formatIQD(o.AmountIQD),
            o.FreeDelivery ? txt('مجاني') + ' ' + formatIQD(driverAmt) : formatIQD(driverAmt),
            formatIQD(o.TotalIQD),
            formatIQD(due),
            o.FeesCollected ? 'تم' : '-',
            o.LabelPrinted ? 'تم' : '-',
            receiveTxt(o),
            wrap(o.CreatedByName, 14),
            txt(o.Notes)
        ];
        const rowH = getTableRowHeight(doc, cols, cells, font, null, numericCols);
        if (y + rowH > PAGE_HEIGHT - BOTTOM_MARGIN) {
            drawFooter(doc, font);
            doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
            doc.font(font);
            drawHeader(doc, 'تقرير السائق', 'شركة ديما الحياة', font);
            y = 58;
            y += drawTableHead(doc, cols, y, font, true);
        }
        const returned = isOrderReturned(o);
        drawTableRow(doc, cols, cells, y, i % 2 === 1, font, null, returned, numericCols);
        y += rowH;
    });

    y += 12;
    if (y + 120 > PAGE_HEIGHT - 25) {
        drawFooter(doc, font);
        doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
        doc.font(font);
        drawHeader(doc, 'تقرير السائق', 'شركة ديما الحياة', font);
        y = 58;
    }
    y = drawDeliveryFeeStats(doc, report, y, font);
    drawSummary(doc, [
        { label: 'عدد الطلبات', value: report.count.toString(), numeric: true },
        { label: 'عدد المرتجعات', value: (report.countReturned || 0).toString(), numeric: true },
        { label: 'إجمالي الفواتير', value: formatIQD(totalInvoice) + ' د.ع', numeric: true },
        { label: 'أجور التوصيل', value: formatIQD(totalDelivery) + ' د.ع', numeric: true },
        { label: 'المبلغ النهائي', value: formatIQD(totalNet) + ' د.ع', numeric: true },
        { label: 'المبلغ المستحق', value: formatIQD(totalDue) + ' د.ع', numeric: true }
    ], y, font);

    drawFooter(doc, font);
    doc.end();
    return bufferPromise;
}

// ─── التقرير الملخص ───
async function generateDailySummaryReportPDF(report) {
    const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0,
        autoFirstPage: false
    });
    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const bufferPromise = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const font = getArabicFont(doc);
    doc.font(font);

    const dateStr = report.dateFrom === report.dateTo ? report.dateFrom : report.dateFrom + ' إلى ' + report.dateTo;
    let y = 58;
    drawHeader(doc, 'التقرير الملخص', 'شركة ديما الحياة - ' + dateStr, font);

    drawCards(doc, [
        { label: 'الفترة', value: dateStr },
        { label: 'عدد السجلات', value: report.rows.length.toString(), numeric: true }
    ], y, font);
    y += 46;

    drawSectionTitle(doc, 'ملخص يومي لكل سائق', y, font);
    y += 18;

    const cols = [
        { width: 52, label: 'التاريخ' },
        { width: 70, label: 'السائق' },
        { width: 38, label: 'طلبات' },
        { width: 36, label: 'مرتجعات' },
        { width: 58, label: 'فاتورة' },
        { width: 58, label: 'توصيل' },
        { width: 58, label: 'النهائي' },
        { width: 58, label: 'المستحق' },
        { width: 32, label: 'سداد' },
        { width: 34, label: 'مجاني' },
        { width: 42, label: 'غير مجاني' },
        { width: 130, label: 'تفصيل الأجور' }
    ];
    const wrap = (s, n) => (s || '-').toString().slice(0, n);
    const BOTTOM_MARGIN = 60;
    const dailyNumericCols = [0, 2, 3, 4, 5, 6, 7, 9, 10];

    y += drawTableHead(doc, cols, y, font, true);

    (report.rows || []).forEach((r, i) => {
        const freeDetail = Object.entries(r.freeDeliveryBreakdown || {})
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            .map(([amt, c]) => 'مجاني ' + formatIQD(amt) + ':' + c).join(' ');
        const paidDetail = Object.entries(r.deliveryFeeBreakdown || {})
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            .map(([fee, c]) => formatIQD(fee) + ':' + c).join(' ');
        const feeDetail = [freeDetail, paidDetail].filter(Boolean).join(' | ') || '-';
        const cells = [
            r.orderDate,
            wrap(r.driverName, 28),
            r.count.toString(),
            r.countReturned.toString(),
            formatIQD(r.totalAmount),
            formatIQD(r.totalDelivery),
            formatIQD(r.net),
            formatIQD(r.totalDue),
            r.feesCollected ? 'تم' : '-',
            r.countFreeDelivery.toString(),
            r.countPaidDelivery.toString(),
            wrap(feeDetail, 65)
        ];
        const rowH = getTableRowHeight(doc, cols, cells, font, null, dailyNumericCols);
        if (y + rowH > PAGE_HEIGHT - BOTTOM_MARGIN) {
            drawFooter(doc, font);
            doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
            doc.font(font);
            drawHeader(doc, 'التقرير الملخص', 'شركة ديما الحياة - ' + dateStr, font);
            y = 58;
            y += drawTableHead(doc, cols, y, font, true);
        }
        drawTableRow(doc, cols, cells, y, i % 2 === 1, font, null, false, dailyNumericCols);
        y += rowH;
    });

    drawFooter(doc, font);
    doc.end();
    return bufferPromise;
}

// ─── تقرير الشركة اليومي ───
async function generateCompanyReportPDF(report) {
    const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0,
        autoFirstPage: false
    });
    doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const bufferPromise = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const font = getArabicFont(doc);
    doc.font(font);

    const summary = report?.summary || [];
    const allOrders = summary.flatMap(s => (s?.orders || []));
    const validOrders = allOrders.filter(o => !isOrderReturned(o));
    const grandInvoice = validOrders.reduce((s, o) => s + (o.AmountIQD || 0), 0);
    const grandDelivery = validOrders.reduce((s, o) => s + getDriverDeliveryAmount(o), 0);
    const grandTotal = validOrders.reduce((s, o) => s + (o.TotalIQD || 0), 0);
    const grandDue = validOrders.reduce((s, o) => s + getAmountDue(o), 0);

    let y = 58;
    drawHeader(doc, 'التقرير العام', 'شركة ديما الحياة', font);

    drawCards(doc, [
        { label: 'التاريخ', value: report?.date || '' },
        { label: 'إجمالي الطلبات', value: (report?.totalOrders ?? 0).toString(), numeric: true },
        { label: 'عدد المرتجعات', value: (report?.totalReturned || 0).toString(), numeric: true },
        { label: 'عدد السائقين', value: summary.length.toString(), numeric: true },
        { label: 'المبلغ المستحق', value: formatIQD(grandDue) + ' د.ع', numeric: true }
    ], y, font);
    y += 46;

    drawSectionTitle(doc, 'ملخص حسب السائق', y, font);
    y += 22;

    // ملخص السائقين: 7 أعمدة
    const sumCols = [
        { width: 150, label: 'اسم السائق' },
        { width: 75, label: 'عدد الطلبات' },
        { width: 75, label: 'عدد المرتجعات' },
        { width: 110, label: 'إجمالي الفواتير' },
        { width: 110, label: 'أجور التوصيل' },
        { width: 110, label: 'المبلغ النهائي' },
        { width: 110, label: 'المبلغ المستحق' }
    ];

    y += drawTableHead(doc, sumCols, y, font);

    summary.forEach(s => {
        const driverOrders = (s?.orders || []).filter(o => !isOrderReturned(o));
        const sInvoice = driverOrders.reduce((a, o) => a + (o.AmountIQD || 0), 0);
        const sDelivery = driverOrders.reduce((a, o) => a + getDriverDeliveryAmount(o), 0);
        const sNet = driverOrders.reduce((a, o) => a + (o.TotalIQD || 0), 0);
        const sDue = driverOrders.reduce((a, o) => a + getAmountDue(o), 0);
        const sumNumericCols = [1, 2, 3, 4, 5, 6];
        const sumRowH = drawTableRow(doc, sumCols, [
            s.driverName,
            s.count.toString(),
            (s.countReturned || 0).toString(),
            formatIQD(sInvoice),
            formatIQD(sDelivery),
            formatIQD(sNet),
            formatIQD(sDue)
        ], y, false, font, null, false, sumNumericCols);
        y += sumRowH;
    });

    y += 18;
    drawSectionTitle(doc, 'تفاصيل الطلبات', y, font);
    y += 18;

    const detCols = [
        { width: 36, label: 'الحالة' },
        { width: 42, label: 'رقم الطلب' },
        { width: 50, label: 'رقم الشحنة' },
        { width: 50, label: 'السائق' },
        { width: 44, label: 'المتجر' },
        { width: 44, label: 'المستلم' },
        { width: 44, label: 'الهاتف' },
        { width: 82, label: 'العنوان' },
        { width: 44, label: 'فاتورة' },
        { width: 44, label: 'توصيل' },
        { width: 46, label: 'النهائي' },
        { width: 46, label: 'المستحق' },
        { width: 26, label: 'سداد' },
        { width: 32, label: 'طباعة' },
        { width: 36, label: 'استلام' },
        { width: 38, label: 'أنشأه' },
        { width: 48, label: 'ملاحظات' },
        { width: 42, label: 'سبب الإرجاع' }
    ];
    const wrap = (s, n) => (s || '-').toString().slice(0, n);
    const BOTTOM_MARGIN = 85;

    y += drawTableHead(doc, detCols, y, font, true);

    const receiveTxtCompany = (o) => isOrderReturned(o) ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';
    allOrders.forEach((o, i) => {
        const statusTxt = STATUS_LABELS[o.Status || o.status] || (o.Status || o.status) || '-';
        const driverAmt = getDriverDeliveryAmount(o);
        const due = getAmountDue(o);
        const cells = [
            statusTxt,
            wrap(o.AdminOrderNo, 10),
            wrap(o.ShipmentNumber, 14),
            wrap(o.DriverName || 'غير معين', 18),
            wrap(o.StoreName, 18),
            wrap(o.CustomerName, 16),
            wrap(o.CustomerPhone, 10),
            wrap(getFullAddress(o), 45),
            formatIQD(o.AmountIQD),
            o.FreeDelivery ? txt('مجاني') + ' ' + formatIQD(driverAmt) : formatIQD(driverAmt),
            formatIQD(o.TotalIQD),
            formatIQD(due),
            o.FeesCollected ? 'تم' : '-',
            o.LabelPrinted ? 'تم' : '-',
            receiveTxtCompany(o),
            wrap(o.CreatedByName, 14),
            wrap(o.Notes, 24),
            isOrderReturned(o) ? wrap((o.ReturnReason || '').trim() || '-', 22) : '-'
        ];
        const detNumericCols = [1, 2, 6, 8, 9, 10, 11];
        const detRowH = getTableRowHeight(doc, detCols, cells, font, null, detNumericCols);
        if (y + detRowH > PAGE_HEIGHT - BOTTOM_MARGIN) {
            drawFooter(doc, font);
            doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
            doc.font(font);
            drawHeader(doc, 'التقرير العام', 'شركة ديما الحياة', font);
            y = 58;
            y += drawTableHead(doc, detCols, y, font, true);
        }
        const returned = isOrderReturned(o);
        drawTableRow(doc, detCols, cells, y, i % 2 === 1, font, null, returned, detNumericCols);
        y += detRowH;
    });

    y += 12;
    if (y + 120 > PAGE_HEIGHT - 25) {
        drawFooter(doc, font);
        doc.addPage({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
        doc.font(font);
        drawHeader(doc, 'التقرير العام', 'شركة ديما الحياة', font);
        y = 58;
    }
    y = drawDeliveryFeeStats(doc, report, y, font);
    drawSummary(doc, [
        { label: 'إجمالي الطلبات', value: report.totalOrders.toString(), numeric: true },
        { label: 'إجمالي الفواتير', value: formatIQD(grandInvoice) + ' د.ع', numeric: true },
        { label: 'أجور التوصيل', value: formatIQD(grandDelivery) + ' د.ع', numeric: true },
        { label: 'المبلغ النهائي', value: formatIQD(grandTotal) + ' د.ع', numeric: true },
        { label: 'المبلغ المستحق', value: formatIQD(grandDue) + ' د.ع', numeric: true }
    ], y, font);

    drawFooter(doc, font);
    doc.end();
    return bufferPromise;
}

// ─── جلب البيانات ───
function getDriverDailyReport(driverId, date) {
    return getDriverReportByRange(driverId, date, date);
}

function getDriverReportByRange(driverId, dateFrom, dateTo) {
    const db_ = db.getDatabase();
    const driver = db_.prepare('SELECT * FROM Drivers WHERE DriverID = ?').get(driverId);
    if (!driver) return null;
    const dTo = dateTo || dateFrom;
    const orders = db_.prepare(`
        SELECT o.OrderID, o.AdminOrderNo, o.ShipmentNumber, o.StoreName, o.StorePhone,
               o.CustomerName, o.CustomerPhone, o.Address, o.RegionID, r.RegionName, r.RegionArea,
               o.Pieces, o.AmountIQD,
               o.DeliveryFeeIQD, o.FreeDelivery, o.WaivedDeliveryIQD, o.TotalIQD,
               o.Notes, o.DriverID, o.CreatedDate, o.DeliveredDate, COALESCE(o.LabelPrinted, 0) AS LabelPrinted,
               COALESCE(o.ReturnedOrderReceived, 0) AS ReturnedOrderReceived,
               u.DisplayName AS CreatedByName,
               CASE WHEN LOWER(TRIM(o.Status)) IN ('canceled','returned') OR o.Status LIKE '%ملغي%' OR o.Status LIKE '%راجع%'
                    OR o.Status IN ('RejectedByCustomer','Returned','ملغي','Canceled') THEN 'Returned'
                    ELSE COALESCE(o.Status, 'New') END AS Status
        FROM Orders o
        LEFT JOIN AppUsers u ON o.CreatedByUserID = u.UserID
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
        WHERE (o.DriverID = ? OR o.ReturnedByDriverID = ?) AND date(o.CreatedDate) >= date(?) AND date(o.CreatedDate) <= date(?)
        ORDER BY o.OrderID
    `).all(driverId, driverId, dateFrom, dTo);
    feeCollectionService.markOrdersWithFeesCollected(orders);
    const validOrders = orders.filter(o => !isOrderReturned(o));
    const countReturned = orders.filter(o => isOrderReturned(o)).length;
    const totalAmount = validOrders.reduce((s, o) => s + (o.AmountIQD || 0), 0);
    const totalDelivery = validOrders.reduce((s, o) => s + getDriverDeliveryAmount(o), 0);
    const net = validOrders.reduce((s, o) => s + (o.TotalIQD || 0), 0);
    /* المبلغ المستحق الكلي = إجمالي المبلغ النهائي - إجمالي أجور التوصيل (مطابق للتقرير العام والملخص) */
    const totalDue = validOrders.reduce((s, o) => s + getAmountDue(o), 0);
    const countFreeDelivery = validOrders.filter(o => o.FreeDelivery).length;
    const countPaidDelivery = validOrders.filter(o => !o.FreeDelivery).length;
    const deliveryFeeBreakdown = {};
    validOrders.filter(o => !o.FreeDelivery).forEach(o => {
        const fee = Math.round(o.DeliveryFeeIQD || 0);
        deliveryFeeBreakdown[fee] = (deliveryFeeBreakdown[fee] || 0) + 1;
    });
    const freeDeliveryBreakdown = {};
    validOrders.filter(o => o.FreeDelivery).forEach(o => {
        const waived = Math.round(o.WaivedDeliveryIQD || 0);
        freeDeliveryBreakdown[waived] = (freeDeliveryBreakdown[waived] || 0) + 1;
    });
    const dateStr = dateFrom === dTo ? dateFrom : dateFrom + ' إلى ' + dTo;
    const countKarkh = validOrders.filter(o => (o.RegionArea || '') === 'الكرخ').length;
    const countRusafa = validOrders.filter(o => (o.RegionArea || '') === 'الرصافة').length;
    const returnedOrders = orders.filter(o => isOrderReturned(o));
    const hasUnreceivedReturned = returnedOrders.some(o => !(o.ReturnedOrderReceived));
    return {
        driver,
        date: dateStr,
        dateFrom,
        dateTo: dTo,
        orders,
        count: validOrders.length,
        countReturned,
        hasUnreceivedReturned,
        countKarkh,
        countRusafa,
        totalAmount,
        totalDelivery,
        net,
        totalDue,
        countFreeDelivery,
        countPaidDelivery,
        deliveryFeeBreakdown,
        freeDeliveryBreakdown
    };
}

function getCompanyDailyReport(date) {
    return getCompanyReportByRange(date, date);
}

function getCompanyReportByRange(dateFrom, dateTo) {
    const db_ = db.getDatabase();
    const dTo = dateTo || dateFrom;
    const raw = db_.prepare(`
        SELECT o.OrderID, o.AdminOrderNo, o.ShipmentNumber, o.StoreName, o.StorePhone,
               o.CustomerName, o.CustomerPhone, o.Address, o.RegionID, r.RegionName, r.RegionArea,
               o.Pieces, o.AmountIQD,
               o.DeliveryFeeIQD, o.FreeDelivery, o.WaivedDeliveryIQD, o.TotalIQD,
               o.Notes, o.ReturnReason, o.DriverID, o.CreatedDate, o.DeliveredDate,
               COALESCE(d.DriverName, rd.DriverName) AS DriverName,
               u.DisplayName AS CreatedByName,
               COALESCE(o.LabelPrinted, 0) AS LabelPrinted,
               COALESCE(o.ReturnedOrderReceived, 0) AS ReturnedOrderReceived,
               CASE WHEN LOWER(TRIM(o.Status)) IN ('canceled','returned') OR o.Status LIKE '%ملغي%' OR o.Status LIKE '%راجع%'
                    OR o.Status IN ('RejectedByCustomer','Returned','ملغي','Canceled') THEN 'Returned'
                    ELSE COALESCE(o.Status, 'New') END AS Status
        FROM Orders o
        LEFT JOIN Drivers d ON o.DriverID = d.DriverID
        LEFT JOIN Drivers rd ON o.ReturnedByDriverID = rd.DriverID
        LEFT JOIN AppUsers u ON o.CreatedByUserID = u.UserID
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
        WHERE date(o.CreatedDate) >= date(?) AND date(o.CreatedDate) <= date(?)
        ORDER BY COALESCE(d.DriverName, rd.DriverName), o.OrderID
    `).all(dateFrom, dTo);
    feeCollectionService.markOrdersWithFeesCollected(raw);
    const orders = raw;
    const byDriver = {};
    for (const o of orders) {
        const key = o.DriverID || 0;
        const name = o.DriverName || 'غير معين';
        if (!byDriver[key]) byDriver[key] = { driverName: name, orders: [], count: 0 };
        byDriver[key].orders.push(o);
        byDriver[key].count++;
    }
    const summary = Object.values(byDriver);
    for (const s of summary) {
        const valid = s.orders.filter(o => !isOrderReturned(o));
        s.countReturned = s.orders.filter(o => isOrderReturned(o)).length;
        s.totalAmount = valid.reduce((a, o) => a + (o.AmountIQD || 0), 0);
        s.totalDelivery = valid.reduce((a, o) => a + getDriverDeliveryAmount(o), 0);
        s.net = valid.reduce((a, o) => a + (o.TotalIQD || 0), 0);
        s.totalDue = valid.reduce((a, o) => a + getAmountDue(o), 0);
        s.count = valid.length;
    }
    const validAll = orders.filter(o => !isOrderReturned(o));
    const totalReturned = orders.filter(o => isOrderReturned(o)).length;
    const countFreeDelivery = validAll.filter(o => o.FreeDelivery).length;
    const countPaidDelivery = validAll.filter(o => !o.FreeDelivery).length;
    const countKarkh = validAll.filter(o => (o.RegionArea || '') === 'الكرخ').length;
    const countRusafa = validAll.filter(o => (o.RegionArea || '') === 'الرصافة').length;
    const deliveryFeeBreakdown = {};
    validAll.filter(o => !o.FreeDelivery).forEach(o => {
        const fee = Math.round(o.DeliveryFeeIQD || 0);
        deliveryFeeBreakdown[fee] = (deliveryFeeBreakdown[fee] || 0) + 1;
    });
    const freeDeliveryBreakdown = {};
    validAll.filter(o => o.FreeDelivery).forEach(o => {
        const waived = Math.round(o.WaivedDeliveryIQD || 0);
        freeDeliveryBreakdown[waived] = (freeDeliveryBreakdown[waived] || 0) + 1;
    });
    const dateStr = dateFrom === dTo ? dateFrom : dateFrom + ' إلى ' + dTo;
    return {
        date: dateStr,
        dateFrom,
        dateTo: dTo,
        summary,
        totalOrders: validAll.length,
        totalReturned,
        countFreeDelivery,
        countPaidDelivery,
        deliveryFeeBreakdown,
        freeDeliveryBreakdown
    };
}

function getDailySummaryReport(driverIds, dateFrom, dateTo) {
    const db_ = db.getDatabase();
    const dTo = dateTo || dateFrom;
    let sql = `
        SELECT o.OrderID, o.DriverID, date(o.CreatedDate) AS OrderDate,
               o.AmountIQD, o.DeliveryFeeIQD, o.FreeDelivery, o.WaivedDeliveryIQD, o.TotalIQD,
               d.DriverName,
               CASE WHEN LOWER(TRIM(o.Status)) IN ('canceled','returned') OR o.Status LIKE '%ملغي%' OR o.Status LIKE '%راجع%'
                    OR o.Status IN ('RejectedByCustomer','Returned','ملغي','Canceled') THEN 'Returned'
                    ELSE COALESCE(o.Status, 'New') END AS Status
        FROM Orders o
        LEFT JOIN Drivers d ON o.DriverID = d.DriverID
        WHERE date(o.CreatedDate) >= date(?) AND date(o.CreatedDate) <= date(?)
    `;
    const params = [dateFrom, dTo];
    if (driverIds && driverIds.length > 0) {
        sql += ` AND o.DriverID IN (${driverIds.map(() => '?').join(',')})`;
        params.push(...driverIds.map(id => parseInt(id)));
    }
    sql += ' ORDER BY d.DriverName, OrderDate';
    const orders = db_.prepare(sql).all(...params);
    const byKey = {};
    for (const o of orders) {
        const dateStr = (o.OrderDate || '').toString().slice(0, 10);
        const driverId = o.DriverID || 0;
        const driverName = o.DriverName || 'غير معين';
        const key = `${driverId}:${dateStr}`;
        if (!byKey[key]) {
            byKey[key] = {
                driverId,
                driverName,
                orderDate: dateStr,
                orders: [],
                count: 0,
                countReturned: 0,
                totalAmount: 0,
                totalDelivery: 0,
                net: 0,
                totalDue: 0,
                countFreeDelivery: 0,
                countPaidDelivery: 0,
                deliveryFeeBreakdown: {},
                freeDeliveryBreakdown: {}
            };
        }
        const rec = byKey[key];
        rec.orders.push(o);
        if (isOrderReturned(o)) {
            rec.countReturned++;
        } else {
            rec.count++;
            rec.totalAmount += o.AmountIQD || 0;
            rec.totalDelivery += getDriverDeliveryAmount(o);
            rec.net += o.TotalIQD || 0;
            rec.totalDue += getAmountDue(o);
            if (o.FreeDelivery) {
                rec.countFreeDelivery++;
                const waived = Math.round(o.WaivedDeliveryIQD || 0);
                rec.freeDeliveryBreakdown[waived] = (rec.freeDeliveryBreakdown[waived] || 0) + 1;
            } else {
                rec.countPaidDelivery++;
                const fee = Math.round(o.DeliveryFeeIQD || 0);
                rec.deliveryFeeBreakdown[fee] = (rec.deliveryFeeBreakdown[fee] || 0) + 1;
            }
        }
    }
    const rows = Object.values(byKey);
    for (const r of rows) {
        r.feesCollected = feeCollectionService.isFeesCollected(r.driverId, r.orderDate);
    }
    return {
        dateFrom,
        dateTo: dTo,
        rows: rows.map(r => ({
            driverId: r.driverId,
            driverName: r.driverName,
            orderDate: r.orderDate,
            count: r.count,
            countReturned: r.countReturned,
            totalAmount: r.totalAmount,
            totalDelivery: r.totalDelivery,
            net: r.net,
            totalDue: r.totalDue,
            feesCollected: r.feesCollected,
            countFreeDelivery: r.countFreeDelivery,
            countPaidDelivery: r.countPaidDelivery,
            deliveryFeeBreakdown: r.deliveryFeeBreakdown,
            freeDeliveryBreakdown: r.freeDeliveryBreakdown
        }))
    };
}

module.exports = {
    getDriverDailyReport,
    getDriverReportByRange,
    getCompanyDailyReport,
    getCompanyReportByRange,
    getDailySummaryReport,
    generateDriverReportPDF,
    generateCompanyReportPDF,
    generateDailySummaryReportPDF
};
