const fs = require("fs");
const path = require("path");

const { getDb } = require("../db");
const { getStatusSummary } = require("../jobStore");

const PIDS_FILE = path.join(process.cwd(), ".worker-pids.json");

function statusCommand() {
  const db = getDb();

  const summary = getStatusSummary(db);

  let workerCount = 0;

  if (fs.existsSync(PIDS_FILE)) {
    try {
      const workers = JSON.parse(fs.readFileSync(PIDS_FILE, "utf8"));
      workerCount = workers.length;
    } catch (err) {
      workerCount = 0;
    }
  }

  console.log("\nQueue Status");
  console.log("============");
  console.log(`Workers     : ${workerCount}`);
  console.log(`Pending     : ${summary.pending}`);
  console.log(`Processing  : ${summary.processing}`);
  console.log(`Completed   : ${summary.completed}`);
  console.log(`Failed      : ${summary.failed}`);
  console.log(`Dead        : ${summary.dead}`);
}

module.exports = statusCommand;