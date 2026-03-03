const db = require('../database/init');

function recordCollection(driverId, orderDate, collectedByUserID) {
    const database = db.getDatabase();
    const d = parseInt(driverId);
    const dateStr = String(orderDate || '').trim();
    if (!d || !dateStr) throw new Error('رقم السائق والتاريخ مطلوبان');
    try {
        database.prepare(
            `INSERT INTO DriverFeeCollections (DriverID, OrderDate, CollectedByUserID) VALUES (?, ?, ?)`
        ).run(d, dateStr, collectedByUserID || null);
        return { success: true };
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return { success: true, alreadyRecorded: true };
        }
        throw err;
    }
}

function isFeesCollected(driverId, orderDate) {
    if (!driverId || !orderDate) return false;
    const database = db.getDatabase();
    const orderDateStr = String(orderDate).slice(0, 10);
    const row = database.prepare(
        `SELECT 1 FROM DriverFeeCollections WHERE DriverID = ? AND OrderDate = ?`
    ).get(parseInt(driverId), orderDateStr);
    return !!row;
}

function getCollectedDatesForDriver(driverId) {
    const database = db.getDatabase();
    return database.prepare(
        `SELECT OrderDate, CollectedAt FROM DriverFeeCollections WHERE DriverID = ? ORDER BY OrderDate DESC`
    ).all(parseInt(driverId));
}

function markOrdersWithFeesCollected(orders) {
    const collected = new Set();
    const db_ = db.getDatabase();
    for (const o of orders) {
        const driverId = o.DriverID;
        const orderDate = (o.CreatedDate || '').toString().slice(0, 10);
        if (!driverId || !orderDate) {
            o.FeesCollected = false;
            continue;
        }
        const key = `${driverId}:${orderDate}`;
        if (collected.has(key)) {
            o.FeesCollected = true;
            continue;
        }
        const row = db_.prepare(
            `SELECT 1 FROM DriverFeeCollections WHERE DriverID = ? AND OrderDate = ?`
        ).get(parseInt(driverId), orderDate);
        o.FeesCollected = !!row;
        if (row) collected.add(key);
    }
    return orders;
}

module.exports = {
    recordCollection,
    isFeesCollected,
    getCollectedDatesForDriver,
    markOrdersWithFeesCollected
};
