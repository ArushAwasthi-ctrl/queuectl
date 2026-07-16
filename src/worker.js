const { getDb, closeDb } = require('./db');
const { claimNextJob, markCompleted, handleJobFailure } = require('./jobStore');
const { runCommand } = require('./executor');

const POLL_INTERVAL_MS = 300;

// Worker id is passed as a CLI arg, e.g. --worker-id=w0
const workerIdArg = process.argv.find((a) => a.startsWith('--worker-id='));
const workerId = workerIdArg ? workerIdArg.split('=')[1] : `worker-${process.pid}`;

let running = true;

// Graceful shutdown: we only stop the loop BETWEEN jobs, never mid-execution.
process.on('SIGTERM', () => {
  running = false;
});
process.on('SIGINT', () => {
  running = false;
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  const db = getDb();
  console.log(`[${workerId}] started (pid ${process.pid})`);

  while (running) {
    const job = claimNextJob(db, workerId);

    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    console.log(`[${workerId}] running job ${job.id}: ${job.command}`);
    const result = await runCommand(job.command);

    if (result.success) {
      markCompleted(db, job.id);
      console.log(`[${workerId}] job ${job.id} completed`);
    } else {
      const newState = handleJobFailure(db, job, result.error);
      console.log(`[${workerId}] job ${job.id} failed (${result.error}) -> ${newState}`);
    }
  }

  console.log(`[${workerId}] shutting down gracefully`);
  closeDb();
  process.exit(0);
}

loop();