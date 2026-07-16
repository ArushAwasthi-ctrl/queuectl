const { fork } = require("child_process");
const path = require("path");
const fs = require("fs");

const PIDS_FILE = path.join(process.cwd(), ".worker-pids.json");

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function workerStartCommand(options) {
  const count = parseInt(options.count, 10) || 1;
  const workerScript = path.join(__dirname, "..", "worker.js");

  // Check existing workers
  if (fs.existsSync(PIDS_FILE)) {
    try {
      const existingWorkers = JSON.parse(
        fs.readFileSync(PIDS_FILE, "utf8")
      );

      const aliveWorkers = existingWorkers.filter((worker) =>
        isProcessRunning(worker.pid)
      );

      if (aliveWorkers.length > 0) {
        console.log(
          `Workers are already running (${aliveWorkers.length} worker(s)).`
        );
        console.log("Run 'queuectl worker stop' first.");
        return;
      }

      // No workers are alive anymore → stale file
      console.log("Removing stale worker PID file...");
      fs.unlinkSync(PIDS_FILE);
    } catch {
      console.log("Invalid PID file found. Removing...");
      fs.unlinkSync(PIDS_FILE);
    }
  }

  const pids = [];

  for (let i = 0; i < count; i++) {
    const workerId = `w${i}-${Date.now()}`;

    const child = fork(workerScript, [`--worker-id=${workerId}`], {
      detached: true,
      stdio: "ignore",
    });

    pids.push({
      pid: child.pid,
      workerId,
    });

    child.unref();
    child.disconnect();
  }

  fs.writeFileSync(PIDS_FILE, JSON.stringify(pids, null, 2));

  console.log(
    `Started ${count} worker(s): ${pids
      .map((p) => `${p.workerId} (pid ${p.pid})`)
      .join(", ")}`
  );
}

module.exports = {
  workerStartCommand,
  PIDS_FILE,
};