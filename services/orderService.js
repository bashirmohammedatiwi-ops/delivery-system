const db = require('../database/init');

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
            Address, RegionID, Pieces, AmountIQD, DeliveryFeeIQD, FreeDelivery, WaivedDeliveryIQD, TotalIQD, Notes, Status, CreatedByUserID)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?)
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
        createdByUserID
    );

    return getOrderByShipmentNumber(shipmentNumber);
}

function getOrderByShipmentNumber(shipmentNumber) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT o.*, d.DriverName, u.DisplayName AS CreatedByName, r.RegionName 
         FROM Orders o LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
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

    return { success: true, order };
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
    let sql = `SELECT o.*, d.DriverName, u.DisplayName AS CreatedByName, r.RegionName 
               FROM Orders o LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
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

    sql += ` ORDER BY o.OrderID DESC`;
    if (filters.limit) sql += ` LIMIT ${Math.min(parseInt(filters.limit) || 1000, 5000)}`;

    const stmt = database.prepare(sql);
    return stmt.all(...params);
}

function updateOrderStatus(orderId, status, deliveredDate = null) {
    const database = db.getDatabase();
    let dateVal = deliveredDate;
    if (status === 'Delivered' && !deliveredDate) {
        dateVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    database.prepare('UPDATE Orders SET Status = ?, DeliveredDate = ? WHERE OrderID = ?')
        .run(status, dateVal, orderId);
}

function getOrderById(orderId) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT o.*, d.DriverName, u.DisplayName AS CreatedByName, r.RegionName 
         FROM Orders o LEFT JOIN Drivers d ON o.DriverID = d.DriverID 
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

    database.prepare(`
        UPDATE Orders SET
            AdminOrderNo = ?, StoreName = ?, StorePhone = ?, CustomerName = ?, CustomerPhone = ?,
            Address = ?, RegionID = ?, Pieces = ?, AmountIQD = ?, DeliveryFeeIQD = ?, FreeDelivery = ?,
            WaivedDeliveryIQD = ?, TotalIQD = ?, Notes = ?, Status = ?
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
        newStatus,
        orderId
    );

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

module.exports = {
    createOrder,
    getOrderByShipmentNumber,
    assignOrderToDriver,
    returnOrderFromDriver,
    getOrders,
    updateOrderStatus,
    getOrderById,
    updateOrder,
    deleteOrder,
    markLabelPrinted
};
