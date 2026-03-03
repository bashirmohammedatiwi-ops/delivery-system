const crypto = require('crypto');
const db = require('../database/init');

const TOKEN_EXPIRY_DAYS = 7;
const ROLES = { admin: 'admin', employee: 'employee' };

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function verifyCredentials(username, password) {
    const database = db.getDatabase();
    const user = database.prepare('SELECT * FROM AppUsers WHERE Username = ? AND Active = 1')
        .get((username || '').trim().toLowerCase());
    if (!user) return null;

    const hash = hashPassword(password);
    if (user.PasswordHash !== hash) return null;

    const { PasswordHash, ...safe } = user;
    return safe;
}

function createSession(userId) {
    const database = db.getDatabase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);
    const expiresStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    database.prepare('INSERT INTO UserSessions (Token, UserID, ExpiresAt) VALUES (?, ?, ?)')
        .run(token, userId, expiresStr);

    return token;
}

function getUserByToken(token) {
    if (!token) return null;
    const database = db.getDatabase();
    database.prepare("DELETE FROM UserSessions WHERE ExpiresAt < datetime('now')").run();
    const row = database.prepare(
        'SELECT u.UserID, u.Username, u.DisplayName, u.Role, u.Active FROM AppUsers u JOIN UserSessions s ON u.UserID = s.UserID WHERE s.Token = ? AND u.Active = 1'
    ).get(token);
    return row || null;
}

function logoutUser(token) {
    if (!token) return;
    const database = db.getDatabase();
    database.prepare('DELETE FROM UserSessions WHERE Token = ?').run(token);
}

function getAllUsers() {
    const database = db.getDatabase();
    const rows = database.prepare(
        'SELECT UserID, Username, DisplayName, Role, Active, CreatedAt FROM AppUsers ORDER BY UserID'
    ).all();
    return rows.map(u => ({ ...u, RoleLabel: u.Role === 'admin' ? 'مدير' : 'موظف' }));
}

function getUserById(userId) {
    const database = db.getDatabase();
    return database.prepare(
        'SELECT UserID, Username, DisplayName, Role, Active, CreatedAt FROM AppUsers WHERE UserID = ?'
    ).get(userId);
}

function createUser(username, password, displayName, role) {
    const database = db.getDatabase();
    const un = (username || '').trim().toLowerCase();
    const pw = (password || '').trim();
    if (!un) return { success: false, error: 'اسم المستخدم مطلوب' };
    if (!pw) return { success: false, error: 'كلمة السر مطلوبة' };
    if (role !== 'admin' && role !== 'employee') return { success: false, error: 'الدور غير صالح' };

    const existing = database.prepare('SELECT UserID FROM AppUsers WHERE Username = ?').get(un);
    if (existing) return { success: false, error: 'اسم المستخدم مستخدم مسبقاً' };

    const hash = hashPassword(pw);
    database.prepare(
        'INSERT INTO AppUsers (Username, PasswordHash, DisplayName, Role, Active) VALUES (?, ?, ?, ?, 1)'
    ).run(un, hash, (displayName || un).trim(), role);

    const user = database.prepare('SELECT UserID, Username, DisplayName, Role, Active, CreatedAt FROM AppUsers WHERE Username = ?').get(un);
    return { success: true, user };
}

function updateUser(userId, data) {
    const database = db.getDatabase();
    const user = getUserById(userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود' };

    const displayName = data.displayName != null ? String(data.displayName).trim() : user.DisplayName;
    const role = data.role === 'admin' || data.role === 'employee' ? data.role : user.Role;
    const active = data.active !== undefined ? (data.active ? 1 : 0) : (user.Active ? 1 : 0);

    let sql = 'UPDATE AppUsers SET DisplayName = ?, Role = ?, Active = ?';
    const params = [displayName, role, active];

    if (data.password && String(data.password).trim()) {
        sql += ', PasswordHash = ?';
        params.push(hashPassword(String(data.password).trim()));
    }
    sql += ' WHERE UserID = ?';
    params.push(userId);

    database.prepare(sql).run(...params);
    return { success: true, user: getUserById(userId) };
}

function deleteUser(userId) {
    const database = db.getDatabase();
    const user = getUserById(userId);
    if (!user) return { success: false, error: 'المستخدم غير موجود' };
    database.prepare('DELETE FROM UserSessions WHERE UserID = ?').run(userId);
    database.prepare('DELETE FROM AppUsers WHERE UserID = ?').run(userId);
    return { success: true };
}

function ensureDefaultAdmin() {
    const database = db.getDatabase();
    const count = database.prepare('SELECT COUNT(*) as c FROM AppUsers').get();
    if (count && count.c > 0) return;
    const hash = hashPassword('admin');
    database.prepare(
        'INSERT INTO AppUsers (Username, PasswordHash, DisplayName, Role, Active) VALUES (?, ?, ?, ?, 1)'
    ).run('admin', hash, 'المدير', 'admin');
}

function getDisplayName(userId) {
    if (!userId) return '-';
    const database = db.getDatabase();
    const u = database.prepare('SELECT DisplayName, Username FROM AppUsers WHERE UserID = ?').get(userId);
    return u ? (u.DisplayName || u.Username) : '-';
}

module.exports = {
    ROLES,
    hashPassword,
    verifyCredentials,
    createSession,
    getUserByToken,
    logoutUser,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    ensureDefaultAdmin,
    getDisplayName
};
