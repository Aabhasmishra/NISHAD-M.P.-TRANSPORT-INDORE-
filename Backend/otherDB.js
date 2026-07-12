const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport", // use the same database
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS other_config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    console.log("Other config table initialised in mp_transport");
  } catch (err) {
    console.error("Other config initialisation error:", err);
    throw err;
  }
}

async function getStationList() {
  const { rows } = await pool.query(
    `SELECT value FROM other_config WHERE key = $1`,
    ["station"]
  );
  return rows.length ? rows[0].value : null;
}

async function updateStationList(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("Stations must be a non‑empty array");
  }
  const sorted = [...stations].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const newValue = sorted.join(" | ");
  const query = `
    INSERT INTO other_config (key, value)
    VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  await pool.query(query, ["station", newValue]);
  return newValue;
}

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

module.exports = {
  initialize,
  getStationList,
  updateStationList,
};
