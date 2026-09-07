/**
 * Translate SQLite-oriented SQL to PostgreSQL while keeping ? placeholders
 * (converted to $1, $2, ... in pg adapter).
 */

const PG_COLUMNS = [
    'ReturnedOrderReceivedAt', 'ReturnedByDriverID', 'CustomerLocationLink',
    'WaivedDeliveryIQD', 'PerformedByUserID', 'PerformedByName', 'CollectedByUserID',
    'ReturnedOrderReceived', 'AdminOrderNo', 'ShipmentNumber', 'DeliveryFeeIQD',
    'CreatedByUserID', 'StoredPassword', 'PasswordHash', 'DisplayName', 'SecretCode',
    'StorePhone', 'StoreName', 'CustomerPhone', 'CustomerName', 'CreatedDate',
    'DeliveredDate', 'ReturnedDate', 'ReturnReason', 'CollectionID', 'NotificationID',
    'TrackingID', 'SettingKey', 'SettingValue', 'RegionName', 'RegionArea', 'DriverName',
    'OrderDate', 'ScanTime', 'OrderNotes', 'ReviewedAt', 'CreatedAt', 'ExpiresAt',
    'CollectedAt', 'CreatedByName', 'IsDeferred', 'DeferredReason', 'DeferredDate', 'DriverID', 'RegionID', 'Username', 'UserID',
    'OrderID', 'TotalIQD', 'AmountIQD', 'FreeDelivery', 'LabelPrinted', 'Active',
    'Phone', 'Address', 'Pieces', 'Notes', 'Status', 'Token', 'Role', 'Reviewed'
].sort((a, b) => b.length - a.length);

function quoteAsAliases(sql) {
    return sql.replace(/\bas\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi, (_match, alias) => `AS "${alias}"`);
}

function translateSqlForPostgres(sql) {
    let s = String(sql);

    // INSERT OR REPLACE → UPSERT (AppSettings)
    s = s.replace(
        /INSERT\s+OR\s+REPLACE\s+INTO\s+AppSettings\s*\(\s*SettingKey\s*,\s*SettingValue\s*\)\s*VALUES\s*\(\s*\?\s*,\s*\?\s*\)/gi,
        'INSERT INTO "AppSettings" ("SettingKey", "SettingValue") VALUES ($1, $2) ON CONFLICT ("SettingKey") DO UPDATE SET "SettingValue" = EXCLUDED."SettingValue"'
    );

    // Session cleanup — TEXT ExpiresAt compared as timestamp
    s = s.replace(
        /ExpiresAt\s*<\s*datetime\s*\(\s*'now'\s*\)/gi,
        '"ExpiresAt"::timestamp < NOW()'
    );

    // datetime('now') and datetime('now', 'localtime')
    s = s.replace(/datetime\s*\(\s*'now'\s*,\s*'localtime'\s*\)/gi, "(NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT");
    s = s.replace(/datetime\s*\(\s*'now'\s*\)/gi, "(NOW() AT TIME ZONE 'UTC')::TEXT");

    // date(?) parameter — must run before date(column)
    s = s.replace(/date\s*\(\s*\?\s*\)/gi, 'SUBSTRING(?::text, 1, 10)');

    // date(column) comparisons — works on YYYY-MM-DD HH:MM:SS text
    s = s.replace(/date\s*\(\s*([a-zA-Z0-9_."]+)\s*\)/gi, '(SUBSTRING($1, 1, 10))');

    // Quote bare table names for PascalCase
    const tables = [
        'Orders', 'Drivers', 'DriverSessions', 'OrderTracking', 'Regions',
        'AppUsers', 'UserSessions', 'AppSettings', 'DriverFeeCollections',
        'FreeDeliveryOverrideNotifications'
    ];
    for (const t of tables) {
        const re = new RegExp(`(?<!")\\b${t}\\b(?!")`, 'g');
        s = s.replace(re, `"${t}"`);
    }

    // Quote PascalCase column names (PG folds unquoted identifiers to lowercase)
    for (const col of PG_COLUMNS) {
        const re = new RegExp(`(?<!")\\b${col}\\b(?!")`, 'g');
        s = s.replace(re, `"${col}"`);
    }

    // Quote SELECT aliases so camelCase keys survive (totalOrders, CreatedByName, …)
    s = quoteAsAliases(s);

    return s;
}

function toPgParams(sql, params) {
    let i = 0;
    const pgSql = translateSqlForPostgres(sql).replace(/\?/g, () => `$${++i}`);
    return { pgSql, params: params || [] };
}

module.exports = {
    translateSqlForPostgres,
    toPgParams
};
