const { spawn } = require('child_process');

function runCommand(commandString, timeoutMs = 30000) {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let stderrOutput = '';

    const child = spawn(commandString, { shell: true });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderrOutput += chunk.toString();
      });
    }

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ success: false, error: `Command failed to start: ${err.message}` });
    });

    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (timedOut) {
        resolve({ success: false, error: `Job timed out after ${timeoutMs}ms` });
      } else if (exitCode === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderrOutput.trim() || `Command exited with code ${exitCode}`,
        });
      }
    });
  });
}

module.exports = { runCommand };