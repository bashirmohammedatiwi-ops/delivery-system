/**
 * Database entry — PostgreSQL when DATABASE_URL is set, otherwise SQLite (legacy).
 */
const usePostgres = !!(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());

const backend = usePostgres
    ? require('./pg')
    : require('./init');

module.exports = {
    getDatabase: () => backend.getDatabase(),
    initSchema: () => backend.initSchema(),
    getDbPath: () => backend.getDbPath?.() || null,
    closePool: () => backend.closePool?.() || Promise.resolve(),
    isPostgres: () => usePostgres
};
