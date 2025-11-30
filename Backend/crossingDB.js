const db = require('./db');

// Initialize crossing_statement table
async function initialize() {
  try {
    await db.query(`
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

// Generate new crossing statement number with year prefix (e.g., 25CX00001)
async function generateCXNumber() {
    const currentYear = new Date().getFullYear().toString().slice(-2); // "25" for 2025
    const prefix = `${currentYear}CX`;

    const { rows } = await db.query(
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

// Save crossing statement record
async function saveCrossingStatement(crossingData) {
  const cxNumber = await generateCXNumber();

  await db.query(
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

// Get crossing statement by number
async function getCrossingStatement(cxNumber) {
  const { rows } = await db.query(
    `SELECT * FROM crossing_statement WHERE cx_number = $1`,
    [cxNumber]
  );
  return rows[0];
}

// Get all crossing statements
async function getAllCrossingStatements() {
  const { rows } = await db.query(
    `SELECT * FROM crossing_statement ORDER BY created_at DESC`
  );
  return rows;
}

// Update crossing statement record
async function updateCrossingStatement(cxNumber, crossingData) {
  const { rowCount } = await db.query(
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

  const { rows } = await db.query(
    `SELECT * FROM crossing_statement WHERE cx_number = $1`,
    [cxNumber]
  );
  return rows[0];
}

// Delete crossing statement record
async function deleteCrossingStatement(cxNumber) {
  const { rowCount } = await db.query(
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

    const columnsResult = await db.query(columnsQuery);

    const contentResult = await db.query(
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

module.exports = {
  initialize,
  saveCrossingStatement,
  getCrossingStatement,
  getAllCrossingStatements,
  updateCrossingStatement,
  deleteCrossingStatement,
  inspectDatabase,
};