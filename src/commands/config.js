const { getDb } = require("../db");
const { getConfigValue, setConfigValue } = require("../jobStore");

function configCommand(key, value) {
  const db = getDb();

  if (!key) {
    console.table({
      "max-retries": getConfigValue(db, "max-retries", "3"),
      "backoff-base": getConfigValue(db, "backoff-base", "2")
    });
    return;
  }

  setConfigValue(db, key, value);

  console.log(`${key} updated to ${value}`);
}

module.exports = configCommand;