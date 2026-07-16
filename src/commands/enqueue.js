const { getDb } = require('../db');
const { enqueueJob, getJobById } = require('../jobStore');

function enqueueCommand(jobJson) {
  let parsed;
  try {
    parsed = JSON.parse(jobJson);
  } catch (err) {
    console.error(`Error: invalid JSON provided: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  if (!parsed.id || !parsed.command) {
    console.error('Error: job must include at least "id" and "command" fields');
    process.exitCode = 1;
    return;
  }

  const db = getDb();

  if (getJobById(db, parsed.id)) {
    console.error(`Error: a job with id "${parsed.id}" already exists`);
    process.exitCode = 1;
    return;
  }

  const job = enqueueJob(db, parsed);
  console.log(`Enqueued job "${job.id}" (state=${job.state}, max_retries=${job.max_retries})`);
}

module.exports = enqueueCommand;