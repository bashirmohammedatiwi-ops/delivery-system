const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { toPgParams, translateSqlForPostgres } = require('./sqlDialect');

let pool = null;
let db = null;

function runAsync(promise) {
    let done = false;
    let result;
    let error;
    promise.then((r) => { result = r; done = true; }).catch((e) => { error = e; done = true; });
    while (!done) {
        // eslint-disable-next-line no-sync
        require('deasync').runLoopOnce();
    }
    if (error) throw error;
    return result;
}

function createStatement(sql) {
    return {
        get: (...params) => {
            const { pgSql, params: p } = toPgParams(sql, params);
            return runAsync(pool.query(pgSql, p).then(r => r.rows[0]));
        },
        all: (...params) => {
            const { pgSql, params: p } = toPgParams(sql, params);
            return runAsync(pool.query(pgSql, p).then(r => r.rows));
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

async function initSchema() {
    if (db) return;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required for PostgreSQL');
    }

    pool = new Pool({
        connectionString,
        max: parseInt(process.env.PG_POOL_MAX || '20', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err.message);
    });

    await pool.query('SELECT 1');

    const schemaPath = path.join(__dirname, 'schema.pg.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    db = createDbWrapper();
    console.log('PostgreSQL connected and schema ready');
}

function getDatabase() {
    if (!db) throw new Error('Database not initialized. Call initSchema first.');
    return db;
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
    initSchema,
    closePool,
    getDbPath: () => null
};
