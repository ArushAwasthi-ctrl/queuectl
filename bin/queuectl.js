#!/usr/bin/env node

const { Command } = require("commander");

const enqueueCommand = require("../src/commands/enqueue");
const statusCommand = require("../src/commands/status");
const listCommand = require("../src/commands/list");

const { configShow, configSet } = require("../src/commands/config");
const { dlqList, dlqRetry } = require("../src/commands/dlq");

const { workerStartCommand } = require("../src/commands/workerStart");
const workerStopCommand = require("../src/commands/workerStop");

const program = new Command();

program
  .name("queuectl")
  .description(
    "A CLI-based background job queue system with retries, exponential backoff, and a dead letter queue."
  )
  .version("1.0.0");

/* ---------------- Enqueue ---------------- */

program
  .command("enqueue <jobJson>")
  .description(
    'Add a new job to the queue. Example: queuectl enqueue \'{"id":"job1","command":"sleep 2"}\''
  )
  .action(enqueueCommand);

/* ---------------- Worker ---------------- */

const worker = program
  .command("worker")
  .description("Manage worker processes");

worker
  .command("start")
  .description("Start one or more worker processes")
  .option("--count <n>", "Number of workers to start", "1")
  .action(workerStartCommand);

worker
  .command("stop")
  .description("Stop running workers gracefully")
  .action(workerStopCommand);

/* ---------------- Status ---------------- */

program
  .command("status")
  .description("Show queue status")
  .action(statusCommand);

/* ---------------- List ---------------- */

program
  .command("list")
  .description("List jobs")
  .option("--state <state>", "Filter by job state")
  .action(listCommand);

/* ---------------- Config ---------------- */

const config = program
  .command("config")
  .description("Manage queue configuration");

config
  .command("show")
  .description("Show current configuration")
  .action(configShow);

config
  .command("set <key> <value>")
  .description("Set configuration value")
  .action(configSet);

/* ---------------- DLQ ---------------- */

const dlq = program
  .command("dlq")
  .description("Manage dead letter queue");

dlq
  .command("list")
  .description("List dead jobs")
  .action(dlqList);

dlq
  .command("retry <jobId>")
  .description("Retry a dead job")
  .action(dlqRetry);

/* ---------------- Parse ---------------- */

program.parse(process.argv);