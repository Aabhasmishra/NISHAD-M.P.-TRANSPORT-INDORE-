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

// Initialize table (vehicle_number is now TEXT)
async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Transporter-details" (
        owner_name VARCHAR(100) NOT NULL,
        vehicle_number TEXT PRIMARY KEY,
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

// ---------------------------------------------------------------------
// Helper: Check if any of the given vehicle numbers already exist in any record
// (excluding a specific record if provided, useful for updates)
// Returns the first duplicate number found, or null if none.
// ---------------------------------------------------------------------
async function findDuplicateVehicleNumber(numbers, excludeVehicleNumber = null) {
  for (const num of numbers) {
    // We need to check if 'num' appears as a whole vehicle number inside the concatenated string.
    // To avoid partial matches (e.g., "12" matching "123"), we use a stricter pattern:
    // The number must be at the start, at the end, or between separators.
    // But because vehicle numbers are usually alphanumeric and unique, a simple LIKE with '%' works.
    // However, to be safe, we'll use a regex-like approach using POSITION and string functions.
    // We'll check if the number is present as a standalone token between separators.
    // SQL: vehicle_number LIKE '%' || $1 || '%'   (simple but may give false positives)
    // For better accuracy, we'll use array intersection (split and compare) in PostgreSQL.
    // But that's heavier. Since vehicle numbers are distinct patterns, LIKE is acceptable.
    let query = `
      SELECT vehicle_number FROM "Transporter-details"
      WHERE vehicle_number LIKE '%' || $1 || '%'
    `;
    const params = [num];
    if (excludeVehicleNumber) {
      query += ` AND vehicle_number != $2`;
      params.push(excludeVehicleNumber);
    }
    const result = await pool.query(query, params);
    if (result.rows.length > 0) {
      // Double-check to avoid false positives: split the found vehicle numbers and see if any exactly matches.
      // This is extra safety.
      for (const row of result.rows) {
        const existingNumbers = row.vehicle_number.split(' | ').map(s => s.trim());
        if (existingNumbers.includes(num)) {
          return num; // exact match found
        }
      }
      // If no exact match after split, continue checking others.
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Create a new transporter
// ---------------------------------------------------------------------
async function createTransporter(transporterData, file) {
  const { vehicleNumber, ownerName, type, idType, idNumber, aadhaarNumber, contactNumber, comments } = transporterData;

  // Split the concatenated string into individual numbers
  const numbers = vehicleNumber.split(' | ').map(s => s.trim()).filter(s => s.length > 0);
  if (numbers.length === 0) {
    throw new Error("At least one vehicle number is required");
  }

  // Check for duplicates across all records
  const duplicate = await findDuplicateVehicleNumber(numbers);
  if (duplicate) {
    throw new Error(`Vehicle number "${duplicate}" is already registered with another transporter`);
  }

  await pool.query(
    `INSERT INTO "Transporter-details" 
     (owner_name, vehicle_number, type, id_type, id_number, 
      aadhaar_number, contact_number, declaration_upload, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      ownerName,
      vehicleNumber,
      type,
      idType,
      idNumber,
      aadhaarNumber || null,
      contactNumber,
      file ? file.path : null,
      comments || null,
    ]
  );

  return { vehicleNumber };
}

// ---------------------------------------------------------------------
// Get all transporters (only vehicle numbers – for autocomplete suggestions)
// ---------------------------------------------------------------------
async function getAllTransporters() {
  const { rows } = await pool.query(
    `SELECT vehicle_number FROM "Transporter-details"`
  );
  return rows; // each row has vehicle_number (concatenated string)
}

// ---------------------------------------------------------------------
// Get transporter by any vehicle number (partial match) or by owner name
// ---------------------------------------------------------------------
async function getTransporter(searchTerm) {
  // Search for any record where the concatenated vehicle_number contains the searchTerm
  // or owner name matches (partial)
  const { rows } = await pool.query(
    `SELECT * FROM "Transporter-details" 
     WHERE vehicle_number LIKE '%' || $1 || '%' 
        OR owner_name ILIKE '%' || $1 || '%'
     LIMIT 1`,
    [searchTerm]
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

// ---------------------------------------------------------------------
// Update transporter
// ---------------------------------------------------------------------
async function updateTransporter(oldVehicleNumber, transporterData) {
  const { vehicleNumber, ownerName, type, idType, idNumber, aadhaarNumber, contactNumber, declaration_upload, comments } = transporterData;

  // Check if transporter exists
  const checkResult = await pool.query(
    `SELECT * FROM "Transporter-details" WHERE vehicle_number = $1`,
    [oldVehicleNumber]
  );
  if (checkResult.rows.length === 0) {
    throw new Error("Transporter not found");
  }

  // If the concatenated vehicle number string is changing, validate the new numbers
  if (vehicleNumber !== oldVehicleNumber) {
    const numbers = vehicleNumber.split(' | ').map(s => s.trim()).filter(s => s.length > 0);
    if (numbers.length === 0) {
      throw new Error("At least one vehicle number is required");
    }
    // Check duplicates, excluding the current record itself
    const duplicate = await findDuplicateVehicleNumber(numbers, oldVehicleNumber);
    if (duplicate) {
      throw new Error(`Vehicle number "${duplicate}" is already registered with another transporter`);
    }
  }

  await pool.query(
    `UPDATE "Transporter-details" SET
     owner_name = $1, type = $2, id_type = $3,
     id_number = $4, aadhaar_number = $5, contact_number = $6,
     declaration_upload = $7, comments = $8, vehicle_number = $9
     WHERE vehicle_number = $10`,
    [
      ownerName,
      type,
      idType,
      idNumber,
      aadhaarNumber || null,
      contactNumber,
      declaration_upload,
      comments || null,
      vehicleNumber,        // new concatenated string
      oldVehicleNumber,     // used in WHERE clause
    ]
  );
}

// ---------------------------------------------------------------------
// Delete transporter
// ---------------------------------------------------------------------
async function deleteTransporter(vehicleNumber) {
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

// ---------------------------------------------------------------------
// Database inspection (unchanged)
// ---------------------------------------------------------------------
async function inspectDatabase() {
  try {
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

// Graceful shutdown
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
