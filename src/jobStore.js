const { computeNextRunAt } = require('./backoff');

function nowIso() {
  return new Date().toISOString();
}

function getConfigValue(db, key, fallback) {
  const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key);
  return row ? row.value : fallback;
}

function setConfigValue(db, key, value) {
  db.prepare(
    `INSERT INTO config (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

function enqueueJob(db, job) {
  const timestamp = nowIso();
  const maxRetries =
    job.max_retries !== undefined
      ? job.max_retries
      : parseInt(getConfigValue(db, 'max-retries', '3'), 10);

  db.prepare(
    `INSERT INTO jobs (id, command, state, attempts, max_retries, next_run_at, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, ?, ?, ?, ?)`
  ).run(job.id, job.command, maxRetries, timestamp, timestamp, timestamp);

  return getJobById(db, job.id);
}

function getJobById(db, id) {
  return db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id);
}

function claimNextJob(db, workerId) {
  const timestamp = nowIso();

  const result = db
    .prepare(
      `UPDATE jobs
       SET state = 'processing', worker_id = ?, updated_at = ?
       WHERE id = (
         SELECT id FROM jobs
         WHERE state = 'pending' AND next_run_at <= ?
         ORDER BY created_at ASC
         LIMIT 1
       )
       AND state = 'pending'`
    )
    .run(workerId, timestamp, timestamp);

  if (result.changes === 0) {
    return null;
  }

  return db
    .prepare(`SELECT * FROM jobs WHERE worker_id = ? AND state = 'processing' ORDER BY updated_at DESC LIMIT 1`)
    .get(workerId);
}

function markCompleted(db, jobId) {
  db.prepare(
    `UPDATE jobs SET state = 'completed', updated_at = ? WHERE id = ?`
  ).run(nowIso(), jobId);
}


function handleJobFailure(db, job, errorMessage) {
  const newAttempts = job.attempts + 1;
  const timestamp = nowIso();

  if (newAttempts >= job.max_retries) {
    db.prepare(
      `UPDATE jobs SET state = 'dead', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?`
    ).run(newAttempts, errorMessage, timestamp, job.id);
    return 'dead';
  }

  const baseSeconds = parseInt(getConfigValue(db, 'backoff-base', '2'), 10);
  const nextRunAt = computeNextRunAt(newAttempts, baseSeconds);

  db.prepare(
    `UPDATE jobs
     SET state = 'pending', attempts = ?, next_run_at = ?, last_error = ?, updated_at = ?
     WHERE id = ?`
  ).run(newAttempts, nextRunAt, errorMessage, timestamp, job.id);

  return 'pending';
}

function listJobs(db, state) {
  if (state) {
    return db.prepare(`SELECT * FROM jobs WHERE state = ? ORDER BY created_at ASC`).all(state);
  }
  return db.prepare(`SELECT * FROM jobs ORDER BY created_at ASC`).all();
}

function getStatusSummary(db) {
  const counts = db
    .prepare(`SELECT state, COUNT(*) as count FROM jobs GROUP BY state`)
    .all();

  const summary = { pending: 0, processing: 0, completed: 0, dead: 0 };
  for (const row of counts) {
    summary[row.state] = row.count;
  }
  return summary;
}

function listDeadJobs(db) {
  return db.prepare(`SELECT * FROM jobs WHERE state = 'dead' ORDER BY updated_at DESC`).all();
}

function retryDeadJob(db, jobId) {
  const job = getJobById(db, jobId);
  if (!job) return null;
  if (job.state !== 'dead') return job;

  const timestamp = nowIso();
  db.prepare(
    `UPDATE jobs SET state = 'pending', attempts = 0, next_run_at = ?, updated_at = ?, last_error = NULL WHERE id = ?`
  ).run(timestamp, timestamp, jobId);

  return getJobById(db, jobId);
}

module.exports = {
  enqueueJob,
  getJobById,
  claimNextJob,
  markCompleted,
  handleJobFailure,
  listJobs,
  getStatusSummary,
  listDeadJobs,
  retryDeadJob,
  getConfigValue,
  setConfigValue,
};