const { Client } = require('pg');
require('dotenv').config();

const db = new Client({
  host: process.env.DB_HOST || '43.230.202.198',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'mp_transport',
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || 'mp_transport'
});

const VALID_BRANCHES_FOR_EMPLOYEE = ['Indore', 'Raipur'];

// Resolve the branch value based on type.
function resolveBranch(type, branch) {
  if (type === 'Admin') return 'All';
  if (type === 'Employee') {
    if (!VALID_BRANCHES_FOR_EMPLOYEE.includes(branch)) {
      throw new Error('Employee branch must be either "Indore" or "Raipur".');
    }
    return branch;
  }
  throw new Error('User type must be either "Admin" or "Employee".');
}

// Connect to DB and initialize user table
async function initialize() {
  try {
    await db.connect();

    // Create users table if not exists (includes branch from the start for fresh installs)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('Admin', 'Employee')),
        mobile_number VARCHAR(15) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Inactive')),
        branch VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    // Ensure branch column exists (for legacy tables created before this change)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(20)`);

    // Backfill existing rows so the constraint below can be applied
    await db.query(
      `UPDATE users SET branch = 'All'
       WHERE type = 'Admin' AND (branch IS NULL OR branch <> 'All')`
    );
    await db.query(
      `UPDATE users SET branch = 'Indore'
       WHERE type = 'Employee' AND (branch IS NULL OR branch NOT IN ('Indore','Raipur'))`
    );

    // Enforce NOT NULL now that everything is filled in
    await db.query(`ALTER TABLE users ALTER COLUMN branch SET NOT NULL`);

    // Enforce branch/type consistency
    await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_branch_check`);
    await db.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_branch_check
      CHECK (
        (type = 'Admin'    AND branch = 'All') OR
        (type = 'Employee' AND branch IN ('Indore','Raipur'))
      )
    `);

    const { rows } = await db.query(
      `SELECT * FROM users WHERE name = 'Aabhas' LIMIT 1`
    );

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO users (name, password, type, mobile_number, status, branch)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['Aabhas', '1234', 'Admin', '1234567890', 'Active', 'All']
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
    `SELECT id, name, password, type, mobile_number, status, branch
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
  const branch = resolveBranch(userData.type, userData.branch);
  const { rows } = await db.query(
    `INSERT INTO users (name, password, type, mobile_number, status, branch)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, type, mobile_number, status, branch`,
    [
      userData.name,
      userData.password,
      userData.type,
      userData.mobile_number,
      userData.status || 'Active',
      branch
    ]
  );
  return rows[0];
}

// Update user
async function updateUser(id, userData) {
  const existing = await getUserById(id);
  if (!existing) return null;

  const finalType = userData.type ?? existing.type;

  let finalBranch;
  if (finalType === 'Admin') {
    // Admin is always 'All'
    finalBranch = 'All';
  } else {
    // Employee: use provided branch, else keep existing if valid, else error
    const candidate = userData.branch ?? existing.branch;
    if (!VALID_BRANCHES_FOR_EMPLOYEE.includes(candidate)) {
      throw new Error('Employee branch must be either "Indore" or "Raipur".');
    }
    finalBranch = candidate;
  }

  const { rows } = await db.query(
    `UPDATE users SET
      name = COALESCE($1, name),
      password = COALESCE($2, password),
      type = $3,
      mobile_number = COALESCE($4, mobile_number),
      status = COALESCE($5, status),
      branch = $6,
      updated_at = NOW()
     WHERE id = $7
     RETURNING id, name, type, mobile_number, status, branch`,
    [
      userData.name,
      userData.password,
      finalType,
      userData.mobile_number,
      userData.status,
      finalBranch,
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
    `SELECT id, name, password, type, mobile_number, status, branch
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
  query: db.query.bind(db),
  inspectDatabase
};
