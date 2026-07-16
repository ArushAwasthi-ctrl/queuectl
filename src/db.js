const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'queuectl.db');

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');

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