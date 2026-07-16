const fs = require('fs');
const { PIDS_FILE } = require('./workerStart');

function workerStopCommand() {
  if (!fs.existsSync(PIDS_FILE)) {
    console.log('No running workers found (.worker-pids.json does not exist).');
    return;
  }

  const pids = JSON.parse(fs.readFileSync(PIDS_FILE, 'utf-8'));

  if (pids.length === 0) {
    console.log('No workers to stop.');
    return;
  }

  let stoppedCount = 0;
  for (const { pid, workerId } of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent SIGTERM to ${workerId} (pid ${pid}) — will finish current job then exit`);
      stoppedCount++;
    } catch (err) {
      if (err.code === 'ESRCH') {
        console.log(`${workerId} (pid ${pid}) is not running (already stopped)`);
      } else {
        console.error(`Failed to stop ${workerId} (pid ${pid}): ${err.message}`);
      }
    }
  }

  fs.unlinkSync(PIDS_FILE);
  console.log(`Stop signal sent to ${stoppedCount} worker(s).`);
}

module.exports = workerStopCommand;