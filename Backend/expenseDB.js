/* ============================================================================
   expenseDB.js — data-access for the `expenses` table
   ---------------------------------------------------------------------------
   Exposes:
     getExpensesByStationAndMonth(station, year, month)
     upsertExpenses(station, entries)
     deleteExpenses(expIds)
     buildExpId(station, dateStr)   (exported for reuse / testing)
   ========================================================================== */

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/* Keep this list in sync with the table columns in AAA.js */
const EXPENSE_FIELDS = [
  "hammali",
  "auto_fare",
  "food",
  "petrol",
  "rent",
  "electricity",
  "mobile",
  "internet",
  "stationary",
  "travel",
  "others",
];

const pad = (n) => String(n).padStart(2, "0");

/**
 * Build the primary key from station + date.
 *   buildExpId("Indore", "2026-09-20")  ->  "Indore_200926"
 */
function buildExpId(station, dateStr) {
  const [y, m, d] = dateStr.split("-"); // "YYYY-MM-DD"
  return `${station}_${d}${m}${y.slice(-2)}`;
}

/**
 * Fetch all entries for a given station + month (1-12).
 */
async function getExpensesByStationAndMonth(station, year, month) {
  const startDate = `${year}-${pad(month)}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${pad(endMonth)}-01`;

  const { rows } = await pool.query(
    `SELECT *
       FROM expenses
      WHERE station = $1
        AND expense_date >= $2
        AND expense_date <  $3
      ORDER BY expense_date ASC`,
    [station, startDate, endDate]
  );
  return rows;
}

/**
 * Upsert a batch of entries for a station.
 * Each entry: { expense_date: "YYYY-MM-DD", hammali, auto_fare, ... }
 * exp_id is derived automatically if missing.
 */
async function upsertExpenses(station, entries) {
  const saved = [];
  if (!Array.isArray(entries) || entries.length === 0) return saved;

  const cols = ["exp_id", "station", "expense_date", ...EXPENSE_FIELDS];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const setClause = EXPENSE_FIELDS.map((f) => `${f} = EXCLUDED.${f}`).join(", ");

  for (const entry of entries) {
    if (!entry.expense_date) continue;

    const expId = entry.exp_id || buildExpId(station, entry.expense_date);
    const params = [expId, station, entry.expense_date];

    for (const f of EXPENSE_FIELDS) {
      const raw = entry[f];
      const num = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
      params.push(Number.isFinite(num) ? num : 0);
    }

    const query = `
      INSERT INTO expenses (${cols.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (exp_id) DO UPDATE SET
        ${setClause}
      RETURNING *
    `;

    const { rows } = await pool.query(query, params);
    saved.push(rows[0]);
  }
  return saved;
}

/**
 * Delete a batch of exp_ids. Returns number of rows removed.
 */
async function deleteExpenses(expIds) {
  if (!Array.isArray(expIds) || expIds.length === 0) return 0;
  const { rowCount } = await pool.query(
    `DELETE FROM expenses WHERE exp_id = ANY($1::text[])`,
    [expIds]
  );
  return rowCount;
}

/* No-op — table is created by AAA.js run manually. Kept so Mainserver3 can
   call initialize() uniformly alongside the other DB modules. */
async function initialize() {
  return;
}

module.exports = {
  initialize,
  getExpensesByStationAndMonth,
  upsertExpenses,
  deleteExpenses,
  buildExpId,
  EXPENSE_FIELDS,
};
