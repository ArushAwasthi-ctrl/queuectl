# QueueCTL

A CLI-based background job queue system with retries, exponential backoff, and a Dead Letter Queue (DLQ).

## Features

- **Enqueue jobs** with arbitrary shell commands
- **Multiple worker processes** for parallel job execution
- **Automatic retries** with exponential backoff
- **Dead Letter Queue** for permanently failed jobs
- **Persistent storage** via SQLite (survives restarts)
- **Configurable** retry count and backoff base
- **Crash recovery** — interrupted jobs are re-queued on restart
- **Graceful shutdown** — workers finish current jobs before exiting

## Prerequisites

- Node.js >= 18.0.0
- npm

## Setup

```bash
git clone <repository-url>
cd queuectl
npm install
npm link    # optional: makes `queuectl` available globally
```

## Usage

### Enqueue a Job

```bash
queuectl enqueue '{"id":"job1","command":"echo Hello World"}'
```

### Start Workers

```bash
queuectl worker start --count 3
```

### Check Status

```bash
queuectl status
```

### List Jobs

```bash
queuectl list
queuectl list --state pending
queuectl list --state completed
queuectl list --state failed
queuectl list --state dead
```

### Stop Workers

```bash
queuectl worker stop
```

### Manage the Dead Letter Queue

```bash
queuectl dlq list
queuectl dlq retry <jobId>
```

### Configuration

```bash
queuectl config show
queuectl config set max-retries 5
queuectl config set backoff-base 2
```

## Architecture

```
CLI (queuectl.js)
    │
    ├── enqueue ──────► SQLite DB (jobs table)
    │
    ├── worker start ──► fork() ──► worker.js
    │                                    │
    │                                    ├── claimNextJob (atomic SQL)
    │                                    ├── runCommand (child_process.spawn)
    │                                    ├── markCompleted / handleJobFailure
    │                                    └── exponential backoff → DLQ
    │
    ├── worker stop ───► SIGTERM + .worker-stop.json
    │
    ├── status ────────► SQLite aggregate
    │
    ├── list ──────────► SQLite query
    │
    └── dlq ───────────► SQLite (state = 'dead')
```

### Job Lifecycle

```
enqueue
    │
    ▼
pending ──► processing ──► completed
    │            │
    │            ▼
    │         failed (retry with backoff)
    │            │
    │            ▼
    └───◄── pending (retry)
    │            │
    │            ▼
    │         failed (retry with backoff)
    │            │
    │            ▼
    └───◄── pending (retry)
               ...
               │
               ▼
              dead (DLQ after max_retries)
```

### Data Persistence

SQLite with WAL mode for concurrent read/write performance. The database file `queuectl.db` is created automatically in the working directory.

### Worker Concurrency

- Job claiming uses a single atomic SQL `UPDATE` with a subquery — no two workers can claim the same job.
- Workers are independent Node.js processes forked from the CLI.
- On `worker start`, any jobs stuck in `processing` (from a crash) are automatically recovered to `pending`.

### Retry & Backoff

- Delay = `backoff-base ^ attempts` seconds (e.g., 2^1=2s, 2^2=4s, 2^3=8s)
- After `max_retries` failures, the job moves to `dead` (DLQ)

## Testing

```bash
npm test
```

The test suite covers:

- Basic job lifecycle (pending → processing → completed)
- Failed jobs with retry and exponential backoff
- Dead Letter Queue operations (list, retry)
- Multiple workers processing without overlap
- Crash recovery (processing → pending on restart)
- Persistence (jobs survive restart)
- Edge cases (invalid JSON, duplicate IDs, missing fields, invalid config)
- Graceful shutdown (workers finish current job before exiting)

## Project Structure

```
queuectl/
├── bin/
│   └── queuectl.js        # CLI entrypoint (Commander)
├── src/
│   ├── commands/
│   │   ├── enqueue.js     # enqueue command
│   │   ├── workerStart.js # worker start command
│   │   ├── workerStop.js  # worker stop command
│   │   ├── status.js      # status command
│   │   ├── list.js        # list command
│   │   ├── config.js      # config show/set commands
│   │   └── dlq.js         # dlq list/retry commands
│   ├── worker.js          # worker process loop
│   ├── executor.js        # command execution (spawn)
│   ├── jobStore.js        # database operations
│   ├── backoff.js         # exponential backoff calculation
│   └── db.js              # SQLite connection
├── test/
│   └── *.js               # automated tests
├── package.json
└── README.md
```

## Assumptions & Trade-offs

- **SQLite** was chosen over JSON file storage for concurrent access safety and atomicity.
- **Fork-based workers** provide process isolation — a crashing worker doesn't affect others.
- **Polling** (300ms interval) is used instead of database triggers for simplicity and portability.
- **No in-memory queue** — all state lives in SQLite, enabling crash recovery at the cost of per-job database round-trips.
- **Shell execution** (`spawn` with `shell: true`) enables running any system command but inherits shell quoting rules.
- **Windows graceful shutdown** uses a `.worker-stop.json` file as a fallback because `SIGTERM` emulation on Windows may terminate processes immediately.

## Demo

A video demonstration is available at: [Demo Link] (https://drive.google.com/file/d/1nfaQDSy3LtYWfiS9pMILcCQLq702QpYO/view?usp=sharing)
