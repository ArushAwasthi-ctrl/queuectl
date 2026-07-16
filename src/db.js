const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'queuectl.db');

let dbInstance = null;

/**
 * Returns a singleton SQLite connection, creating the schema on first open.
 * Each worker is its own OS process (per our fork() model), so each
 * process gets exactly one connection to the shared file.
 */
function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = new Database(DB_PATH);

  // WAL mode: lets reads and writes coexist better across multiple
  // processes hitting the same file concurrently.
  dbInstance.pragma('journal_mode = WAL');

  // If the db is momentarily locked by another process's write,
  // wait up to 5s instead of throwing immediately.
  dbInstance.pragma('busy_timeout = 5000');

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      next_run_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      worker_id TEXT,
      last_error TEXT
    );
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const insertDefault = dbInstance.prepare(
    `INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`
  );
  insertDefault.run('max-retries', '3');
  insertDefault.run('backoff-base', '2');

  return dbInstance;
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = { getDb, closeDb, DB_PATH };