const { getDb } = require("../db");
const {
  listDeadJobs,
  retryDeadJob
} = require("../jobStore");

function dlqList() {
  const db = getDb();

  const jobs = listDeadJobs(db);

  if (!jobs.length) {
    console.log("Dead letter queue is empty.");
    return;
  }

  console.table(jobs);
}

function dlqRetry(jobId) {
  const db = getDb();

  const job = retryDeadJob(db, jobId);

  if (!job) {
    console.log("Job not found.");
    return;
  }

  console.log(`Requeued ${jobId}`);
}

module.exports = {
  dlqList,
  dlqRetry
};