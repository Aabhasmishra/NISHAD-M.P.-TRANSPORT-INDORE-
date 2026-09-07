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

// Initialize challan table with all new columns
async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS challan (
          challan_no VARCHAR(50) PRIMARY KEY,
          date VARCHAR(255) NOT NULL,
          truck_no VARCHAR(255) NOT NULL,
          driver_no VARCHAR(255) NOT NULL,
          from_location VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          builty_no TEXT NOT NULL,

          -- New freight fields
          freight_no VARCHAR(50) DEFAULT 'Not Assigned',
          driver_pan VARCHAR(50) DEFAULT '',
          weight DECIMAL(12,2) DEFAULT 0,
          rate DECIMAL(12,2) DEFAULT 0,
          total_freight DECIMAL(12,2) DEFAULT 0,
          advance DECIMAL(12,2) DEFAULT 0,
          deduction DECIMAL(12,2) DEFAULT 0,
          freight_raipur DECIMAL(12,2) DEFAULT 0,
          balance_indore DECIMAL(12,2) DEFAULT 0,
          transaction_date DATE,
          transaction_id VARCHAR(100) DEFAULT '',
          bulk_wt DECIMAL(12,2) DEFAULT 0,
          other_wt DECIMAL(12,2) DEFAULT 0,
          to_pay DECIMAL(12,2) DEFAULT 0,
          paid DECIMAL(12,2) DEFAULT 0,
          plpl DECIMAL(12,2) DEFAULT 0,
          freight_created_at TIMESTAMPTZ,

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

  const { rows } = await pool.query(
    `SELECT challan_no FROM challan
     WHERE challan_no LIKE $1
     ORDER BY challan_no DESC LIMIT 1`,
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}00001`;
  }

  const lastChallanNo = rows[0].challan_no;
  const numericPart = parseInt(lastChallanNo.substring(prefix.length)) || 0;
  const newNumericPart = numericPart + 1;
  return `${prefix}${newNumericPart.toString().padStart(5, "0")}`;
}

// Save challan record – to_pay, paid, plpl are provided by frontend
async function saveChallan(challanData) {
  const challanNo = await generateChallanNo();

  const {
    date, truck_no, driver_no, from, destination, builty_no,
    freight_no = 'Not Assigned',
    driver_pan = '',
    weight = 0,
    rate = 0,
    total_freight = 0,
    advance = 0,
    deduction = 0,
    freight_raipur = 0,
    balance_indore = 0,
    transaction_date = null,
    transaction_id = '',
    bulk_wt = 0,
    other_wt = 0,
    to_pay = 0,
    paid = 0,
    plpl = 0,
    freight_created_at = null
  } = challanData;

  await pool.query(
    `INSERT INTO challan (
      challan_no, date, truck_no, driver_no, from_location, destination, builty_no,
      freight_no, driver_pan, weight, rate, total_freight, advance, deduction,
      freight_raipur, balance_indore, transaction_date, transaction_id,
      bulk_wt, other_wt, to_pay, paid, plpl, freight_created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24
    )`,
    [
      challanNo,
      date,
      truck_no,
      driver_no,
      from,
      destination,
      builty_no,
      freight_no,
      driver_pan,
      weight,
      rate,
      total_freight,
      advance,
      deduction,
      freight_raipur,
      balance_indore,
      transaction_date,
      transaction_id,
      bulk_wt,
      other_wt,
      to_pay,
      paid,
      plpl,
      freight_created_at
    ]
  );

  return {
    challan_no: challanNo,
    created_at: new Date().toISOString(),
  };
}

// Get challan by number (all fields)
async function getChallan(challanNo) {
  const { rows } = await pool.query(`SELECT * FROM challan WHERE challan_no = $1`, [challanNo]);
  return rows[0];
}

// Get all challans (all fields)
async function getAllChallans() {
  const { rows } = await pool.query(`SELECT * FROM challan ORDER BY created_at DESC`);
  return rows;
}

// Update challan record – accepts all fields including to_pay, paid, plpl
async function updateChallan(challanNo, challanData) {
  // Extract all possible fields
  const {
    date, truck_no, driver_no, from, destination, builty_no,
    freight_no, driver_pan, weight, rate, total_freight, advance, deduction,
    freight_raipur, balance_indore, transaction_date, transaction_id,
    bulk_wt, other_wt, to_pay, paid, plpl, freight_created_at
  } = challanData;

  // Build dynamic SET clause
  const updates = [];
  const values = [];
  let idx = 1;

  const fields = [
    { key: 'date', val: date },
    { key: 'truck_no', val: truck_no },
    { key: 'driver_no', val: driver_no },
    { key: 'from_location', val: from },
    { key: 'destination', val: destination },
    { key: 'builty_no', val: builty_no },
    { key: 'freight_no', val: freight_no },
    { key: 'driver_pan', val: driver_pan },
    { key: 'weight', val: weight },
    { key: 'rate', val: rate },
    { key: 'total_freight', val: total_freight },
    { key: 'advance', val: advance },
    { key: 'deduction', val: deduction },
    { key: 'freight_raipur', val: freight_raipur },
    { key: 'balance_indore', val: balance_indore },
    { key: 'transaction_date', val: transaction_date },
    { key: 'transaction_id', val: transaction_id },
    { key: 'bulk_wt', val: bulk_wt },
    { key: 'other_wt', val: other_wt },
    { key: 'to_pay', val: to_pay },
    { key: 'paid', val: paid },
    { key: 'plpl', val: plpl },
    { key: 'freight_created_at', val: freight_created_at }
  ];

  for (const f of fields) {
    if (f.val !== undefined) {
      updates.push(`${f.key} = $${idx++}`);
      values.push(f.val);
    }
  }

  if (updates.length === 0) {
    throw new Error("No fields to update");
  }

  // Always update updated_at
  updates.push(`updated_at = NOW()`);
  values.push(challanNo);

  const query = `UPDATE challan SET ${updates.join(', ')} WHERE challan_no = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

// Delete challan record
async function deleteChallan(challanNo) {
  const { rowCount } = await pool.query(`DELETE FROM challan WHERE challan_no = $1`, [challanNo]);
  return rowCount > 0;
}

// Inspection (unchanged)
async function inspectDatabase() {
  try {
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'challan'
      ORDER BY ordinal_position
    `;
    const columnsResult = await pool.query(columnsQuery);
    const contentResult = await pool.query("SELECT * FROM challan ORDER BY created_at DESC");
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

// Helper: get challans for the last 24 hours (used in daily report)
async function getChallansForPeriod() {
  const { rows } = await pool.query(
    `SELECT challan_no, truck_no, builty_no 
     FROM challan 
     WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours')`
  );
  return rows;
}

// Keep getTodayChallans for backward compatibility
async function getTodayChallans() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const { rows } = await pool.query(
    `SELECT challan_no, truck_no, builty_no FROM challan WHERE date = $1`,
    [dateStr]
  );
  return rows;
}

async function getLatestChallan() {
  const { rows } = await pool.query(
    `SELECT challan_no FROM challan ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0]?.challan_no || null;
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

module.exports = {
  initialize,
  saveChallan,
  getChallan,
  getAllChallans,
  updateChallan,
  deleteChallan,
  inspectDatabase,
  getTodayChallans,
  getChallansForPeriod,
  getLatestChallan
};
