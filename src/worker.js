const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./db');
const { claimNextJob, markCompleted, handleJobFailure } = require('./jobStore');
const { runCommand } = require('./executor');

const POLL_INTERVAL_MS = 300;

const workerIdArg = process.argv.find((a) => a.startsWith('--worker-id='));
const workerId = workerIdArg ? workerIdArg.split('=')[1] : `worker-${process.pid}`;

const logPath = path.join(process.cwd(), `worker-${workerId}.log`);
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, line);
}

let running = true;

process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  const db = getDb();
  log(`[${workerId}] started (pid ${process.pid})`);

  while (running) {
    const job = claimNextJob(db, workerId);

    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    log(`[${workerId}] running job ${job.id}: ${job.command}`);
    const result = await runCommand(job.command);

    if (result.success) {
      markCompleted(db, job.id);
      log(`[${workerId}] job ${job.id} completed`);
    } else {
      const newState = handleJobFailure(db, job, result.error);
      log(`[${workerId}] job ${job.id} failed (${result.error}) -> ${newState}`);
    }
  }

  log(`[${workerId}] shutting down gracefully`);
  closeDb();
  process.exit(0);
}

loop();