const db = require('./db');

// Connect to DB and initialize user table
async function initialize() {
  try {
    // Create users table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('Admin', 'Employee')),
        mobile_number VARCHAR(15) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Inactive')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    const { rows } = await db.query(
      `SELECT * FROM users WHERE name = 'Aabhas' LIMIT 1`
    );

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO users (name, password, type, mobile_number, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['Aabhas', '1234', 'Admin', '1234567890', 'Active']
      );
      console.log('Default admin user created successfully');
    }

    console.log('Users table initialized successfully');
  } catch (err) {
    console.error('Error initializing users table:', err);
    throw err;
  }
}

// Search user by name
async function searchUsers(name) {
  const { rows } = await db.query(
    `SELECT id, name, password, type, mobile_number, status 
     FROM users 
     WHERE name ILIKE $1
     ORDER BY name ASC`,
    [`%${name}%`]
  );
  return rows;
}

// Get user by ID
async function getUserById(id) {
  const { rows } = await db.query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0];
}

// Create new user
async function createUser(userData) {
  const { rows } = await db.query(
    `INSERT INTO users (name, password, type, mobile_number, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, type, mobile_number, status`,
    [
      userData.name,
      userData.password,
      userData.type,
      userData.mobile_number,
      userData.status || 'Active'
    ]
  );
  return rows[0];
}

// Update user
async function updateUser(id, userData) {
  const { rows } = await db.query(
    `UPDATE users SET
      name = COALESCE($1, name),
      password = COALESCE($2, password),
      type = COALESCE($3, type),
      mobile_number = COALESCE($4, mobile_number),
      status = COALESCE($5, status),
      updated_at = NOW()
     WHERE id = $6
     RETURNING id, name, type, mobile_number, status`,
    [
      userData.name,
      userData.password,
      userData.type,
      userData.mobile_number,
      userData.status,
      id
    ]
  );
  return rows[0];
}

// Delete user
async function deleteUser(id) {
  const { rowCount } = await db.query(
    `DELETE FROM users WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

// Get all users (for listing)
async function getAllUsers() {
  const { rows } = await db.query(
    `SELECT id, name, password, type, mobile_number, status 
     FROM users 
     ORDER BY name ASC`
  );
  return rows;
}

async function inspectDatabase() {
  try {
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await db.query(columnsQuery);
    
    const contentResult = await db.query('SELECT * FROM users ORDER BY id ASC');
    
    return {
      database: 'mp_transport',
      tables: [{
        table: 'users',
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
  searchUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  query: db.query,
  inspectDatabase
};