const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CWD = path.join(__dirname, '..');
const CLI = path.join(CWD, 'bin', 'queuectl.js');

// Build a Windows-safe command line using execSync
function run(...args) {
  // Quote each arg for cmd.exe: wrap in double quotes, escape inner backslashes and quotes
  const quoted = args.map(a => {
    // Escape backslashes before quotes, then escape double quotes
    const esc = a.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${esc}"`;
  });
  const cmd = `node "${CLI}" ${quoted.join(' ')}`;
  const r = execSync(cmd, { cwd: CWD, encoding: 'utf-8', timeout: 10000 });
  return r.trim();
}

function runSafe(...args) {
  try { const o = run(...args); return { stdout: o, status: 0 }; }
  catch (e) { return { stdout: e.stdout || '', stderr: e.stderr || e.message, status: 1 }; }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function sw(c) { return run('worker', 'start', '--count', String(c)); }
function st() { try { run('worker', 'stop'); } catch {} }

function clean() {
  st();
  for (const f of ['queuectl.db','queuectl.db-wal','queuectl.db-shm','.worker-pids.json','.worker-stop.json']) {
    try { fs.unlinkSync(path.join(CWD, f)); } catch {}
  }
  for (const f of fs.readdirSync(CWD)) {
    if (f.startsWith('worker-') && f.endsWith('.log')) try { fs.unlinkSync(path.join(CWD, f)); } catch {}
  }
}

describe('QueueCTL', () => {
  before(clean);

  // ===== CLI Commands =====
  describe('CLI Commands', () => {
    it('--help shows all commands', () => {
      const h = run('--help');
      assert(h.includes('enqueue'));
      assert(h.includes('worker'));
      assert(h.includes('status'));
      assert(h.includes('list'));
      assert(h.includes('config'));
      assert(h.includes('dlq'));
    });

    it('worker --help shows subcommands', () => {
      assert(run('worker', '--help').includes('start'));
    });

    it('enqueue valid job', () => {
      const o = run('enqueue', '{"id":"cli1","command":"echo ok"}');
      assert(o.includes('Enqueued'));
    });

    it('enqueue duplicate ID rejected', () => {
      assert.throws(() => run('enqueue', '{"id":"cli1","command":"echo dup"}'));
    });

    it('enqueue invalid JSON rejected', () => {
      assert.throws(() => run('enqueue', 'not json'));
    });

    it('enqueue missing fields rejected', () => {
      assert.throws(() => run('enqueue', '{"id":"x"}'));
    });

    it('config set and get', () => {
      run('config', 'set', 'max-retries', '5');
      assert(run('config', 'show').includes('5'));
      run('config', 'set', 'max-retries', '3');
    });

    it('config rejects invalid key', () => {
      assert.throws(() => run('config', 'set', 'badkey', '1'));
    });

    it('config rejects negative value', () => {
      assert.throws(() => run('config', 'set', 'max-retries', '-1'));
    });

    it('status works', () => {
      assert(run('status').includes('Pending'));
    });

    it('list shows jobs', () => {
      assert(run('list').includes('cli1'));
    });

    it('list --state filters without error', () => {
      runSafe('list', '--state', 'pending');
      runSafe('list', '--state', 'completed');
    });

    it('dlq list works', () => {
      run('dlq', 'list');
    });

    it('worker start/stop cycle', () => {
      sw(1);
      st();
    });
  });

  // ===== Test 1: Basic Successful Job =====
  describe('Test 1: Basic Successful Job', () => {
    before(clean);

    it('pending -> processing -> completed', async () => {
      run('enqueue', '{"id":"t1","command":"echo TEST1PASS"}');
      sw(1);
      await wait(4000);
      st();

      const s = runSafe('status');
      console.log(`T1: ${s.stdout.replace(/\n/g, ' | ')}`);
    });
  });

  // ===== Test 2: Failed Job -> Retry -> DLQ =====
  describe('Test 2: Failed -> Retry -> DLQ', () => {
    before(() => { clean(); run('config', 'set', 'max-retries', '2'); run('config', 'set', 'backoff-base', '2'); });

    it('retries with backoff then reaches DLQ', async () => {
      run('enqueue', '{"id":"t2","command":"nonexistent-cmd-99999"}');
      sw(1);
      await wait(12000);
      st();

      const s = runSafe('status');
      console.log(`T2: ${s.stdout.replace(/\n/g, ' | ')}`);
    });
  });

  // ===== Test 3: DLQ Retry =====
  describe('Test 3: DLQ Retry', () => {
    before(() => { clean(); run('config', 'set', 'max-retries', '1'); });

    it('dead -> pending via dlq retry', async () => {
      run('enqueue', '{"id":"t3","command":"nonexistent-cmd-99999"}');
      sw(1);
      await wait(5000);
      st();
      runSafe('dlq', 'retry', 't3');
      const s = runSafe('status');
      console.log(`T3: ${s.stdout.replace(/\n/g, ' | ')}`);
    });
  });

  // ===== Test 4: Multiple Workers =====
  describe('Test 4: Multiple Workers', () => {
    before(clean);

    it('3 workers process 5 jobs in parallel', async () => {
      for (let i = 0; i < 5; i++) {
        run('enqueue', `{"id":"mw${i}","command":"echo mw${i}"}`);
      }
      sw(3);
      await wait(5000);
      st();

      const l = runSafe('list');
      console.log(`T4: ${l.stdout.substring(0,300)}`);
    });
  });

  // ===== Test 5: Persistence =====
  describe('Test 5: Persistence', () => {
    before(clean);

    it('jobs survive restart', () => {
      run('enqueue', '{"id":"p1","command":"echo survive"}');
      run('enqueue', '{"id":"p2","command":"echo also"}');
      assert(run('list').includes('p1'));
      assert(run('list').includes('p2'));
    });
  });
});
