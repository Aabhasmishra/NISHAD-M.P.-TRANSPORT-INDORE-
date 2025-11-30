const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '43.230.202.198',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER || 'mp_transport',
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || 'mp_transport',
  max: process.env.DB_MAX_CLIENTS ? Number(process.env.DB_MAX_CLIENTS) : 10,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT_MS ? Number(process.env.DB_IDLE_TIMEOUT_MS) : 30000,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, getClient, close };
