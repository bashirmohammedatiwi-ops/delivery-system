const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { toPgParams, translateSqlForPostgres } = require('./sqlDialect');

let pool = null;
let db = null;

function runAsync(promise) {
    const deasync = require('deasync');
    let done = false;
    let result;
    let error;
    promise.then((r) => { result = r; done = true; }).catch((e) => { error = e; done = true; });
    deasync.loopWhile(() => !done);
    if (error) throw error;
    return result;
}

/** PG lowercases unquoted aliases — map back to keys the app expects */
const ALIAS_KEY_FIX = {
    totalorders: 'totalOrders',
    newcount: 'newCount',
    assignedcount: 'assignedCount',
    deliveredcount: 'deliveredCount',
    todaycount: 'todayCount',
    todaykarkh: 'todayKarkh',
    todayrusafa: 'todayRusafa',
    countkarkh: 'countKarkh',
    countrusafa: 'countRusafa',
    returnedcount: 'returnedCount',
    orderdate: 'orderDate',
    createdbyname: 'CreatedByName'
};

function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    const out = { ...row };
    for (const [k, v] of Object.entries(row)) {
        const fix = ALIAS_KEY_FIX[k.toLowerCase()];
        if (fix && out[fix] === undefined) out[fix] = v;
    }
    return out;
}

function normalizeRows(rows) {
    return (rows || []).map(normalizeRow);
}

function createStatement(sql) {
    return {
        get: (...params) => {
            const { pgSql, params: p } = toPgParams(sql, params);
            return runAsync(pool.query(pgSql, p).then(r => normalizeRow(r.rows[0])));
        },
        all: (...params) => {
            const { pgSql, params: p } = toPgParams(sql, params);
            return runAsync(pool.query(pgSql, p).then(r => normalizeRows(r.rows)));
        },
        run: (...params) => {
            const { pgSql, params: p } = toPgParams(sql, params);
            return runAsync(pool.query(pgSql, p).then(r => ({ changes: r.rowCount })));
        }
    };
}

function createDbWrapper() {
    return {
        prepare: (sql) => createStatement(sql),
        exec: (sql) => {
            const statements = String(sql).split(';').map(s => s.trim()).filter(Boolean);
            for (const stmt of statements) {
                const pgSql = translateSqlForPostgres(stmt);
                runAsync(pool.query(pgSql));
            }
        },
        pragma: () => {}
    };
}

async function applySchemaIfNeeded(client) {
    const check = await client.query(`SELECT to_regclass('public."Orders"') AS reg`);
    if (check.rows[0]?.reg) {
        console.log('PostgreSQL schema already exists — skip DDL');
        return;
    }
    const schemaPath = path.join(__dirname, 'schema.pg.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
        await client.query(stmt);
    }
    console.log('PostgreSQL schema created');
}

async function initSchema() {
    if (db) return;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required for PostgreSQL');
    }

    let newPool = new Pool({
        connectionString,
        max: parseInt(process.env.PG_POOL_MAX || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000
    });

    newPool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err.message);
    });

    const client = await newPool.connect();
    try {
        await client.query('SELECT 1');
        await applySchemaIfNeeded(client);
    } catch (err) {
        client.release();
        await newPool.end().catch(() => {});
        throw err;
    }
    client.release();

    pool = newPool;
    db = createDbWrapper();
    console.log('PostgreSQL connected and ready');
}

function getDatabase() {
    if (!db) throw new Error('Database not initialized. Call initSchema first.');
    return db;
}

function getPool() {
    if (!pool) throw new Error('PostgreSQL pool not initialized. Call initSchema first.');
    return pool;
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
}

module.exports = {
    getDatabase,
    getPool,
    initSchema,
    closePool,
    getDbPath: () => null
};
