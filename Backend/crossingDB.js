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

async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crossing_statement (
          cx_number VARCHAR(50) PRIMARY KEY,
          date VARCHAR(255) NOT NULL,
          builty_no TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Crossing Statement table initialized successfully");
  } catch (err) {
    console.error("Crossing Statement initialization error:", err);
    throw err;
  }
}

async function generateCXNumber() {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = `${currentYear}CX`;

    const { rows } = await pool.query(
        `SELECT cx_number FROM crossing_statement
         WHERE cx_number LIKE $1
         ORDER BY cx_number DESC LIMIT 1`,
        [`${prefix}%`]
    );

    if (rows.length === 0) {
        return `${prefix}00001`;
    }

    const lastCXNumber = rows[0].cx_number;
    const numericPart = parseInt(lastCXNumber.substring(prefix.length)) || 0;
    const newNumericPart = numericPart + 1;

    return `${prefix}${newNumericPart.toString().padStart(5, "0")}`;
}

async function saveCrossingStatement(crossingData) {
  const cxNumber = await generateCXNumber();

  await pool.query(
    `INSERT INTO crossing_statement (
      cx_number, date, builty_no
    ) VALUES (
      $1, $2, $3
    )`,
    [
      cxNumber,
      crossingData.date,
      crossingData.builty_no,
    ]
  );

  return {
    cx_number: cxNumber,
    created_at: new Date().toISOString(),
  };
}

async function getCrossingStatement(cxNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM crossing_statement WHERE cx_number = $1`,
    [cxNumber]
  );
  return rows[0];
}

async function getAllCrossingStatements() {
  const { rows } = await pool.query(
    `SELECT * FROM crossing_statement ORDER BY created_at DESC`
  );
  return rows;
}

async function updateCrossingStatement(cxNumber, crossingData) {
  const { rowCount } = await pool.query(
    `UPDATE crossing_statement SET
      date = $1,
      builty_no = $2,
      updated_at = NOW()
    WHERE cx_number = $3`,
    [
      crossingData.date,
      crossingData.builty_no,
      cxNumber,
    ]
  );

  if (rowCount === 0) return null;

  const { rows } = await pool.query(
    `SELECT * FROM crossing_statement WHERE cx_number = $1`,
    [cxNumber]
  );
  return rows[0];
}

async function deleteCrossingStatement(cxNumber) {
  const { rowCount } = await pool.query(
    `DELETE FROM crossing_statement WHERE cx_number = $1`,
    [cxNumber]
  );
  return rowCount > 0;
}

async function inspectDatabase() {
  try {
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'crossing_statement'
      ORDER BY ordinal_position
    `;

    const columnsResult = await pool.query(columnsQuery);

    const contentResult = await pool.query(
      "SELECT * FROM crossing_statement ORDER BY created_at DESC"
    );

    return {
      database: "mp_transport",
      tables: [
        {
          table: "crossing_statement",
          columns: columnsResult.rows,
          Table_Content: contentResult.rows,
        },
      ],
    };
  } catch (err) {
    console.error("Database inspection error:", err);
    throw err;
  }
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

module.exports = {
  initialize,
  saveCrossingStatement,
  getCrossingStatement,
  getAllCrossingStatements,
  updateCrossingStatement,
  deleteCrossingStatement,
  inspectDatabase,
};