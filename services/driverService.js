const db = require('../database/init');

function getAllDrivers(activeOnly = true, includePasswords = false) {
    const database = db.getDatabase();
    const cols = includePasswords ? 'DriverID, DriverName, Phone, Active, Username, StoredPassword' : 'DriverID, DriverName, Phone, Active, Username';
    let sql = `SELECT ${cols} FROM Drivers WHERE 1=1`;
    if (activeOnly) sql += ' AND Active = 1';
    sql += ' ORDER BY DriverName';
    return database.prepare(sql).all();
}

function getDriverById(id) {
    const database = db.getDatabase();
    return database.prepare('SELECT * FROM Drivers WHERE DriverID = ?').get(id);
}

function createDriver(name, phone) {
    const database = db.getDatabase();
    const stmt = database.prepare('INSERT INTO Drivers (DriverName, Phone) VALUES (?, ?)');
    stmt.run(name, phone);
}

function updateDriver(id, name, phone, active) {
    const database = db.getDatabase();
    database.prepare('UPDATE Drivers SET DriverName = ?, Phone = ?, Active = ? WHERE DriverID = ?')
        .run(name, phone, active ? 1 : 0, id);
}

function getDriverByPassword(password) {
    if (!password || !String(password).trim()) return null;
    const database = db.getDatabase();
    const p = String(password).trim();
    return database.prepare('SELECT * FROM Drivers WHERE StoredPassword = ? AND Active = 1').get(p) || null;
}

function deleteDriver(id) {
    const database = db.getDatabase();
    database.prepare('UPDATE Orders SET DriverID = NULL, Status = ? WHERE DriverID = ?').run('New', id);
    database.prepare('DELETE FROM OrderTracking WHERE DriverID = ?').run(id);
    database.prepare('DELETE FROM Drivers WHERE DriverID = ?').run(id);
}

module.exports = {
    getAllDrivers,
    getDriverById,
    getDriverByPassword,
    createDriver,
    updateDriver,
    deleteDriver
};
