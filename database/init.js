const path = require('path');
const fs = require('fs');

let _dbPath = null;
let db = null;
let nativeDb = null;
let SQL = null;

function getDbPath() {
    if (!_dbPath) {
        _dbPath = path.join(__dirname, '..', 'data', 'delivery.db');
    }
    return _dbPath;
}

function saveDb() {
    if (!nativeDb || !_dbPath) return;
    try {
        const data = nativeDb.export();
        const buffer = Buffer.from(data);
        const dbDir = path.dirname(_dbPath);
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        fs.writeFileSync(_dbPath, buffer);
    } catch (e) {
        console.error('DB save error:', e);
    }
}

function createStatement(sql) {
    return {
        get: (...params) => {
            const stmt = nativeDb.prepare(sql);
            try {
                if (params.length > 0) stmt.bind(params);
                if (stmt.step()) return stmt.getAsObject();
                return undefined;
            } finally {
                stmt.free();
            }
        },
        all: (...params) => {
            const stmt = nativeDb.prepare(sql);
            const rows = [];
            try {
                if (params.length > 0) stmt.bind(params);
                while (stmt.step()) rows.push(stmt.getAsObject());
                return rows;
            } finally {
                stmt.free();
            }
        },
        run: (...params) => {
            const stmt = nativeDb.prepare(sql);
            try {
                if (params.length > 0) stmt.bind(params);
                stmt.step();
            } finally {
                stmt.free();
            }
            saveDb();
        }
    };
}

function createDbWrapper() {
    return {
        prepare: (sql) => createStatement(sql),
        exec: (sql) => {
            nativeDb.exec(sql);
            saveDb();
        },
        pragma: (p) => {
            nativeDb.run(p);
        }
    };
}

async function initSqlJs() {
    const initSqlJs = require('sql.js');
    return initSqlJs();
}

function getDatabase() {
    if (!db) throw new Error('Database not initialized. Call initSchema first.');
    return db;
}

async function initSchema() {
    if (db) return;
    if (!SQL) SQL = await initSqlJs();

    const dbPath = getDbPath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        nativeDb = new SQL.Database(buffer);
    } else {
        nativeDb = new SQL.Database();
    }

    db = createDbWrapper();
    db.pragma('PRAGMA journal_mode = WAL');
    db.pragma('PRAGMA synchronous = NORMAL');
    db.pragma('PRAGMA cache_size = 10000');
    db.pragma('PRAGMA temp_store = MEMORY');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    nativeDb.exec(schema);

    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN AdminOrderNo TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN FreeDelivery INTEGER DEFAULT 0'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN WaivedDeliveryIQD REAL DEFAULT 0'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Drivers ADD COLUMN Username TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Drivers ADD COLUMN PasswordHash TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Drivers ADD COLUMN StoredPassword TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_username ON Drivers(Username)'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN LabelPrinted INTEGER DEFAULT 0'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN CreatedByUserID INTEGER'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN RegionID INTEGER'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN ReturnReason TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN ReturnedDate TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN ReturnedByDriverID INTEGER'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN ReturnedOrderReceived INTEGER DEFAULT 0'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN ReturnedOrderReceivedAt TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run("ALTER TABLE Regions ADD COLUMN RegionArea TEXT DEFAULT 'الرصافة'"); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE Orders ADD COLUMN CustomerLocationLink TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE AppUsers ADD COLUMN SecretCode TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_appusers_secretcode ON AppUsers(SecretCode) WHERE SecretCode IS NOT NULL AND SecretCode != \'\''); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE AppUsers ADD COLUMN StoreName TEXT'); saveDb(); } catch (e) {}
    try { nativeDb.run('ALTER TABLE AppUsers ADD COLUMN StorePhone TEXT'); saveDb(); } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS FreeDeliveryOverrideNotifications (
            NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
            OrderID INTEGER NOT NULL,
            PerformedByUserID INTEGER,
            PerformedByName TEXT,
            OrderNotes TEXT,
            CreatedAt TEXT DEFAULT (datetime('now', 'localtime')),
            Reviewed INTEGER DEFAULT 0,
            ReviewedAt TEXT,
            FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
        )`);
        saveDb();
    } catch (e) {}
    try { nativeDb.run('ALTER TABLE FreeDeliveryOverrideNotifications ADD COLUMN OrderNotes TEXT'); saveDb(); } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS AppSettings (
            SettingKey TEXT PRIMARY KEY,
            SettingValue TEXT
        )`);
        saveDb();
    } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS Regions (
            RegionID INTEGER PRIMARY KEY AUTOINCREMENT,
            RegionName TEXT NOT NULL UNIQUE,
            DeliveryFeeIQD REAL DEFAULT 0
        )`);
        saveDb();
    } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS AppUsers (
            UserID INTEGER PRIMARY KEY AUTOINCREMENT,
            Username TEXT UNIQUE NOT NULL,
            PasswordHash TEXT NOT NULL,
            DisplayName TEXT,
            Role TEXT DEFAULT 'employee' CHECK(Role IN ('admin','employee')),
            Active INTEGER DEFAULT 1,
            CreatedAt TEXT DEFAULT (datetime('now', 'localtime'))
        )`);
        saveDb();
    } catch (e) {}
    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS UserSessions (
            Token TEXT PRIMARY KEY,
            UserID INTEGER NOT NULL,
            CreatedAt TEXT DEFAULT (datetime('now', 'localtime')),
            ExpiresAt TEXT NOT NULL,
            FOREIGN KEY (UserID) REFERENCES AppUsers(UserID)
        )`);
        saveDb();
    } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS DriverFeeCollections (
            CollectionID INTEGER PRIMARY KEY AUTOINCREMENT,
            DriverID INTEGER NOT NULL,
            OrderDate TEXT NOT NULL,
            CollectedAt TEXT DEFAULT (datetime('now', 'localtime')),
            CollectedByUserID INTEGER,
            UNIQUE(DriverID, OrderDate),
            FOREIGN KEY (DriverID) REFERENCES Drivers(DriverID)
        )`);
        saveDb();
    } catch (e) {}

    try {
        nativeDb.run(`CREATE TABLE IF NOT EXISTS DriverSessions (
            Token TEXT PRIMARY KEY,
            DriverID INTEGER NOT NULL,
            CreatedAt TEXT DEFAULT (datetime('now', 'localtime')),
            ExpiresAt TEXT NOT NULL,
            FOREIGN KEY (DriverID) REFERENCES Drivers(DriverID)
        )`);
        saveDb();
    } catch (e) {}

    try {
        nativeDb.run(`UPDATE Orders SET TotalIQD = CASE WHEN FreeDelivery=1 THEN AmountIQD ELSE AmountIQD + COALESCE(DeliveryFeeIQD,0) END`);
    } catch (e) {}

    // إضافة حالة "مرفوض من الزبون" - إعادة إنشاء جدول Orders إذا لم يكن يدعمها
    try {
        const master = nativeDb.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Orders'`);
        const createSql = (master && master[0] && master[0].values && master[0].values[0] && master[0].values[0][0]) || '';
        const needsMigration = createSql && createSql.includes('Canceled') && !createSql.includes('Returned');
        if (needsMigration) {
            nativeDb.run(`PRAGMA foreign_keys = OFF`);
                nativeDb.run(`CREATE TABLE IF NOT EXISTS Orders_new (
                    OrderID INTEGER PRIMARY KEY AUTOINCREMENT,
                    AdminOrderNo TEXT,
                    ShipmentNumber TEXT UNIQUE NOT NULL,
                    StoreName TEXT NOT NULL,
                    StorePhone TEXT,
                    CustomerName TEXT NOT NULL,
                    CustomerPhone TEXT,
                    Address TEXT,
                    Pieces INTEGER DEFAULT 1,
                    AmountIQD REAL DEFAULT 0,
                    DeliveryFeeIQD REAL DEFAULT 0,
                    FreeDelivery INTEGER DEFAULT 0,
                    WaivedDeliveryIQD REAL DEFAULT 0,
                    TotalIQD REAL DEFAULT 0,
                    Notes TEXT,
                    Status TEXT DEFAULT 'New' CHECK(Status IN ('New', 'AssignedToDriver', 'Delivered', 'Returned')),
                    DriverID INTEGER,
                    CreatedDate TEXT DEFAULT (datetime('now', 'localtime')),
                    DeliveredDate TEXT,
                    FOREIGN KEY (DriverID) REFERENCES Drivers(DriverID)
                )`);
                nativeDb.run(`INSERT INTO Orders_new SELECT OrderID,AdminOrderNo,ShipmentNumber,StoreName,StorePhone,CustomerName,CustomerPhone,Address,Pieces,AmountIQD,DeliveryFeeIQD,FreeDelivery,WaivedDeliveryIQD,TotalIQD,Notes,CASE WHEN Status IN ('Canceled','ملغي','RejectedByCustomer') THEN 'Returned' ELSE Status END,DriverID,CreatedDate,DeliveredDate FROM Orders`);
                nativeDb.run(`DROP TABLE Orders`);
                nativeDb.run(`ALTER TABLE Orders_new RENAME TO Orders`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_shipment ON Orders(ShipmentNumber)`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON Orders(CustomerPhone)`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_store_name ON Orders(StoreName)`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(Status)`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_driver ON Orders(DriverID)`);
                nativeDb.run(`CREATE INDEX IF NOT EXISTS idx_orders_created ON Orders(CreatedDate)`);
                nativeDb.run(`PRAGMA foreign_keys = ON`);
                saveDb();
        }
    } catch (migE) {
        try { nativeDb.run(`PRAGMA foreign_keys = ON`); } catch (_) {}
    }

    // توحيد حالة الراجع (تحويل القديمة إلى Returned)
    try {
        nativeDb.exec(`UPDATE Orders SET Status='Returned' WHERE TRIM(Status) IN ('ملغي','Canceled','RejectedByCustomer')`);
        nativeDb.exec(`UPDATE Orders SET Status='Returned' WHERE LOWER(TRIM(Status)) IN ('canceled','returned')`);
        saveDb();
    } catch (e) { console.warn('Migration status:', e?.message); }

    saveDb();
}

module.exports = {
    getDatabase,
    initSchema,
    getDbPath
};
