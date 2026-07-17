const fs = require('fs');
const path = require('path');
const { PIDS_FILE } = require('./workerStart');

const STOP_FILE = path.join(process.cwd(), '.worker-stop.json');

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

  // Write stop file so workers detect shutdown even if signals fail (e.g. Windows)
  fs.writeFileSync(STOP_FILE, JSON.stringify({ stoppedAt: new Date().toISOString() }));

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

module.exports = workerStopCommand;