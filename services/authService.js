const crypto = require('crypto');
const db = require('../database/init');

const TOKEN_EXPIRY_DAYS = 30;

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function generatePassword(length = 8) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < length; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
}

function generateUsername(driverName) {
    const base = (driverName || 'driver')
        .replace(/\s+/g, '')
        .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 8) || 'driver';
    const suffix = Math.random().toString(36).slice(2, 6);
    return base + suffix;
}

function createDriverAccount(driverId, usernameOverride = null, passwordOverride = null) {
    const database = db.getDatabase();
    const driver = database.prepare('SELECT * FROM Drivers WHERE DriverID = ?').get(driverId);
    if (!driver) return { success: false, error: 'السائق غير موجود' };

    let username = usernameOverride ? usernameOverride.trim().toLowerCase() : null;
    if (!username) username = driver.Username || generateUsername(driver.DriverName);

    const existing = database.prepare('SELECT DriverID FROM Drivers WHERE Username = ? AND DriverID != ?').get(username, driverId);
    if (existing) return { success: false, error: 'اسم المستخدم مستخدم لسائق آخر' };

    const p = passwordOverride != null ? String(passwordOverride).trim() : '';
    if (!p) return { success: false, error: 'كلمة السر مطلوبة' };
    const password = p;
    const passwordHash = hashPassword(password);

    database.prepare('UPDATE Drivers SET Username = ?, PasswordHash = ?, StoredPassword = ? WHERE DriverID = ?')
        .run(username, passwordHash, password, driverId);

    return {
        success: true,
        username,
        password,
        driver: { ...driver, Username: username }
    };
}

function verifyDriverCredentials(username, password) {
    const database = db.getDatabase();
    const driver = database.prepare('SELECT * FROM Drivers WHERE Username = ? AND Active = 1').get((username || '').trim().toLowerCase());
    if (!driver) return null;

    const hash = hashPassword(password);
    if (driver.PasswordHash !== hash) return null;

    return driver;
}

function createSession(driverId) {
    const database = db.getDatabase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);
    const expiresStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    database.prepare('INSERT INTO DriverSessions (Token, DriverID, ExpiresAt) VALUES (?, ?, ?)')
        .run(token, driverId, expiresStr);

    return token;
}

function getDriverByToken(token) {
    if (!token) return null;
    const database = db.getDatabase();
    database.prepare("DELETE FROM DriverSessions WHERE ExpiresAt < datetime('now')").run();
    const row = database.prepare('SELECT d.* FROM Drivers d JOIN DriverSessions s ON d.DriverID = s.DriverID WHERE s.Token = ?').get(token);
    return row || null;
}

function logoutDriver(token) {
    if (!token) return;
    const database = db.getDatabase();
    database.prepare('DELETE FROM DriverSessions WHERE Token = ?').run(token);
}

module.exports = {
    hashPassword,
    generatePassword,
    generateUsername,
    createDriverAccount,
    verifyDriverCredentials,
    createSession,
    getDriverByToken,
    logoutDriver
};
