const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport",
});

// Initialize challan table
async function initialize() {
  await db.connect();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS challan (
          challan_no VARCHAR(50) PRIMARY KEY,
          date VARCHAR(255) NOT NULL,
          truck_no VARCHAR(255) NOT NULL,
          driver_no VARCHAR(255) NOT NULL,
          from_location VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          builty_no TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Challan table initialized successfully");
  } catch (err) {
    console.error("Challan initialization error:", err);
    throw err;
  }
}

// Generate new challan number with year prefix (e.g., 25CH00001)
async function generateChallanNo() {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = `${currentYear}CH`;

    const { rows } = await db.query(
        `SELECT challan_no FROM challan
         WHERE challan_no LIKE $1
         ORDER BY challan_no DESC LIMIT 1`,
        [`${prefix}%`]
    );

    if (rows.length === 0) {
        return `${prefix}00001`;
    }

    const lastChallanNo = rows[0].challan_no;
    // Extracts the numeric part after "CH"
    const numericPart = parseInt(lastChallanNo.substring(prefix.length)) || 0;
    const newNumericPart = numericPart + 1;

    return `${prefix}${newNumericPart.toString().padStart(5, "0")}`;
}


// Save challan record
async function saveChallan(challanData) {
  const challanNo = await generateChallanNo();

  await db.query(
    `INSERT INTO challan (
      challan_no, date, truck_no, driver_no, from_location, 
      destination, builty_no
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7
    )`,
    [
      challanNo,
      challanData.date,
      challanData.truck_no,
      challanData.driver_no,
      challanData.from,
      challanData.destination,
      challanData.builty_no,
    ]
  );

  return {
    challan_no: challanNo,
    created_at: new Date().toISOString(),
  };
}

// Get challan by number
async function getChallan(challanNo) {
  const { rows } = await db.query(
    `SELECT * FROM challan WHERE challan_no = $1`,
    [challanNo]
  );
  return rows[0];
}

// Get all challans
async function getAllChallans() {
  const { rows } = await db.query(
    `SELECT * FROM challan ORDER BY created_at DESC`
  );
  return rows;
}

// Update challan record
async function updateChallan(challanNo, challanData) {
  const { rowCount } = await db.query(
    `UPDATE challan SET
      date = $1,
      truck_no = $2,
      driver_no = $3,
      from_location = $4,
      destination = $5,
      builty_no = $6,
      updated_at = NOW()
    WHERE challan_no = $7`,
    [
      challanData.date,
      challanData.truck_no,
      challanData.driver_no,
      challanData.from,
      challanData.destination,
      challanData.builty_no,
      challanNo,
    ]
  );

  if (rowCount === 0) return null;

  const { rows } = await db.query(
    `SELECT * FROM challan WHERE challan_no = $1`,
    [challanNo]
  );
  return rows[0];
}

// Delete challan record
async function deleteChallan(challanNo) {
  const { rowCount } = await db.query(
    `DELETE FROM challan WHERE challan_no = $1`,
    [challanNo]
  );
  return rowCount > 0;
}

async function inspectDatabase() {
  try {
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'challan'
      ORDER BY ordinal_position
    `;

    const columnsResult = await db.query(columnsQuery);

    const contentResult = await db.query(
      "SELECT * FROM challan ORDER BY created_at DESC"
    );

    return {
      database: "mp_transport",
      tables: [
        {
          table: "challan",
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
  saveChallan,
  getChallan,
  getAllChallans,
  updateChallan,
  deleteChallan,
  inspectDatabase,
};
