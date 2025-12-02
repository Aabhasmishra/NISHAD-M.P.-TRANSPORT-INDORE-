const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");
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

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Transporter-details" (
        owner_name VARCHAR(100) NOT NULL,
        vehicle_number VARCHAR(20) PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('Individual', 'Company')),
        id_type VARCHAR(20) NOT NULL CHECK (id_type IN ('GST number', 'PAN number')),
        id_number VARCHAR(20) NOT NULL,
        aadhaar_number VARCHAR(12),
        contact_number VARCHAR(15) NOT NULL,
        declaration_upload TEXT,
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("Transporter details table initialized successfully");
  } catch (err) {
    console.error("Transporter initialization error:", err);
    throw err;
  }
}

// Create a new transporter
async function createTransporter(transporterData, file) {
  const { vehicleNumber } = transporterData;

  // Check if vehicle number already exists
  const checkResult = await pool.query(
    `SELECT * FROM "Transporter-details" WHERE vehicle_number = $1`,
    [vehicleNumber]
  );

  if (checkResult.rows.length > 0) {
    throw new Error("Vehicle number already exists");
  }

  await pool.query(
    `INSERT INTO "Transporter-details" 
     (owner_name, vehicle_number, type, id_type, id_number, 
      aadhaar_number, contact_number, declaration_upload, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      transporterData.ownerName,
      vehicleNumber,
      transporterData.type,
      transporterData.idType,
      transporterData.idNumber,
      transporterData.aadhaarNumber || null,
      transporterData.contactNumber,
      file ? file.path : null,
      transporterData.comments || null,
    ]
  );

  return { vehicleNumber };
}

// Get all transporters 
async function getAllTransporters() {
  const { rows } = await pool.query(
    `SELECT vehicle_number FROM "Transporter-details"`
  );
  return rows;
}

// Get transporter by vehicle number or search
async function getTransporter(searchTerm) {
  const { rows } = await pool.query(
    `SELECT * FROM "Transporter-details" 
     WHERE vehicle_number = $1 
     OR owner_name ILIKE $2 
     LIMIT 1`,
    [searchTerm, `%${searchTerm}%`]
  );

  if (rows.length === 0) {
    throw new Error("Transporter not found");
  }

  const transporter = rows[0];
  return {
    owner_name: transporter.owner_name,
    vehicle_number: transporter.vehicle_number,
    type: transporter.type,
    id_type: transporter.id_type,
    id_number: transporter.id_number,
    aadhaar_number: transporter.aadhaar_number,
    contact_number: transporter.contact_number,
    declaration_upload: transporter.declaration_upload,
    comments: transporter.comments,
  };
}

// Update transporter
async function updateTransporter(vehicleNumber, transporterData) {
  // Check if transporter exists
  const checkResult = await pool.query(
    `SELECT * FROM "Transporter-details" WHERE vehicle_number = $1`,
    [vehicleNumber]
  );

  if (checkResult.rows.length === 0) {
    throw new Error("Transporter not found");
  }

  await pool.query(
    `UPDATE "Transporter-details" SET
     owner_name = $1, type = $2, id_type = $3,
     id_number = $4, aadhaar_number = $5, contact_number = $6,
     declaration_upload = $7, comments = $8
     WHERE vehicle_number = $9`,
    [
      transporterData.ownerName,
      transporterData.type,
      transporterData.idType,
      transporterData.idNumber,
      transporterData.aadhaarNumber || null,
      transporterData.contactNumber,
      transporterData.declaration_upload,
      transporterData.comments || null,
      vehicleNumber,
    ]
  );
}

// Delete transporter
async function deleteTransporter(vehicleNumber) {
  // check if transporter exists
  const checkResult = await pool.query(
    `SELECT * FROM "Transporter-details" WHERE vehicle_number = $1`,
    [vehicleNumber]
  );

  if (checkResult.rows.length === 0) {
    throw new Error("Transporter not found");
  }

  await pool.query(
    `DELETE FROM "Transporter-details" WHERE vehicle_number = $1`,
    [vehicleNumber]
  );
}

// Database inspection
async function inspectDatabase() {
  try {
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Transporter-details'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    const contentResult = await pool.query('SELECT * FROM "Transporter-details" ORDER BY created_at DESC');
    
    return {
      database: 'mp_transport',
      tables: [{
        table: 'Transporter-details',
        columns: columnsResult.rows,
        Table_Content: contentResult.rows
      }]
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
  upload,
  createTransporter,
  getAllTransporters,
  getTransporter,
  updateTransporter,
  deleteTransporter,
  inspectDatabase,
};