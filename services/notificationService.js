/**
 * إشعارات التوصيل المجاني اليدوي
 * عندما يضع موظف توصيل مجاني على طلب أقل من 50000
 */
const db = require('../database/init');

const FREE_DELIVERY_THRESHOLD = 50000;

function pickOrderNotes(order) {
    const raw = order?.Notes ?? order?.notes ?? '';
    const trimmed = String(raw).trim();
    return trimmed || null;
}

function createNotification(orderId, performedByUserID, performedByName, orderNotes) {
    const database = db.getDatabase();
    database.prepare(
        `INSERT INTO FreeDeliveryOverrideNotifications (OrderID, PerformedByUserID, PerformedByName, OrderNotes, Reviewed)
         VALUES (?, ?, ?, ?, 0)`
    ).run(orderId, performedByUserID, performedByName || null, orderNotes || null);
}

function getUnreviewedNotifications() {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT n.NotificationID, n.OrderID, n.PerformedByUserID, n.PerformedByName,
                n.OrderNotes, n.CreatedAt, n.Reviewed, n.ReviewedAt,
                o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
                o.StoreName, o.Address,
                COALESCE(NULLIF(TRIM(o.Notes), ''), NULLIF(TRIM(n.OrderNotes), '')) AS Notes,
                o.AmountIQD, o.WaivedDeliveryIQD, o.TotalIQD, o.CreatedDate
         FROM FreeDeliveryOverrideNotifications n
         JOIN Orders o ON n.OrderID = o.OrderID
         WHERE n.Reviewed = 0
         ORDER BY n.CreatedAt DESC`
    ).all();
}

function getAllNotifications(limit = 50) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT n.NotificationID, n.OrderID, n.PerformedByUserID, n.PerformedByName,
                n.OrderNotes, n.CreatedAt, n.Reviewed, n.ReviewedAt,
                o.ShipmentNumber, o.AdminOrderNo, o.CustomerName, o.CustomerPhone,
                o.StoreName, o.Address,
                COALESCE(NULLIF(TRIM(o.Notes), ''), NULLIF(TRIM(n.OrderNotes), '')) AS Notes,
                o.AmountIQD, o.WaivedDeliveryIQD, o.TotalIQD, o.CreatedDate
         FROM FreeDeliveryOverrideNotifications n
         JOIN Orders o ON n.OrderID = o.OrderID
         ORDER BY n.CreatedAt DESC
         LIMIT ?`
    ).all(limit);
}

function syncOrderNotesForOrder(orderId, orderNotes) {
    const notes = orderNotes != null ? String(orderNotes).trim() : '';
    if (!orderId) return;
    const database = db.getDatabase();
    database.prepare(
        `UPDATE FreeDeliveryOverrideNotifications
         SET OrderNotes = ?
         WHERE OrderID = ? AND Reviewed = 0`
    ).run(notes || null, orderId);
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
    const notes = pickOrderNotes(order);
    if (existing) {
        syncOrderNotesForOrder(orderId, notes || '');
        return;
    }
    createNotification(orderId, performedByUserID, performedByName, notes);
}

module.exports = {
    createNotification,
    getUnreviewedNotifications,
    getAllNotifications,
    markAsReviewed,
    getUnreviewedCount,
    maybeCreateNotification,
    syncOrderNotesForOrder,
    pickOrderNotes,
    FREE_DELIVERY_THRESHOLD
};
