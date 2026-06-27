/**
 * إشعارات التوصيل المجاني اليدوي
 * عندما يضع موظف توصيل مجاني على طلب أقل من 50000
 */
const db = require('../database/init');

const FREE_DELIVERY_THRESHOLD = 50000;

function createNotification(orderId, performedByUserID, performedByName) {
    const database = db.getDatabase();
    database.prepare(
        `INSERT INTO FreeDeliveryOverrideNotifications (OrderID, PerformedByUserID, PerformedByName, Reviewed)
         VALUES (?, ?, ?, 0)`
    ).run(orderId, performedByUserID, performedByName || null);
}

function getUnreviewedNotifications() {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT n.*, o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
                o.StoreName, o.Address, o.Notes, o.AmountIQD, o.WaivedDeliveryIQD,
                o.TotalIQD, o.CreatedDate
         FROM FreeDeliveryOverrideNotifications n
         JOIN Orders o ON n.OrderID = o.OrderID
         WHERE n.Reviewed = 0
         ORDER BY n.CreatedAt DESC`
    ).all();
}

function getAllNotifications(limit = 50) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT n.*, o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
                o.StoreName, o.Address, o.Notes, o.AmountIQD, o.WaivedDeliveryIQD,
                o.TotalIQD, o.CreatedDate
         FROM FreeDeliveryOverrideNotifications n
         JOIN Orders o ON n.OrderID = o.OrderID
         ORDER BY n.CreatedAt DESC
         LIMIT ?`
    ).all(limit);
}

function markAsReviewed(notificationId) {
    const database = db.getDatabase();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    database.prepare(
        'UPDATE FreeDeliveryOverrideNotifications SET Reviewed = 1, ReviewedAt = ? WHERE NotificationID = ?'
    ).run(now, notificationId);
    return true;
}

function getUnreviewedCount() {
    const database = db.getDatabase();
    const r = database.prepare('SELECT COUNT(*) as c FROM FreeDeliveryOverrideNotifications WHERE Reviewed = 0').get();
    return (r && r.c) || 0;
}

function maybeCreateNotification(order, performedByUserID, performedByName, isEmployee) {
    if (!isEmployee) return;
    const amt = Number(order.AmountIQD ?? order.amountiqd) || 0;
    const free = !!(order.FreeDelivery ?? order.freedelivery);
    // إشعار فقط: توصيل مجاني يدوي على فاتورة أقل من 50,000 (المجاني التلقائي ≥ 50000 لا يُشعر)
    if (!free || amt >= FREE_DELIVERY_THRESHOLD) return;
    const database = db.getDatabase();
    const orderId = order.OrderID ?? order.orderid;
    if (orderId == null) return;
    const existing = database.prepare(
        'SELECT NotificationID FROM FreeDeliveryOverrideNotifications WHERE OrderID = ? AND Reviewed = 0'
    ).get(orderId);
    if (existing) return;
    createNotification(orderId, performedByUserID, performedByName);
}

module.exports = {
    createNotification,
    getUnreviewedNotifications,
    getAllNotifications,
    markAsReviewed,
    getUnreviewedCount,
    maybeCreateNotification,
    FREE_DELIVERY_THRESHOLD
};
