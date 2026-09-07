#!/usr/bin/env node
/**
 * Migrate SQLite (data/delivery.db) → PostgreSQL (DATABASE_URL)
 * Preserves all row IDs and validates counts after migration.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/delivery node scripts/migrate-sqlite-to-postgres.js
 *
 * Optional:
 *   SQLITE_PATH=/path/to/delivery.db
 *   DRY_RUN=1   — validate only, no writes
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'delivery.db');
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!DATABASE_URL) {
    console.error('ERROR: Set DATABASE_URL to target PostgreSQL connection string.');
    process.exit(1);
}
if (!fs.existsSync(SQLITE_PATH)) {
    console.error('ERROR: SQLite file not found:', SQLITE_PATH);
    process.exit(1);
}

const TABLES = [
    { name: 'Drivers', pk: 'DriverID' },
    { name: 'Regions', pk: 'RegionID' },
    { name: 'AppUsers', pk: 'UserID' },
    { name: 'AppSettings', pk: 'SettingKey' },
    { name: 'Orders', pk: 'OrderID' },
    { name: 'OrderTracking', pk: 'TrackingID' },
    { name: 'DriverSessions', pk: 'Token' },
    { name: 'UserSessions', pk: 'Token' },
    { name: 'DriverFeeCollections', pk: 'CollectionID' },
    { name: 'FreeDeliveryOverrideNotifications', pk: 'NotificationID' }
];

const SERIAL_TABLES = new Set([
    'Drivers', 'Regions', 'AppUsers', 'Orders', 'OrderTracking',
    'DriverFeeCollections', 'FreeDeliveryOverrideNotifications'
]);

async function loadSqlite() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(SQLITE_PATH);
    return new SQL.Database(buffer);
}

function sqliteRows(db, table) {
    try {
        const stmt = db.prepare(`SELECT * FROM ${table}`);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
    } catch (_) {
        return [];
    }
}

function sqliteCount(db, table) {
    try {
        const r = db.exec(`SELECT COUNT(*) AS c FROM ${table}`);
        return r[0]?.values[0][0] || 0;
    } catch (_) {
        return 0;
    }
}

function quoteIdent(name) {
    return `"${String(name).replace(/"/g, '""')}"`;
}

function buildInsert(table, row) {
    const cols = Object.keys(row);
    const colSql = cols.map(quoteIdent).join(', ');
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map(c => row[c]);
    return {
        sql: `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${placeholders})`,
        values
    };
}

async function resetSequence(client, table, pk) {
    if (!SERIAL_TABLES.has(table)) return;
    await client.query(`
        SELECT setval(
            pg_get_serial_sequence('${quoteIdent(table)}', '${pk}'),
            COALESCE((SELECT MAX(${quoteIdent(pk)}) FROM ${quoteIdent(table)}), 1),
            true
        )
    `);
}

async function main() {
    console.log('==> Backup reminder: copy', SQLITE_PATH, 'before migration');
    const backupPath = SQLITE_PATH + '.backup-' + Date.now();
    fs.copyFileSync(SQLITE_PATH, backupPath);
    console.log('==> Auto backup created:', backupPath);

    const sqlite = await loadSqlite();
    const pool = new Pool({ connectionString: DATABASE_URL });
    const client = await pool.connect();

    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.pg.sql');
        await client.query(fs.readFileSync(schemaPath, 'utf8'));
        console.log('==> PostgreSQL schema applied');

        if (DRY_RUN) {
            console.log('DRY_RUN: skipping data copy');
        } else {
            await client.query(`
                TRUNCATE
                    "FreeDeliveryOverrideNotifications",
                    "DriverFeeCollections",
                    "UserSessions",
                    "DriverSessions",
                    "OrderTracking",
                    "Orders",
                    "AppSettings",
                    "AppUsers",
                    "Regions",
                    "Drivers"
                RESTART IDENTITY CASCADE
            `);
            await client.query('BEGIN');
            // SQLite قد يحتوي سجلات بمراجع سائقين محذوفين — نعطّل FK مؤقتاً (مثل SQLite)
            await client.query('SET session_replication_role = replica');
            for (const { name } of TABLES) {
                const rows = sqliteRows(sqlite, name);
                console.log(`==> ${name}: ${rows.length} rows`);
                for (const row of rows) {
                    const { sql, values } = buildInsert(name, row);
                    await client.query(sql, values);
                }
            }
            await client.query('SET session_replication_role = DEFAULT');
            await client.query('COMMIT');
        }

        console.log('==> Resetting sequences...');
        for (const { name, pk } of TABLES) {
            if (SERIAL_TABLES.has(name)) await resetSequence(client, name, pk);
        }

        console.log('==> Validation:');
        let ok = true;
        for (const { name } of TABLES) {
            const src = sqliteCount(sqlite, name);
            const res = await client.query(`SELECT COUNT(*) AS c FROM ${quoteIdent(name)}`);
            const dst = parseInt(res.rows[0].c, 10);
            const match = src === dst;
            if (!match) ok = false;
            console.log(`  ${name}: sqlite=${src} postgres=${dst} ${match ? 'OK' : 'MISMATCH'}`);
        }

        if (!ok) {
            console.error('ERROR: Row count mismatch — review before switching DATABASE_URL');
            process.exit(2);
        }

        console.log('');
        console.log('SUCCESS: Migration complete. Next steps:');
        console.log('  1. Set DATABASE_URL in .env / docker-compose for the app service');
        console.log('  2. Restart: docker compose up -d --build app');
        console.log('  3. Verify /health shows db=postgres');
        console.log('  4. Keep SQLite backup at:', backupPath);
    } catch (err) {
        try {
            await client.query('SET session_replication_role = DEFAULT');
            await client.query('ROLLBACK');
        } catch (_) {}
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
        sqlite.close();
    }
}

main();
