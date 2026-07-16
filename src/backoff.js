
function computeNextRunAt(attempts, baseSeconds = 2, now = Date.now()) {
  const delaySeconds = Math.pow(baseSeconds, attempts);
  return new Date(now + delaySeconds * 1000).toISOString();
}

module.exports = { computeNextRunAt };