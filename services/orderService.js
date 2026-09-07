const db = require('../database/index');

/** تاريخ ووقت محلي لضمان تطابق مع توقيت السائق (بدلاً من UTC) */
function getLocalDateTimeStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

// رقم الشحنة: أرقام فقط (سنة+شهر+ترتيب) مثل 2603000014
function generateShipmentNumber() {
    const database = db.getDatabase();
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const result = database.prepare(
        `SELECT OrderID FROM Orders ORDER BY OrderID DESC LIMIT 1`
    ).get();
    const nextId = (result ? result.OrderID : 0) + 1;
    return `${year}${month}${String(nextId).padStart(6, '0')}`;
}

function createOrder(orderData) {
    const database = db.getDatabase();
    const shipmentNumber = generateShipmentNumber();

    const amountIQD = orderData.AmountIQD || 0;
    let deliveryFeeIQD = orderData.DeliveryFeeIQD || 0;
    const freeDelivery = !!(orderData.FreeDelivery);
    let waivedDeliveryIQD = 0;

    if (freeDelivery) {
        waivedDeliveryIQD = deliveryFeeIQD;
        deliveryFeeIQD = 0;
    }

    const totalIQD = freeDelivery ? amountIQD : (amountIQD + deliveryFeeIQD);

    const createdByUserID = orderData.CreatedByUserID != null ? parseInt(orderData.CreatedByUserID) : null;
    const regionId = orderData.RegionID != null ? parseInt(orderData.RegionID) : null;

    const stmt = database.prepare(`
        INSERT INTO Orders (AdminOrderNo, ShipmentNumber, StoreName, StorePhone, CustomerName, CustomerPhone, 
            Address, RegionID, Pieces, AmountIQD, DeliveryFeeIQD, FreeDelivery, WaivedDeliveryIQD, TotalIQD, Notes, CustomerLocationLink, Status, CreatedByUserID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?)
    `);

    stmt.run(
        (orderData.AdminOrderNo || '').trim() || null,
        shipmentNumber,
        orderData.StoreName || '',
        orderData.StorePhone || '',
        orderData.CustomerName || '',
        orderData.CustomerPhone || '',
        (orderData.Address || '').trim(),
        regionId,
        orderData.Pieces || 1,
        amountIQD,
        deliveryFeeIQD,
        freeDelivery ? 1 : 0,
        waivedDeliveryIQD,
        totalIQD,
        orderData.Notes || '',
        (orderData.CustomerLocationLink || '').trim() || null,
        createdByUserID
    );

    return getOrderByShipmentNumber(shipmentNumber);
}

function getOrderByShipmentNumber(shipmentNumber) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT o.*,
                 COALESCE(d.DriverName, rd.DriverName) AS DriverName,
                 u.DisplayName AS CreatedByName,
                 r.RegionName 
         FROM Orders o
         LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
         LEFT JOIN Drivers rd ON o.ReturnedByDriverID = rd.DriverID 
         LEFT JOIN AppUsers u ON o.CreatedByUserID = u.UserID 
         LEFT JOIN Regions r ON o.RegionID = r.RegionID 
         WHERE o.ShipmentNumber = ?`
    ).get(shipmentNumber.trim());
}

function assignOrderToDriver(shipmentNumber, driverId) {
    const database = db.getDatabase();
    const order = getOrderByShipmentNumber(shipmentNumber);
    if (!order) return { success: false, error: 'الطلب غير موجود' };

    const status = String(order.Status || '').trim();
    const existingDriverId = (order.DriverID != null && order.DriverID !== '') ? parseInt(order.DriverID) : null;
    const targetDriverId = parseInt(driverId, 10);

    if (status === 'Delivered') {
        return { success: false, error: 'تم توصيل الطلب سابقاً' };
    }
    // منع التعيين إن كان الطلب مع أي سائق (التحقق من DriverID أولاً لأنه أوثق)
    if (existingDriverId && !isNaN(existingDriverId)) {
        if (existingDriverId !== targetDriverId) {
            const otherDriver = order.DriverName || 'سائق آخر';
            return { success: false, error: `الطلب عند سائق آخر: ${otherDriver}` };
        }
        return { success: false, error: 'الطلب استلمه هذا السائق سابقاً' };
    }
    if (status === 'AssignedToDriver') {
        return { success: false, error: 'الطلب مع سائق ولا يمكن تعيينه مرة ثانية' };
    }

    database.prepare('UPDATE Orders SET DriverID = ?, Status = ? WHERE OrderID = ?')
        .run(driverId, 'AssignedToDriver', order.OrderID);

    database.prepare('INSERT INTO OrderTracking (OrderID, DriverID) VALUES (?, ?)')
        .run(order.OrderID, driverId);

    return { success: true, order: getOrderById(order.OrderID) };
}

function returnOrderFromDriver(shipmentNumber) {
    const database = db.getDatabase();
    const order = getOrderByShipmentNumber(shipmentNumber);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    if (order.Status !== 'AssignedToDriver') return { success: false, error: 'الطلب ليس مع سائق حالياً' };

    database.prepare('UPDATE Orders SET DriverID = NULL, Status = ? WHERE OrderID = ?')
        .run('New', order.OrderID);

    return { success: true, order: { ...order, DriverID: null, Status: 'New' } };
}

function getOrders(filters = {}) {
    const database = db.getDatabase();
    let sql = `SELECT o.*,
                       COALESCE(d.DriverName, rd.DriverName) AS DriverName,
                       u.DisplayName AS CreatedByName,
                       r.RegionName, r.RegionArea 
               FROM Orders o 
               LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
               LEFT JOIN Drivers rd ON o.ReturnedByDriverID = rd.DriverID 
               LEFT JOIN AppUsers u ON o.CreatedByUserID = u.UserID 
               LEFT JOIN Regions r ON o.RegionID = r.RegionID 
               WHERE 1=1`;
    const params = [];

    if (filters.search) {
        sql += ` AND (o.ShipmentNumber LIKE ? OR o.CustomerPhone LIKE ? OR o.StoreName LIKE ? OR o.AdminOrderNo LIKE ?)`;
        const s = `%${filters.search}%`;
        params.push(s, s, s, s);
    }
    if (filters.driverId) {
        sql += ` AND o.DriverID = ?`;
        params.push(filters.driverId);
    }
    if (filters.status) {
        sql += ` AND o.Status = ?`;
        params.push(filters.status);
    }
    if (filters.dateFrom) {
        sql += ` AND date(o.CreatedDate) >= date(?)`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        sql += ` AND date(o.CreatedDate) <= date(?)`;
        params.push(filters.dateTo);
    }
    if (filters.deferredOnly) {
        sql += ` AND COALESCE(o.IsDeferred, 0) = 1`;
    }

    sql += ` ORDER BY o.OrderID DESC`;
    const limitVal = filters.limit != null && filters.limit !== ''
        ? Math.min(parseInt(filters.limit, 10) || 1000, 5000)
        : 1000;
    sql += ` LIMIT ${limitVal}`;

    const stmt = database.prepare(sql);
    return stmt.all(...params);
}

/** قائمة خفيفة لتطبيق الموظف — أعمدة أقل بدون joins غير ضرورية */
function getOrdersList(filters = {}) {
    const database = db.getDatabase();
    let sql = `SELECT o.OrderID, o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
                      o.Address, o.Status, o.TotalIQD, o.AmountIQD, o.DeliveryFeeIQD, o.FreeDelivery,
                      o.WaivedDeliveryIQD, o.LabelPrinted, o.CreatedDate, o.StoreName, o.StorePhone,
                      o.RegionID, o.Pieces, o.Notes,
                      r.RegionName
               FROM Orders o
               LEFT JOIN Regions r ON o.RegionID = r.RegionID
               WHERE 1=1`;
    const params = [];

    if (filters.search) {
        sql += ` AND (o.ShipmentNumber LIKE ? OR o.CustomerPhone LIKE ? OR o.CustomerName LIKE ? OR o.Address LIKE ? OR o.StoreName LIKE ? OR o.AdminOrderNo LIKE ?)`;
        const s = `%${filters.search}%`;
        params.push(s, s, s, s, s, s);
    }
    if (filters.driverId) {
        sql += ` AND o.DriverID = ?`;
        params.push(filters.driverId);
    }
    if (filters.status) {
        sql += ` AND o.Status = ?`;
        params.push(filters.status);
    }
    if (filters.dateFrom) {
        sql += ` AND date(o.CreatedDate) >= date(?)`;
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        sql += ` AND date(o.CreatedDate) <= date(?)`;
        params.push(filters.dateTo);
    }

    sql += ` ORDER BY o.OrderID DESC`;
    if (filters.limit) sql += ` LIMIT ${Math.min(parseInt(filters.limit) || 1000, 5000)}`;

    return database.prepare(sql).all(...params);
}

function updateOrderStatus(orderId, status, deliveredDate = null) {
    const database = db.getDatabase();
    const order = database.prepare('SELECT DriverID FROM Orders WHERE OrderID = ?').get(orderId);
    let dateVal = deliveredDate;
    if (status === 'Delivered' && !deliveredDate) {
        dateVal = getLocalDateTimeStr();
    }
    if ((status === 'Returned' || status === 'راجع') && order && (order.DriverID != null && order.DriverID !== '')) {
        const now = getLocalDateTimeStr();
        /* عدم مسح DriverID ليبقى الطلب مرتبطاً بالسائق ويظهر في المراجع — تعيين ReturnedByDriverID للمساعدة */
        database.prepare('UPDATE Orders SET Status = ?, ReturnedDate = ?, ReturnedByDriverID = ? WHERE OrderID = ?')
            .run('Returned', now, order.DriverID, orderId);
    } else {
        database.prepare('UPDATE Orders SET Status = ?, DeliveredDate = ? WHERE OrderID = ?')
            .run(status, dateVal, orderId);
    }
}

function getOrderById(orderId) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT o.*,
                 COALESCE(d.DriverName, rd.DriverName) AS DriverName,
                 u.DisplayName AS CreatedByName,
                 r.RegionName 
         FROM Orders o
         LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
         LEFT JOIN Drivers rd ON o.ReturnedByDriverID = rd.DriverID 
         LEFT JOIN AppUsers u ON o.CreatedByUserID = u.UserID 
         LEFT JOIN Regions r ON o.RegionID = r.RegionID 
         WHERE o.OrderID = ?`
    ).get(orderId);
}

function updateOrder(orderId, orderData) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return null;

    const amountIQD = orderData.AmountIQD ?? order.AmountIQD ?? 0;
    let deliveryFeeIQD = orderData.DeliveryFeeIQD ?? order.DeliveryFeeIQD ?? 0;
    const freeDelivery = !!(orderData.FreeDelivery ?? order.FreeDelivery);
    let waivedDeliveryIQD = 0;

    if (freeDelivery) {
        waivedDeliveryIQD = deliveryFeeIQD;
        deliveryFeeIQD = 0;
    }
    const totalIQD = freeDelivery ? amountIQD : (amountIQD + deliveryFeeIQD);

    const validStatuses = ['New', 'AssignedToDriver', 'Delivered', 'Returned'];
    const newStatus = orderData.Status != null && validStatuses.includes(orderData.Status) ? orderData.Status : order.Status;

    const regionId = orderData.RegionID != null ? parseInt(orderData.RegionID) : (order.RegionID != null ? order.RegionID : null);
    const createdDateVal = orderData.CreatedDate != null ? String(orderData.CreatedDate).trim() : null;
    const createdDateFinal = createdDateVal === '' ? null : createdDateVal;

    database.prepare(`
        UPDATE Orders SET
            AdminOrderNo = ?, StoreName = ?, StorePhone = ?, CustomerName = ?, CustomerPhone = ?,
            Address = ?, RegionID = ?, Pieces = ?, AmountIQD = ?, DeliveryFeeIQD = ?, FreeDelivery = ?,
            WaivedDeliveryIQD = ?, TotalIQD = ?, Notes = ?, CustomerLocationLink = ?, Status = ?
            , CreatedDate = COALESCE(?, CreatedDate)
        WHERE OrderID = ?
    `).run(
        (orderData.AdminOrderNo ?? order.AdminOrderNo ?? '').trim() || null,
        orderData.StoreName ?? order.StoreName ?? '',
        orderData.StorePhone ?? order.StorePhone ?? '',
        orderData.CustomerName ?? order.CustomerName ?? '',
        orderData.CustomerPhone ?? order.CustomerPhone ?? '',
        (orderData.Address ?? order.Address ?? '').trim(),
        regionId,
        orderData.Pieces ?? order.Pieces ?? 1,
        amountIQD,
        deliveryFeeIQD,
        freeDelivery ? 1 : 0,
        waivedDeliveryIQD,
        totalIQD,
        orderData.Notes ?? order.Notes ?? '',
        (orderData.CustomerLocationLink ?? order.CustomerLocationLink ?? '').toString().trim() || null,
        newStatus,
        createdDateFinal,
        orderId
    );

    /* عند تغيير الحالة إلى راجع من نافذة التعديل: تعيين ReturnedByDriverID لظهور الطلب للسائق (بدون مسح DriverID) */
    if ((newStatus === 'Returned' || newStatus === 'راجع') && (order.DriverID != null && order.DriverID !== '')) {
        const now = getLocalDateTimeStr();
        database.prepare('UPDATE Orders SET ReturnedByDriverID = ?, ReturnedDate = ? WHERE OrderID = ?')
            .run(order.DriverID, now, orderId);
    }

    return getOrderById(orderId);
}

function deleteOrder(orderId) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };

    database.prepare('DELETE FROM OrderTracking WHERE OrderID = ?').run(orderId);
    database.prepare('DELETE FROM Orders WHERE OrderID = ?').run(orderId);

    return { success: true };
}

function markLabelPrinted(orderId) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return false;
    database.prepare('UPDATE Orders SET LabelPrinted = 1 WHERE OrderID = ?').run(orderId);
    return true;
}

function markDeliveredByDriver(orderId, driverId) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    if (parseInt(order.DriverID) !== parseInt(driverId)) return { success: false, error: 'الطلب ليس معك' };
    if (order.Status === 'Delivered') return { success: false, error: 'تم توصيل الطلب سابقاً' };
    if (order.Status !== 'AssignedToDriver') return { success: false, error: 'الطلب ليس مع سائق حالياً' };

    const now = getLocalDateTimeStr();
    database.prepare('UPDATE Orders SET Status = ?, DeliveredDate = ?, IsDeferred = 0, DeferredReason = NULL, DeferredDate = NULL WHERE OrderID = ?')
        .run('Delivered', now, orderId);
    return { success: true, order: getOrderById(orderId) };
}

function markReturnedByDriver(orderId, driverId, returnReason = '') {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    if (parseInt(order.DriverID) !== parseInt(driverId)) return { success: false, error: 'الطلب ليس معك' };
    if (order.Status === 'Delivered') return { success: false, error: 'تم توصيل الطلب - لا يمكن إرجاعه' };
    if (order.Status !== 'AssignedToDriver') return { success: false, error: 'الطلب ليس مع سائق حالياً' };

    const now = getLocalDateTimeStr();
    database.prepare('UPDATE Orders SET Status = ?, ReturnReason = ?, ReturnedDate = ?, ReturnedByDriverID = ?, DriverID = NULL, IsDeferred = 0, DeferredReason = NULL, DeferredDate = NULL WHERE OrderID = ?')
        .run('Returned', (returnReason || '').trim() || null, now, driverId, orderId);
    return { success: true, order: getOrderById(orderId) };
}

function markDeferredByDriver(orderId, driverId, deferredReason = '') {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    if (parseInt(order.DriverID) !== parseInt(driverId)) return { success: false, error: 'الطلب ليس معك' };
    if (order.Status !== 'AssignedToDriver') return { success: false, error: 'الطلب ليس مع سائق حالياً' };

    const reason = String(deferredReason || '').trim();
    if (!reason) return { success: false, error: 'سبب التأجيل مطلوب' };

    const now = getLocalDateTimeStr();
    database.prepare(
        'UPDATE Orders SET IsDeferred = 1, DeferredReason = ?, DeferredDate = ? WHERE OrderID = ?'
    ).run(reason, now, orderId);
    invalidateDashboardStatsCache();
    return { success: true, order: getOrderById(orderId) };
}

function resumeDeferredByDriver(orderId, driverId) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    if (parseInt(order.DriverID) !== parseInt(driverId)) return { success: false, error: 'الطلب ليس معك' };
    if (!order.IsDeferred) return { success: false, error: 'الطلب غير مؤجل' };

    database.prepare(
        'UPDATE Orders SET IsDeferred = 0, DeferredReason = NULL, DeferredDate = NULL WHERE OrderID = ?'
    ).run(orderId);
    return { success: true, order: getOrderById(orderId) };
}

function getDriverDeferredOrders(driverId) {
    return getOrders({ driverId, status: 'AssignedToDriver', deferredOnly: true });
}

/* المبلغ المستحق = المبلغ النهائي - أجرة التوصيل */
function getAmountDue(order) {
    const total = Number(order.TotalIQD ?? 0) || 0;
    const free = !!(order.FreeDelivery);
    const deliveryAmt = free ? (Number(order.WaivedDeliveryIQD ?? 0) || 0) : (Number(order.DeliveryFeeIQD ?? 0) || 0);
    return total - deliveryAmt;
}

/* العرض حسب تاريخ الطلب (CreatedDate) */
function getDriverStats(driverId, date) {
    const database = db.getDatabase();
    const d = date || new Date().toISOString().slice(0, 10);
    const delivered = database.prepare(
        `SELECT COUNT(*) as c FROM Orders WHERE DriverID = ? AND Status = 'Delivered' AND date(CreatedDate) = date(?)`
    ).get(driverId, d);
    /* المراجع: حسب تاريخ الإنشاء فقط (ليس تاريخ الإرجاع) */
    const returned = database.prepare(
        `SELECT COUNT(*) as c FROM Orders WHERE date(CreatedDate) = date(?) AND (
            (ReturnedByDriverID = ? AND (Status = 'Returned' OR LOWER(TRIM(COALESCE(Status,''))) IN ('returned','راجع','canceled','ملغي')))
            OR (DriverID = ? AND Status = 'Returned')
        )`
    ).get(d, driverId, driverId);
    const assigned = database.prepare(
        `SELECT COUNT(*) as c FROM Orders WHERE DriverID = ? AND Status = 'AssignedToDriver'`
    ).get(driverId);
    const notDelivered = database.prepare(
        `SELECT COUNT(*) as c FROM Orders WHERE DriverID = ? AND Status = 'AssignedToDriver' AND date(CreatedDate) = date(?)`
    ).get(driverId, d);
    const ordersForDay = database.prepare(
        `SELECT TotalIQD, AmountIQD, DeliveryFeeIQD, WaivedDeliveryIQD, FreeDelivery, Status 
         FROM Orders WHERE (
             (Status = 'Delivered' AND DriverID = ? AND date(CreatedDate) = date(?))
             OR ((Status = 'Returned' OR LOWER(TRIM(COALESCE(Status,''))) IN ('returned','راجع','canceled','ملغي')) 
                 AND date(CreatedDate) = date(?) AND (ReturnedByDriverID = ? OR DriverID = ?))
         )`
    ).all(driverId, d, d, driverId, driverId);

    let totalDeliveredIQD = 0;
    let totalReturnedIQD = 0;
    let totalAmountDue = 0;

    for (const o of ordersForDay) {
        const totalIQD = Number(o.TotalIQD) || 0;
        const status = String(o.Status ?? o.status ?? '').trim();
        if (status === 'Delivered') {
            totalDeliveredIQD += totalIQD;
            totalAmountDue += getAmountDue(o);
        } else if (status === 'Returned' || /راجع|returned|canceled|ملغي/i.test(status)) {
            totalReturnedIQD += totalIQD;
        }
    }

    totalAmountDue = Math.round(totalAmountDue * 100) / 100;

    const deliveredCount = (delivered && delivered.c) || 0;
    const returnedCount = (returned && returned.c) || 0;
    const notDeliveredCount = (notDelivered && notDelivered.c) || 0;
    return {
        date: d,
        delivered: deliveredCount,
        returned: returnedCount,
        assigned: (assigned && assigned.c) || 0,
        notDelivered: notDeliveredCount,
        orderCount: deliveredCount + returnedCount + notDeliveredCount,
        totalDeliveredIQD,
        totalReturnedIQD,
        totalAmountDue
    };
}

/* طلبات موصّلة — حسب تاريخ الطلب */
function getDriverDeliveredOrders(driverId, date) {
    const database = db.getDatabase();
    const d = date || new Date().toISOString().slice(0, 10);
    return database.prepare(
        `SELECT o.*, d.DriverName, r.RegionName 
         FROM Orders o LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
         LEFT JOIN Regions r ON o.RegionID = r.RegionID 
         WHERE o.DriverID = ? AND o.Status = 'Delivered' AND date(o.CreatedDate) = date(?)
         ORDER BY o.CreatedDate DESC, o.DeliveredDate DESC`
    ).all(driverId, d);
}

/* طلبات مرتجعة — حسب تاريخ الإنشاء فقط (ليس تاريخ الإرجاع) */
function getDriverReturnedOrders(driverId, date) {
    const database = db.getDatabase();
    const d = date || new Date().toISOString().slice(0, 10);
    return database.prepare(
        `SELECT o.*, COALESCE(rd.DriverName, dr.DriverName) AS DriverName, r.RegionName 
         FROM Orders o 
         LEFT JOIN Drivers rd ON o.ReturnedByDriverID = rd.DriverID 
         LEFT JOIN Drivers dr ON o.DriverID = dr.DriverID 
         LEFT JOIN Regions r ON o.RegionID = r.RegionID 
         WHERE date(o.CreatedDate) = date(?) AND (
             (o.ReturnedByDriverID = ? AND (o.Status = 'Returned' OR LOWER(TRIM(COALESCE(o.Status,''))) IN ('returned','راجع','canceled','ملغي')))
             OR (o.DriverID = ? AND o.Status = 'Returned')
         )
         ORDER BY o.CreatedDate DESC, o.ReturnedDate DESC`
    ).all(d, driverId, driverId);
}

function getPendingOrdersByArea(dateFrom, dateTo) {
    const database = db.getDatabase();
    const dTo = dateTo || dateFrom;
    const rows = database.prepare(`
        SELECT date(o.CreatedDate) AS orderDate,
               SUM(CASE WHEN COALESCE(r.RegionArea, 'الرصافة') = 'الكرخ' THEN 1 ELSE 0 END) AS countKarkh,
               SUM(CASE WHEN COALESCE(r.RegionArea, 'الرصافة') = 'الرصافة' THEN 1 ELSE 0 END) AS countRusafa
        FROM Orders o
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
        WHERE o.Status = 'New' AND date(o.CreatedDate) >= date(?) AND date(o.CreatedDate) <= date(?)
        GROUP BY date(o.CreatedDate)
        ORDER BY orderDate DESC
    `).all(dateFrom, dTo);
    return rows;
}

function getPendingOrdersList(date, regionArea) {
    const database = db.getDatabase();
    const d = date || new Date().toISOString().slice(0, 10);
    const area = String(regionArea || '').trim();
    if (!area || !['الكرخ', 'الرصافة'].includes(area)) return [];
    return database.prepare(
        `SELECT o.*, r.RegionName, COALESCE(r.RegionArea, 'الرصافة') AS RegionArea
         FROM Orders o
         LEFT JOIN Regions r ON o.RegionID = r.RegionID
         WHERE o.Status = 'New' AND date(o.CreatedDate) = date(?)
           AND COALESCE(r.RegionArea, 'الرصافة') = ?
         ORDER BY o.CreatedDate ASC, o.OrderID ASC`
    ).all(d, area);
}

function markReturnedOrderReceived(orderId) {
    const database = db.getDatabase();
    const order = getOrderById(orderId);
    if (!order) return { success: false, error: 'الطلب غير موجود' };
    const s = String(order.Status || '').trim();
    if (s !== 'Returned') return { success: false, error: 'الطلب ليس راجعاً - لا يمكن استلامه' };

    const now = getLocalDateTimeStr();
    database.prepare('UPDATE Orders SET ReturnedOrderReceived = 1, ReturnedOrderReceivedAt = ? WHERE OrderID = ?')
        .run(now, orderId);
    return { success: true, order: getOrderById(orderId) };
}

function getCustomerPhoneStats(customerPhone) {
    const database = db.getDatabase();
    const digits = String(customerPhone || '').replace(/\D/g, '');
    if (!digits) return { deliveredCount: 0, returnedCount: 0 };
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    const row = database.prepare(`
        SELECT
            SUM(CASE WHEN o.Status = 'Delivered' THEN 1 ELSE 0 END) AS deliveredCount,
            SUM(CASE WHEN o.Status = 'Returned' OR o.Status IN ('Canceled','ملغي','RejectedByCustomer')
                OR LOWER(TRIM(o.Status)) IN ('canceled','returned') THEN 1 ELSE 0 END) AS returnedCount
        FROM Orders o
        WHERE o.CustomerPhone IS NOT NULL AND TRIM(o.CustomerPhone) != ''
          AND (
            REPLACE(REPLACE(REPLACE(o.CustomerPhone, ' ', ''), '-', ''), '+', '') LIKE ?
            OR REPLACE(REPLACE(REPLACE(o.CustomerPhone, ' ', ''), '-', ''), '+', '') LIKE ?
          )
    `).get(`%${last10}`, `%${digits}`);

    return {
        deliveredCount: Number(row?.deliveredCount || 0),
        returnedCount: Number(row?.returnedCount || 0)
    };
}

/** آخر طلب لنفس الهاتف — لتعبئة العنوان والمنطقة تلقائياً */
function getCustomerLookupByPhone(customerPhone) {
    const database = db.getDatabase();
    const digits = String(customerPhone || '').replace(/\D/g, '');
    if (!digits || digits.length < 10) return { found: false };
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    const row = database.prepare(`
        SELECT o.CustomerName, o.Address, o.RegionID, o.CustomerLocationLink,
               r.RegionName, r.RegionArea, r.DeliveryFeeIQD
        FROM Orders o
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
        WHERE o.CustomerPhone IS NOT NULL AND TRIM(o.CustomerPhone) != ''
          AND (
            REPLACE(REPLACE(REPLACE(o.CustomerPhone, ' ', ''), '-', ''), '+', '') LIKE ?
            OR REPLACE(REPLACE(REPLACE(o.CustomerPhone, ' ', ''), '-', ''), '+', '') LIKE ?
          )
        ORDER BY o.OrderID DESC
        LIMIT 1
    `).get(`%${last10}`, `%${digits}`);

    if (!row) return { found: false };

    return {
        found: true,
        customerName: row.CustomerName || '',
        address: row.Address || '',
        regionId: row.RegionID || null,
        regionName: row.RegionName || '',
        regionArea: row.RegionArea || '',
        deliveryFeeIQD: row.DeliveryFeeIQD || 0,
        customerLocationLink: row.CustomerLocationLink || ''
    };
}

let dashboardStatsCache = { key: '', data: null, ts: 0 };
const DASHBOARD_STATS_CACHE_MS = 30000;

function nextDayIso(isoDate) {
    const d = new Date(isoDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function invalidateDashboardStatsCache() {
    dashboardStatsCache = { key: '', data: null, ts: 0 };
}

function getDashboardStats(today) {
    const cacheKey = String(today || '');
    const now = Date.now();
    if (dashboardStatsCache.key === cacheKey && dashboardStatsCache.data && now - dashboardStatsCache.ts < DASHBOARD_STATS_CACHE_MS) {
        return dashboardStatsCache.data;
    }

    const database = db.getDatabase();
    const dayStart = `${cacheKey} 00:00:00`;
    const dayEnd = `${nextDayIso(cacheKey)} 00:00:00`;
    const row = database.prepare(`
        SELECT
            COUNT(*) AS totalOrders,
            SUM(CASE WHEN o.Status = 'New' THEN 1 ELSE 0 END) AS newCount,
            SUM(CASE WHEN o.Status = 'AssignedToDriver' THEN 1 ELSE 0 END) AS assignedCount,
            SUM(CASE WHEN o.Status = 'Delivered' THEN 1 ELSE 0 END) AS deliveredCount,
            SUM(CASE WHEN o.Status = 'Returned' THEN 1 ELSE 0 END) AS returnedCount,
            SUM(CASE WHEN o.CreatedDate >= ? AND o.CreatedDate < ? THEN 1 ELSE 0 END) AS todayCount,
            SUM(CASE WHEN o.CreatedDate >= ? AND o.CreatedDate < ?
                AND TRIM(COALESCE(r.RegionArea, '')) = 'الكرخ' THEN 1 ELSE 0 END) AS todayKarkh,
            SUM(CASE WHEN o.CreatedDate >= ? AND o.CreatedDate < ?
                AND TRIM(COALESCE(r.RegionArea, 'الرصافة')) = 'الرصافة' THEN 1 ELSE 0 END) AS todayRusafa,
            SUM(CASE WHEN o.CreatedDate >= ? AND o.CreatedDate < ?
                AND COALESCE(o.LabelPrinted, 0) = 0 THEN 1 ELSE 0 END) AS todayUnprinted
        FROM Orders o
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
    `).get(dayStart, dayEnd, dayStart, dayEnd, dayStart, dayEnd, dayStart, dayEnd);

    const result = {
        totalOrders: Number(row?.totalOrders || 0),
        newCount: Number(row?.newCount || 0),
        assignedCount: Number(row?.assignedCount || 0),
        deliveredCount: Number(row?.deliveredCount || 0),
        returnedCount: Number(row?.returnedCount || 0),
        todayCount: Number(row?.todayCount || 0),
        todayKarkh: Number(row?.todayKarkh || 0),
        todayRusafa: Number(row?.todayRusafa || 0),
        todayUnprinted: Number(row?.todayUnprinted || 0),
        today: cacheKey
    };
    dashboardStatsCache = { key: cacheKey, data: result, ts: now };
    return result;
}

function getDashboardRecentOrders(today, limit = 6) {
    const cacheKey = String(today || '');
    const dayStart = `${cacheKey} 00:00:00`;
    const dayEnd = `${nextDayIso(cacheKey)} 00:00:00`;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 12);
    const database = db.getDatabase();
    return database.prepare(`
        SELECT o.OrderID, o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
               o.Status, o.TotalIQD, o.AmountIQD, o.LabelPrinted, o.CreatedDate,
               r.RegionName, r.RegionArea,
               COALESCE(d.DriverName, '') AS DriverName
        FROM Orders o
        LEFT JOIN Regions r ON o.RegionID = r.RegionID
        LEFT JOIN Drivers d ON o.DriverID = d.DriverID
        WHERE o.CreatedDate >= ? AND o.CreatedDate < ?
        ORDER BY o.OrderID DESC
        LIMIT ?
    `).all(dayStart, dayEnd, lim);
}

module.exports = {
    createOrder,
    getOrderByShipmentNumber,
    assignOrderToDriver,
    returnOrderFromDriver,
    getOrders,
    getOrdersList,
    updateOrderStatus,
    getOrderById,
    updateOrder,
    deleteOrder,
    markLabelPrinted,
    markDeliveredByDriver,
    markReturnedByDriver,
    markDeferredByDriver,
    resumeDeferredByDriver,
    getDriverDeferredOrders,
    getDriverStats,
    getDriverDeliveredOrders,
    getDriverReturnedOrders,
    markReturnedOrderReceived,
    getCustomerPhoneStats,
    getCustomerLookupByPhone,
    getDashboardStats,
    getDashboardRecentOrders,
    invalidateDashboardStatsCache,
    getPendingOrdersByArea,
    getPendingOrdersList
};
