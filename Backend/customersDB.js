const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport",
});

// Connect to DB and initialize customers table
async function initialize() {
  await db.connect();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        id_type VARCHAR(50) NOT NULL,
        id_number VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    try {
      await db.query(`
        ALTER TABLE customers 
        DROP COLUMN IF EXISTS gst
      `);
    } catch (err) {
      console.log("GST column already removed or never existed");
    }

    console.log("Customers table initialized successfully");
  } catch (err) {
    console.error("Customers initialization error:", err);
    throw err;
  }
}

// Check if ID number already exists
async function checkIdNumberExists(idNumber, excludeCustomerCode = null) {
  let query = `SELECT customer_code, name FROM customers WHERE id_number = $1`;
  let params = [idNumber];
  
  if (excludeCustomerCode) {
    query += ` AND customer_code != $2`;
    params.push(excludeCustomerCode);
  }
  
  const { rows } = await db.query(query, params);
  return rows.length > 0 ? rows[0] : null;
}

// Generate customer code (C0001, A0001, etc.)
async function generateCustomerCode(name) {
  const prefix = name.charAt(0).toUpperCase();
  const { rows } = await db.query(
    `SELECT customer_code FROM customers 
     WHERE customer_code LIKE $1 
     ORDER BY customer_code DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const nextNum = rows.length
    ? parseInt(rows[0].customer_code.slice(1)) + 1
    : 1;
  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
}

// Get customer by name
async function getCustomerByName(name) {
  const { rows } = await db.query(
    `SELECT * FROM customers WHERE name ILIKE $1 LIMIT 1`,
    [`%${name}%`]
  );
  return rows[0];
}

// Get all customer names
async function getAllCustomerNames() {
  const { rows } = await db.query(
    `SELECT name FROM customers ORDER BY name ASC`
  );
  return rows.map(row => row.name);
}

// Get all customers
async function getAllCustomers() {
  const { rows } = await db.query(
    `SELECT * FROM customers ORDER BY name ASC`
  );
  return rows;
}

// Create customer
async function createCustomer(customerData) {
  // Check if ID number already exists
  const existingCustomer = await checkIdNumberExists(customerData.idNumber);
  if (existingCustomer) {
    throw new Error(`A customer with the same ID number already exists. The ID number '${customerData.idNumber}' is already registered under customer '${existingCustomer.name}'. Please use a different ID number.`);
  }

  const code = await generateCustomerCode(customerData.name);
  await db.query(
    `INSERT INTO customers 
     (customer_code, name, type, id_type, id_number, contact_number)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      code,
      customerData.name,
      customerData.type,
      customerData.idType,
      customerData.idNumber,
      customerData.contactNumber
    ]
  );
  return {
    customerCode: code,
    ...customerData
  };
}

// Update customer
async function updateCustomerByName(name, customerData) {
  // First get the current customer to find their customer_code
  const currentCustomer = await getCustomerByName(name);
  if (!currentCustomer) {
    return false;
  }

  // Check if ID number already exists
  const existingCustomer = await checkIdNumberExists(customerData.idNumber, currentCustomer.customer_code);
  if (existingCustomer) {
    throw new Error(`A customer with the same ID number already exists. The ID number '${customerData.idNumber}' is already registered under customer '${existingCustomer.name}'. Please use a different ID number.`);
  }

  const { rowCount } = await db.query(
    `UPDATE customers SET
     name = $1, type = $2, id_type = $3, id_number = $4, contact_number = $5
     WHERE name = $6`,
    [
      customerData.name,
      customerData.type,
      customerData.idType,
      customerData.idNumber,
      customerData.contactNumber,
      name,
    ]
  );
  return rowCount > 0;
}

// Delete customer
async function deleteCustomerByName(name) {
  const { rowCount } = await db.query(
    `DELETE FROM customers WHERE name = $1`,
    [name]
  );
  return rowCount > 0;
}

async function inspectDatabase() {
  try {
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await db.query(columnsQuery);
    
    // Get table content
    const contentResult = await db.query('SELECT * FROM customers ORDER BY customer_code');
    
    return {
      database: 'mp_transport',
      tables: [{
        table: 'customers',
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
  getCustomerByName,
  getAllCustomerNames,
  getAllCustomers,
  createCustomer,
  updateCustomerByName,
  deleteCustomerByName,
  inspectDatabase
};