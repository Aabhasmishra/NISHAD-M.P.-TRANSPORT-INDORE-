const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.DB_HOST || "43.230.202.198",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "mp_transport",
  password: process.env.DB_PASSWORD || 'abcde"',
  database: process.env.DB_NAME || "mp_transport",
});

// Connect to DB and initialize payment table
async function initialize() {
  await db.connect();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment (
        invoice_number VARCHAR(50) PRIMARY KEY,
        invoice_type VARCHAR(10) NOT NULL,
        invoice_amount DECIMAL(12,2) NOT NULL,
        amount_collected DECIMAL(12,2) NOT NULL,
        mode_of_collection VARCHAR(20) NOT NULL,
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Payment table initialized successfully");
    return true;
  } catch (err) {
    console.error("Payment table initialization error:", err);
    throw err;
  }
}

function calculateInvoiceAmount(amountString) {
  if (!amountString) return 0;
  const amounts = amountString.split('|').map(Number);
  return amounts.reduce((sum, val) => sum + val, 0);
}

// Get transport record by GR number (invoice number)
async function getTransportRecordByGR(grNo) {
  try {
    const { rows } = await db.query(
      `SELECT 
        gr_no,
        to_pay,
        paid,
        consignor_name,
        consignee_name,
        date,
        created_at
       FROM transport_records 
       WHERE gr_no = $1`,
      [grNo]
    );

    if (rows.length === 0) {
      return null;
    }

    const record = rows[0];
    const invoiceType = parseFloat(record.paid) === 0 ? 'To Pay' : 'Paid';
    const invoiceAmount = parseFloat(record.paid) === 0 ? parseFloat(record.to_pay) : parseFloat(record.paid);

    return {
      invoiceNumber: record.gr_no,
      invoiceType,
      invoiceAmount,
      consignor: record.consignor_name,
      consignee: record.consignee_name,
      date: record.date,
      createdAt: record.created_at
    };
  } catch (err) {
    console.error("Error fetching transport record:", err);
    throw err;
  }
}

// Create a new payment
async function createPayment(paymentData) {
  try {
    const { invoiceNumber, invoiceType, invoiceAmount, amountCollected, modeOfCollection, comments } = paymentData;
    
    const result = await db.query(
      `INSERT INTO payment (
        invoice_number, 
        invoice_type, 
        invoice_amount, 
        amount_collected, 
        mode_of_collection, 
        comments
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING invoice_number`,
      [invoiceNumber, invoiceType, invoiceAmount, amountCollected, modeOfCollection, comments]
    );

    return {
      invoice_number: result.rows[0].invoice_number,
      message: 'Payment recorded successfully'
    };
  } catch (err) {
    console.error("Error creating payment:", err);
    throw err;
  }
}

// Get payment by invoice number
async function getPaymentByInvoice(invoiceNumber) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM payment WHERE invoice_number = $1`,
      [invoiceNumber]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (err) {
    console.error("Error fetching payment:", err);
    throw err;
  }
}

// Get all payments
async function getAllPayments(limit = 100) {
  try {
    const { rows } = await db.query(
      `SELECT * FROM payment ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return rows;
  } catch (err) {
    console.error("Error fetching payments:", err);
    throw err;
  }
}

// Update payment
async function updatePayment(invoiceNumber, updateData) {
  try {
    const { amountCollected, modeOfCollection, comments } = updateData;
    
    const result = await db.query(
      `UPDATE payment 
       SET 
         amount_collected = $1,
         mode_of_collection = $2,
         comments = $3,
         updated_at = NOW()
       WHERE invoice_number = $4
       RETURNING *`,
      [amountCollected, modeOfCollection, comments, invoiceNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      invoice_number: result.rows[0].invoice_number,
      message: 'Payment updated successfully'
    };
  } catch (err) {
    console.error("Error updating payment:", err);
    throw err;
  }
}

// Delete payment
async function deletePayment(invoiceNumber) {
  try {
    const result = await db.query(
      `DELETE FROM payment 
       WHERE invoice_number = $1
       RETURNING invoice_number`,
      [invoiceNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      invoice_number: result.rows[0].invoice_number,
      message: 'Payment deleted successfully'
    };
  } catch (err) {
    console.error("Error deleting payment:", err);
    throw err;
  }
}

// Database inspection for payment table
async function inspectDatabase() {
  try {
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payment'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await db.query(columnsQuery);
    
    // Get table content
    const contentResult = await db.query('SELECT * FROM payment ORDER BY created_at DESC LIMIT 100');
    
    return {
      table: 'payment',
      columns: columnsResult.rows,
      Table_Content: contentResult.rows
    };
  } catch (err) {
    console.error("Payment database inspection error:", err);
    throw err;
  }
}

// Handle shutdown gracefully
// process.on('SIGINT', async () => {
//   console.log('\nClosing payment database connection...');
//   await db.end();
// });

module.exports = {
  initialize,
  calculateInvoiceAmount,
  getTransportRecordByGR,
  createPayment,
  getPaymentByInvoice,
  getAllPayments,
  updatePayment,
  deletePayment,
  inspectDatabase,
};