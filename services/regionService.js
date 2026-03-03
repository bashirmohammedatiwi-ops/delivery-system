const db = require('../database/init');

function getAllRegions() {
    const database = db.getDatabase();
    return database.prepare(
        'SELECT RegionID, RegionName, DeliveryFeeIQD FROM Regions ORDER BY RegionName'
    ).all();
}

function getRegionById(regionId) {
    const database = db.getDatabase();
    return database.prepare('SELECT * FROM Regions WHERE RegionID = ?').get(regionId);
}

function createRegion(regionName, deliveryFeeIQD) {
    const database = db.getDatabase();
    const name = (regionName || '').trim();
    if (!name) return { success: false, error: 'اسم المنطقة مطلوب' };

    const existing = database.prepare('SELECT RegionID FROM Regions WHERE RegionName = ?').get(name);
    if (existing) return { success: false, error: 'اسم المنطقة مستخدم مسبقاً' };

    const fee = parseFloat(deliveryFeeIQD) || 0;
    database.prepare('INSERT INTO Regions (RegionName, DeliveryFeeIQD) VALUES (?, ?)')
        .run(name, fee);

    const region = database.prepare('SELECT RegionID, RegionName, DeliveryFeeIQD FROM Regions WHERE RegionName = ?').get(name);
    return { success: true, region };
}

function updateRegion(regionId, regionName, deliveryFeeIQD) {
    const database = db.getDatabase();
    const region = getRegionById(regionId);
    if (!region) return { success: false, error: 'المنطقة غير موجودة' };

    const name = (regionName || '').trim();
    if (!name) return { success: false, error: 'اسم المنطقة مطلوب' };

    const existing = database.prepare('SELECT RegionID FROM Regions WHERE RegionName = ? AND RegionID != ?').get(name, regionId);
    if (existing) return { success: false, error: 'اسم المنطقة مستخدم مسبقاً' };

    const fee = parseFloat(deliveryFeeIQD) || 0;
    database.prepare('UPDATE Regions SET RegionName = ?, DeliveryFeeIQD = ? WHERE RegionID = ?')
        .run(name, fee, regionId);

    return { success: true, region: getRegionById(regionId) };
}

function deleteRegion(regionId) {
    const database = db.getDatabase();
    const region = getRegionById(regionId);
    if (!region) return { success: false, error: 'المنطقة غير موجودة' };

    const ordersUsing = database.prepare('SELECT COUNT(*) as c FROM Orders WHERE RegionID = ?').get(regionId);
    if (ordersUsing && ordersUsing.c > 0) {
        return { success: false, error: 'لا يمكن الحذف - توجد طلبات مرتبطة بهذه المنطقة' };
    }

    database.prepare('DELETE FROM Regions WHERE RegionID = ?').run(regionId);
    return { success: true };
}

module.exports = {
    getAllRegions,
    getRegionById,
    createRegion,
    updateRegion,
    deleteRegion
};
