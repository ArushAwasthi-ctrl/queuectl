/**
 * Computes the ISO timestamp at which a job should next become eligible
 * to run, based on exponential backoff: delay = base ^ attempts seconds.
 *
 * e.g. base=2, attempts=1 -> 2s delay
 *      base=2, attempts=2 -> 4s delay
 *      base=2, attempts=3 -> 8s delay
 */
function computeNextRunAt(attempts, baseSeconds = 2, now = Date.now()) {
  const delaySeconds = Math.pow(baseSeconds, attempts);
  return new Date(now + delaySeconds * 1000).toISOString();
}

module.exports = { computeNextRunAt };