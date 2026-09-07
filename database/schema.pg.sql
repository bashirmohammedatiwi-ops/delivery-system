-- PostgreSQL schema — mirrors SQLite (PascalCase identifiers for API compatibility)

CREATE TABLE IF NOT EXISTS "Drivers" (
    "DriverID" SERIAL PRIMARY KEY,
    "DriverName" TEXT NOT NULL,
    "Phone" TEXT,
    "Active" INTEGER DEFAULT 1,
    "Username" TEXT UNIQUE,
    "PasswordHash" TEXT,
    "StoredPassword" TEXT
);

CREATE TABLE IF NOT EXISTS "DriverSessions" (
    "Token" TEXT PRIMARY KEY,
    "DriverID" INTEGER NOT NULL REFERENCES "Drivers"("DriverID"),
    "CreatedAt" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "ExpiresAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Regions" (
    "RegionID" SERIAL PRIMARY KEY,
    "RegionName" TEXT NOT NULL UNIQUE,
    "DeliveryFeeIQD" DOUBLE PRECISION DEFAULT 0,
    "RegionArea" TEXT DEFAULT 'الرصافة'
);

CREATE TABLE IF NOT EXISTS "AppUsers" (
    "UserID" SERIAL PRIMARY KEY,
    "Username" TEXT UNIQUE NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "DisplayName" TEXT,
    "Role" TEXT DEFAULT 'employee' CHECK ("Role" IN ('admin', 'employee')),
    "Active" INTEGER DEFAULT 1,
    "CreatedAt" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "SecretCode" TEXT,
    "StoreName" TEXT,
    "StorePhone" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appusers_secretcode
    ON "AppUsers"("SecretCode")
    WHERE "SecretCode" IS NOT NULL AND "SecretCode" <> '';

CREATE TABLE IF NOT EXISTS "UserSessions" (
    "Token" TEXT PRIMARY KEY,
    "UserID" INTEGER NOT NULL REFERENCES "AppUsers"("UserID"),
    "CreatedAt" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "ExpiresAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Orders" (
    "OrderID" SERIAL PRIMARY KEY,
    "AdminOrderNo" TEXT,
    "ShipmentNumber" TEXT UNIQUE NOT NULL,
    "StoreName" TEXT NOT NULL,
    "StorePhone" TEXT,
    "CustomerName" TEXT NOT NULL,
    "CustomerPhone" TEXT,
    "Address" TEXT,
    "RegionID" INTEGER REFERENCES "Regions"("RegionID"),
    "Pieces" INTEGER DEFAULT 1,
    "AmountIQD" DOUBLE PRECISION DEFAULT 0,
    "DeliveryFeeIQD" DOUBLE PRECISION DEFAULT 0,
    "FreeDelivery" INTEGER DEFAULT 0,
    "WaivedDeliveryIQD" DOUBLE PRECISION DEFAULT 0,
    "TotalIQD" DOUBLE PRECISION DEFAULT 0,
    "Notes" TEXT,
    "CustomerLocationLink" TEXT,
    "Status" TEXT DEFAULT 'New' CHECK ("Status" IN ('New', 'AssignedToDriver', 'Delivered', 'Returned')),
    "DriverID" INTEGER REFERENCES "Drivers"("DriverID"),
    "CreatedByUserID" INTEGER REFERENCES "AppUsers"("UserID"),
    "CreatedDate" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "DeliveredDate" TEXT,
    "ReturnReason" TEXT,
    "ReturnedDate" TEXT,
    "ReturnedByDriverID" INTEGER REFERENCES "Drivers"("DriverID"),
    "ReturnedOrderReceived" INTEGER DEFAULT 0,
    "ReturnedOrderReceivedAt" TEXT,
    "LabelPrinted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "OrderTracking" (
    "TrackingID" SERIAL PRIMARY KEY,
    "OrderID" INTEGER NOT NULL REFERENCES "Orders"("OrderID"),
    "DriverID" INTEGER NOT NULL REFERENCES "Drivers"("DriverID"),
    "ScanTime" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT
);

CREATE TABLE IF NOT EXISTS "AppSettings" (
    "SettingKey" TEXT PRIMARY KEY,
    "SettingValue" TEXT
);

CREATE TABLE IF NOT EXISTS "DriverFeeCollections" (
    "CollectionID" SERIAL PRIMARY KEY,
    "DriverID" INTEGER NOT NULL REFERENCES "Drivers"("DriverID"),
    "OrderDate" TEXT NOT NULL,
    "CollectedAt" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "CollectedByUserID" INTEGER,
    UNIQUE ("DriverID", "OrderDate")
);

CREATE TABLE IF NOT EXISTS "FreeDeliveryOverrideNotifications" (
    "NotificationID" SERIAL PRIMARY KEY,
    "OrderID" INTEGER NOT NULL REFERENCES "Orders"("OrderID"),
    "PerformedByUserID" INTEGER,
    "PerformedByName" TEXT,
    "OrderNotes" TEXT,
    "CreatedAt" TEXT DEFAULT (NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT,
    "Reviewed" INTEGER DEFAULT 0,
    "ReviewedAt" TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_shipment ON "Orders"("ShipmentNumber");
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON "Orders"("CustomerPhone");
CREATE INDEX IF NOT EXISTS idx_orders_store_name ON "Orders"("StoreName");
CREATE INDEX IF NOT EXISTS idx_orders_status ON "Orders"("Status");
CREATE INDEX IF NOT EXISTS idx_orders_driver ON "Orders"("DriverID");
CREATE INDEX IF NOT EXISTS idx_orders_created ON "Orders"("CreatedDate");
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON "Orders"((SUBSTRING("CreatedDate", 1, 10)));
CREATE INDEX IF NOT EXISTS idx_orders_returned_driver ON "Orders"("ReturnedByDriverID");
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON "Orders"("CreatedByUserID");
CREATE INDEX IF NOT EXISTS idx_orders_region ON "Orders"("RegionID");
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON "Orders"("Status", "CreatedDate");
CREATE INDEX IF NOT EXISTS idx_tracking_order ON "OrderTracking"("OrderID");
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_username ON "Drivers"("Username");
