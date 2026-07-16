const { getDb } = require("../db");
const { listJobs } = require("../jobStore");

function listCommand(options) {
  const db = getDb();

  const jobs = listJobs(db, options.state);

  if (jobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  console.table(
    jobs.map(job => ({
      id: job.id,
      state: job.state,
      attempts: job.attempts,
      worker: job.worker_id ?? "-",
      command: job.command
    }))
  );
}

module.exports = listCommand;