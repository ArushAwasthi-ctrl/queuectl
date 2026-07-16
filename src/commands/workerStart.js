const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

const PIDS_FILE = path.join(process.cwd(), '.worker-pids.json');

function workerStartCommand(options) {
  const count = parseInt(options.count, 10) || 1;
  const workerScript = path.join(__dirname, '..', 'worker.js');
  const pids = [];

  for (let i = 0; i < count; i++) {
    const workerId = `w${i}-${Date.now()}`;
    const child = fork(workerScript, [`--worker-id=${workerId}`], {
      detached: true,
      stdio: 'ignore', // fully decouple child's I/O from parent's console
    });

    pids.push({ pid: child.pid, workerId });
    child.unref();
    child.disconnect();
  }

  fs.writeFileSync(PIDS_FILE, JSON.stringify(pids, null, 2));
  console.log(`Started ${count} worker(s): ${pids.map((p) => `${p.workerId} (pid ${p.pid})`).join(', ')}`);
}

module.exports = { workerStartCommand, PIDS_FILE };