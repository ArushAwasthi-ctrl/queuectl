#!/usr/bin/env node

const { Command } = require('commander');
const enqueueCommand = require('../src/commands/enqueue');

const program = new Command();

program
  .name('queuectl')
  .description('A CLI-based background job queue system with retries, exponential backoff, and a dead letter queue.')
  .version('1.0.0');

program
  .command('enqueue <jobJson>')
  .description('Add a new job to the queue. Example: queuectl enqueue \'{"id":"job1","command":"sleep 2"}\'')
  .action(enqueueCommand);

const { workerStartCommand } = require('../src/commands/workerStart');
const workerStopCommand = require('../src/commands/workerStop');

const worker = program.command('worker').description('Manage worker processes');

worker
  .command('start')
  .description('Start one or more worker processes')
  .option('--count <n>', 'number of workers to start', '1')
  .action(workerStartCommand);

worker
  .command('stop')
  .description('Stop running workers gracefully (finishes current job before exiting)')
  .action(workerStopCommand);



program.parse(process.argv);