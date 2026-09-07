/**
 * Translate SQLite-oriented SQL to PostgreSQL while keeping ? placeholders
 * (converted to $1, $2, ... in pg adapter).
 */

function translateSqlForPostgres(sql) {
    let s = String(sql);

    // INSERT OR REPLACE → UPSERT (AppSettings)
    s = s.replace(
        /INSERT\s+OR\s+REPLACE\s+INTO\s+AppSettings\s*\(\s*SettingKey\s*,\s*SettingValue\s*\)\s*VALUES\s*\(\s*\?\s*,\s*\?\s*\)/gi,
        'INSERT INTO "AppSettings" ("SettingKey", "SettingValue") VALUES ($1, $2) ON CONFLICT ("SettingKey") DO UPDATE SET "SettingValue" = EXCLUDED."SettingValue"'
    );

    // datetime('now') and datetime('now', 'localtime')
    s = s.replace(/datetime\s*\(\s*'now'\s*,\s*'localtime'\s*\)/gi, "(NOW() AT TIME ZONE 'Asia/Baghdad')::TEXT");
    s = s.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'NOW()::TEXT');

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
