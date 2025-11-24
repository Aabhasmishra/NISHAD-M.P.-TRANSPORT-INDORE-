const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport",
});

// Initialize status table
async function initialize() {
  await db.connect();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS status (
          gr_no VARCHAR(50) PRIMARY KEY,
          challan_status VARCHAR(255) DEFAULT 'Book',
          payment_status VARCHAR(255) DEFAULT 'NA',
          crossing_status VARCHAR(255) DEFAULT 'Book'
      )
    `);

    console.log("Status table initialized successfully");
  } catch (err) {
    console.error("Status initialization error:", err);
    throw err;
  }
}

// Get all status records
async function getAllStatus() {
  const { rows } = await db.query(
    `SELECT * FROM status ORDER BY gr_no`
  );
  return rows;
}

// Get status by GR number
async function getStatus(grNo) {
  const { rows } = await db.query(
    `SELECT * FROM status WHERE gr_no = $1`,
    [grNo]
  );
  return rows[0];
}

// Create new status
async function createStatus(grNo, challanStatus = 'Book', paymentStatus = 'NA', crossingStatus = 'Book') {
  try {
    const { rowCount } = await db.query(
      `INSERT INTO status (gr_no, challan_status, payment_status, crossing_status) 
       VALUES ($1, $2, $3, $4)`,
      [grNo, challanStatus, paymentStatus, crossingStatus]
    );
    
    return rowCount > 0;
  } catch (err) {
    if (err.code === '23505') { 
      console.log("Status already exists for GR:", grNo);
      return true;
    }
    throw err;
  }
}

// Update status
async function updateStatus(grNo, challanStatus, paymentStatus, crossingStatus) {
  const { rowCount } = await db.query(
    `INSERT INTO status (gr_no, challan_status, payment_status, crossing_status) 
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (gr_no) 
     DO UPDATE SET challan_status = $2, payment_status = $3, crossing_status = $4`,
    [grNo, challanStatus, paymentStatus, crossingStatus]
  );
  
  return rowCount > 0;
}

// Update challan status only
async function updateChallanStatus(grNo, challanStatus) {
  const { rowCount } = await db.query(
    `UPDATE status SET challan_status = $1 WHERE gr_no = $2`,
    [challanStatus, grNo]
  );
  
  return rowCount > 0;
}

// Update payment status only
async function updatePaymentStatus(grNo, paymentStatus) {
  const { rowCount } = await db.query(
    `UPDATE status SET payment_status = $1 WHERE gr_no = $2`,
    [paymentStatus, grNo]
  );
  
  return rowCount > 0;
}

// Update crossing status only
async function updateCrossingStatus(grNo, crossingStatus) {
  const { rowCount } = await db.query(
    `UPDATE status SET crossing_status = $1 WHERE gr_no = $2`,
    [crossingStatus, grNo]
  );
  
  return rowCount > 0;
}

// Delete status record
async function deleteStatus(grNo) {
  const { rowCount } = await db.query(
    `DELETE FROM status WHERE gr_no = $1`,
    [grNo]
  );
  return rowCount > 0;
}

async function inspectDatabase() {
  try {
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'status'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await db.query(columnsQuery);
    
    // Get table content
    const contentResult = await db.query('SELECT * FROM status ORDER BY gr_no');
    
    return {
      database: 'mp_transport',
      tables: [{
        table: 'status',
        columns: columnsResult.rows,
        Table_Content: contentResult.rows
      }]
    };
  } catch (err) {
    console.error("Database inspection error:", err);
    throw err;
  }
}

module.exports = {
  initialize,
  getStatus,
  getAllStatus,
  createStatus,
  updateStatus,
  updateChallanStatus,
  updatePaymentStatus,
  updateCrossingStatus,
  deleteStatus,
  inspectDatabase
};