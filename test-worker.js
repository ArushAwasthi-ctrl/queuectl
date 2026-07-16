const { getDb } = require('./src/db');
const { enqueueJob } = require('./src/jobStore');
const db = getDb();
enqueueJob(db, { id: 'w-job-1', command: 'echo one' });
enqueueJob(db, { id: 'w-job-2', command: 'echo two' });
enqueueJob(db, { id: 'w-job-3', command: 'exit 1', max_retries: 2 });
console.log('Enqueued 3 jobs');