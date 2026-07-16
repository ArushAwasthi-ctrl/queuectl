const { getDb } = require("../db");
const { getConfigValue, setConfigValue } = require("../jobStore");

function configShow() {
  const db = getDb();

  console.table({
    "max-retries": getConfigValue(db, "max-retries", "3"),
    "backoff-base": getConfigValue(db, "backoff-base", "2"),
  });
}

function configSet(key, value) {
  const db = getDb();

  const allowedKeys = ["max-retries", "backoff-base"];

  if (!allowedKeys.includes(key)) {
    console.error(
      `Invalid configuration key "${key}". Allowed keys: ${allowedKeys.join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  if (isNaN(Number(value)) || Number(value) < 1) {
    console.error("Configuration value must be a positive number.");
    process.exitCode = 1;
    return;
  }

  setConfigValue(db, key, value);

  console.log(`Updated "${key}" to ${value}`);
}

module.exports = {
  configShow,
  configSet,
};