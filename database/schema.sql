-- شركة ديما الحياة - نظام إدارة التوصيل
-- Database Schema for SQLite

-- جدول السائقين
CREATE TABLE IF NOT EXISTS Drivers (
    DriverID INTEGER PRIMARY KEY AUTOINCREMENT,
    DriverName TEXT NOT NULL,
    Phone TEXT,
    Active INTEGER DEFAULT 1,
    Username TEXT UNIQUE,
    PasswordHash TEXT,
    StoredPassword TEXT
);

-- جلسات السائقين (للتطبيق)
CREATE TABLE IF NOT EXISTS DriverSessions (
    Token TEXT PRIMARY KEY,
    DriverID INTEGER NOT NULL,
    CreatedAt TEXT DEFAULT (datetime('now', 'localtime')),
    ExpiresAt TEXT NOT NULL,
    FOREIGN KEY (DriverID) REFERENCES Drivers(DriverID)
);

-- جدول الطلبات
CREATE TABLE IF NOT EXISTS Orders (
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
);

-- جدول تتبع الطلبات
CREATE TABLE IF NOT EXISTS OrderTracking (
    TrackingID INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderID INTEGER NOT NULL,
    DriverID INTEGER NOT NULL,
    ScanTime TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (DriverID) REFERENCES Drivers(DriverID)
);

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_orders_shipment ON Orders(ShipmentNumber);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON Orders(CustomerPhone);
CREATE INDEX IF NOT EXISTS idx_orders_store_name ON Orders(StoreName);
CREATE INDEX IF NOT EXISTS idx_orders_status ON Orders(Status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON Orders(DriverID);
CREATE INDEX IF NOT EXISTS idx_orders_created ON Orders(CreatedDate);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON OrderTracking(OrderID);
