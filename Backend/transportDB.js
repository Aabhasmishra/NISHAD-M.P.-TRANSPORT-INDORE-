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

// Connect to DB and initialize transport_records table
async function initialize() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transport_records (
          gr_no VARCHAR(50) PRIMARY KEY,
          date DATE,
          from_location VARCHAR(255),
          consignor_code VARCHAR(50),
          consignor_gst VARCHAR(15),
          consignor_name VARCHAR(255),
          to_location VARCHAR(255),
          consignee_code VARCHAR(50),
          consignee_gst VARCHAR(15),
          consignee_name VARCHAR(255),
          article_no VARCHAR(255),
          article_length INTEGER,
          said_to_contain TEXT,
          tax_free VARCHAR(255),
          weight_chargeable VARCHAR(255),
          actual_weight VARCHAR(255),
          hsn VARCHAR(255),
          amount VARCHAR(255),
          remarks TEXT,
          goods_type VARCHAR(100),
          value_declared VARCHAR(100),
          gst_will_be_paid_by VARCHAR(100),
          to_pay DECIMAL(12, 2) DEFAULT 0,
          paid DECIMAL(12, 2) DEFAULT 0,
          motor_freight DECIMAL(12, 2) DEFAULT 0,
          hammali DECIMAL(12, 2) DEFAULT 0,
          other_charges DECIMAL(12, 2) DEFAULT 0,
          -- Payment fields (merged from payment table)
          amount_collected DECIMAL(12, 2) DEFAULT 0,
          mode_of_collection VARCHAR(20),
          comments TEXT,
          payment_created_at TIMESTAMPTZ,
          payment_updated_at TIMESTAMPTZ,
          -- Status fields (merged from status table)
          challan_status VARCHAR(255) DEFAULT 'NOT SHIPPED',
          payment_status VARCHAR(255) DEFAULT 'Pending',
          crossing_status VARCHAR(255) DEFAULT 'NO',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("Transport records table initialized successfully");
  } catch (err) {
    console.error("Transport records initialization error:", err);
    throw err;
  }
}

// Helper function to calculate total amount
function calculateTotalAmount(amountString, motorFreight = 0, hammali = 0, otherCharges = 0) {
  const toNumber = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const articleSum = amountString 
    ? amountString.split('|').reduce((sum, val) => sum + toNumber(val), 0)
    : 0;

  return (
    articleSum + 
    toNumber(motorFreight) + 
    toNumber(hammali) + 
    toNumber(otherCharges)
  );
}

// Generate new GR number
async function generateGRNo() {
  const { rows } = await pool.query(
    `SELECT gr_no FROM transport_records 
     ORDER BY gr_no DESC LIMIT 1`
  );

  if (rows.length === 0) {
    return "GR00001";
  }

  const lastGRNo = rows[0].gr_no;
  const numericPart = parseInt(lastGRNo.replace(/\D/g, "")) || 0;
  return `GR${(numericPart + 1).toString().padStart(5, "0")}`;
}

// Save transport record
async function saveTransportRecord(recordData) {
  const grNo = await generateGRNo();
  const [day, month, year] = recordData.date.split('-');
  const formattedDate = `${year}-${month}-${day}`;
  const hsn = recordData.hsn || Array(recordData.articleLength).fill('9999').join('|');

  const totalAmount = calculateTotalAmount(
    recordData.amount,
    recordData.motorFreight || 0,
    recordData.hammali || 0,
    recordData.otherCharges || 0
  );

  const toPay = recordData.paymentType === 'TO PAY' ? totalAmount : 0;
  const paid = recordData.paymentType === 'PAID' ? totalAmount : 0;

  // Determine if any payment fields are provided
  const hasPaymentData = 
    recordData.amountCollected !== undefined || 
    recordData.modeOfCollection !== undefined || 
    recordData.paymentComments !== undefined;
  
  const now = new Date();
  const paymentCreatedAt = hasPaymentData ? now : null;
  const paymentUpdatedAt = hasPaymentData ? now : null;

  await pool.query(
    `INSERT INTO transport_records (
      gr_no, date, from_location, 
      consignor_code, consignor_gst, consignor_name,
      to_location, consignee_code, consignee_gst, consignee_name,
      article_no, article_length, said_to_contain, tax_free, 
      weight_chargeable, actual_weight, hsn, amount, remarks, 
      goods_type, value_declared, gst_will_be_paid_by,
      to_pay, paid, motor_freight, hammali, other_charges,
      -- Payment fields
      amount_collected, mode_of_collection, comments,
      payment_created_at, payment_updated_at,
      -- Status fields
      challan_status, payment_status, crossing_status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
      $28, $29, $30, $31, $32, $33, $34, $35
    )`,
    [
      grNo,
      formattedDate,
      recordData.fromLocation,
      recordData.consignorCode,
      recordData.consignorGst || "10987",
      recordData.consignor,
      recordData.toLocation,
      recordData.consigneeCode,
      recordData.consigneeGst || "10987",
      recordData.consignee,
      recordData.articleNo,
      recordData.articleLength,
      recordData.saidToContain,
      recordData.taxFree,
      recordData.weightChargeable,
      recordData.actualWeight,
      hsn,
      recordData.amount,
      recordData.remarks,
      recordData.goodsType,
      recordData.valueDeclared,
      recordData.gstWillBePaidBy,
      toPay,
      paid,
      recordData.motorFreight || 0,
      recordData.hammali || 0,
      recordData.otherCharges || 0,
      // Payment fields
      recordData.amountCollected || 0,
      recordData.modeOfCollection || null,
      recordData.paymentComments || null,
      paymentCreatedAt,
      paymentUpdatedAt,
      // Status fields
      recordData.challanStatus || 'NOT SHIPPED',
      recordData.paymentStatus || 'Pending',
      recordData.crossingStatus || 'NO'
    ]
  );

  return { grNo, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

// Get transport record by GR number
async function getTransportRecord(grNo) {
  const { rows } = await pool.query(
    `SELECT * FROM transport_records WHERE gr_no = $1`,
    [grNo]
  );
  return rows[0];
}

// Get all transport records
async function getAllTransportRecords() {
  const { rows } = await pool.query(
    `SELECT * FROM transport_records ORDER BY created_at DESC`
  );
  return rows;
}

// Get transport records history for a specific consignor and consignee using their unique customer codes
async function getTransportHistory(consignorCode, consigneeCode) {
  const { rows } = await pool.query(
    `SELECT * FROM transport_records 
     WHERE consignor_code = $1 AND consignee_code = $2
     ORDER BY date DESC, created_at DESC`,
    [consignorCode, consigneeCode]
  );

  return rows.map(record => {
    const articles = [];
    const articleNos = record.article_no?.split('|') || [];
    const saidToContains = record.said_to_contain?.split('|') || [];
    const actualWeights = record.actual_weight?.split('|') || [];
    const amounts = record.amount?.split('|') || [];

    for (let i = 0; i < record.article_length; i++) {
      articles.push({
        noIndex: i + 1,
        noOfArticles: articleNos[i] || '',
        saidToContain: saidToContains[i] || '',
        actualWeight: actualWeights[i] || '',
        amount: amounts[i] || ''
      });
    }

    return {
      ...record,
      articles
    };
  });
}

// Update transport record (core fields only – payment & status use separate functions)
async function updateTransportRecord(grNo, recordData) {
  const [day, month, year] = recordData.date.split('-');
  const formattedDate = `${year}-${month}-${day}`;
  const hsn = recordData.hsn || Array(recordData.articleLength).fill('9999').join('|');

  const totalAmount = calculateTotalAmount(
    recordData.amount,
    recordData.motorFreight || 0,
    recordData.hammali || 0,
    recordData.otherCharges || 0
  );

  const toPay = recordData.paymentType === 'TO PAY' ? totalAmount : 0;
  const paid = recordData.paymentType === 'PAID' ? totalAmount : 0;

  const { rowCount } = await pool.query(
    `UPDATE transport_records SET
      date = $1,
      from_location = $2,
      consignor_code = $3,
      consignor_gst = $4,
      consignor_name = $5,
      to_location = $6,
      consignee_code = $7,
      consignee_gst = $8,
      consignee_name = $9,
      article_no = $10,
      article_length = $11,
      said_to_contain = $12,
      tax_free = $13,
      weight_chargeable = $14,
      actual_weight = $15,
      hsn = $16,
      amount = $17,
      remarks = $18,
      goods_type = $19,
      value_declared = $20,
      gst_will_be_paid_by = $21,
      to_pay = $22,
      paid = $23,
      motor_freight = $24,
      hammali = $25,
      other_charges = $26,
      updated_at = NOW()
    WHERE gr_no = $27`,
    [
      formattedDate,
      recordData.fromLocation,
      recordData.consignorCode,
      recordData.consignorGst,
      recordData.consignor,
      recordData.toLocation,
      recordData.consigneeCode,
      recordData.consigneeGst,
      recordData.consignee,
      recordData.articleNo,
      recordData.articleLength,
      recordData.saidToContain,
      recordData.taxFree,
      recordData.weightChargeable,
      recordData.actualWeight,
      hsn,
      recordData.amount,
      recordData.remarks,
      recordData.goodsType,
      recordData.valueDeclared,
      recordData.gstWillBePaidBy,
      toPay,
      paid,
      recordData.motorFreight || 0,
      recordData.hammali || 0,
      recordData.otherCharges || 0,
      grNo
    ]
  );

  if (rowCount === 0) return null;

  const { rows } = await pool.query(`SELECT * FROM transport_records WHERE gr_no = $1`, [grNo]);
  return rows[0];
}

// Update payment information (amount_collected, mode_of_collection, comments)
async function updatePaymentInfo(grNo, paymentData) {
  const { amountCollected, modeOfCollection, comments } = paymentData;
  // Normalise field names to database column names
  const amount_collected = amountCollected;
  const mode_of_collection = modeOfCollection;
  const payment_comments = comments;

  // Ensure at least one field is provided
  if (amount_collected === undefined && mode_of_collection === undefined && payment_comments === undefined) {
    throw new Error("No payment fields to update");
  }

  // Fetch current record to check payment_created_at
  const current = await getTransportRecord(grNo);
  if (!current) {
    throw new Error("Transport record not found");
  }

  // Build SET clause dynamically
  const updates = [];
  const values = [];
  let idx = 1;

  if (amount_collected !== undefined) {
    updates.push(`amount_collected = $${idx++}`);
    values.push(amount_collected);
  }
  if (mode_of_collection !== undefined) {
    updates.push(`mode_of_collection = $${idx++}`);
    values.push(mode_of_collection);
  }
  if (payment_comments !== undefined) {
    updates.push(`comments = $${idx++}`);
    values.push(payment_comments);
  }

  // Always set payment_updated_at to NOW()
  updates.push(`payment_updated_at = NOW()`);

  // If payment_created_at is null, set it to NOW() as well
  if (!current.payment_created_at) {
    updates.push(`payment_created_at = NOW()`);
  }

  // Construct and execute query
  const query = `UPDATE transport_records SET ${updates.join(', ')} WHERE gr_no = $${idx} RETURNING *`;
  values.push(grNo);

  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Update status information (challan_status, payment_status, crossing_status)
async function updateStatusInfo(grNo, statusData) {
  const { challanStatus, paymentStatus, crossingStatus } = statusData;
  // Map to database column names
  const challan_status = challanStatus;
  const payment_status = paymentStatus;
  const crossing_status = crossingStatus;

  // Ensure at least one field is provided
  if (challan_status === undefined && payment_status === undefined && crossing_status === undefined) {
    throw new Error("No status fields to update");
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (challan_status !== undefined) {
    updates.push(`challan_status = $${idx++}`);
    values.push(challan_status);
  }
  if (payment_status !== undefined) {
    updates.push(`payment_status = $${idx++}`);
    values.push(payment_status);
  }
  if (crossing_status !== undefined) {
    updates.push(`crossing_status = $${idx++}`);
    values.push(crossing_status);
  }

  const query = `UPDATE transport_records SET ${updates.join(', ')} WHERE gr_no = $${idx} RETURNING *`;
  values.push(grNo);

  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Delete transport record
async function deleteTransportRecord(grNo) {
  const { rowCount } = await pool.query(
    `DELETE FROM transport_records WHERE gr_no = $1`,
    [grNo]
  );
  return rowCount > 0;
}

async function inspectDatabase() {
  try {
    // 1. Fetch column metadata (original order)
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transport_records'
      ORDER BY ordinal_position
    `;
    const columnsResult = await pool.query(columnsQuery);
    const originalColumns = columnsResult.rows;

    // 2. Fetch all rows (as objects)
    const contentResult = await pool.query('SELECT * FROM transport_records ORDER BY gr_no DESC');
    const rows = contentResult.rows;

    // 3. Define the desired column order
    //    Start with gr_no and status columns
    const baseOrder = ['gr_no', 'challan_status', 'payment_status', 'crossing_status'];
    //    End with created_at and updated_at
    const endOrder = ['created_at', 'updated_at'];

    //    Get all column names from original metadata
    const allColumnNames = originalColumns.map(col => col.column_name);

    //    Identify columns that are not in baseOrder or endOrder
    const middleColumns = allColumnNames.filter(
      name => !baseOrder.includes(name) && !endOrder.includes(name)
    );

    //    Final order = base + middle + end
    const finalOrder = [...baseOrder, ...middleColumns, ...endOrder];

    // 4. Reorder the columns array to match finalOrder
    const orderedColumns = finalOrder.map(colName => 
      originalColumns.find(col => col.column_name === colName)
    );

    // 5. Reorder each row’s properties to follow finalOrder
    const orderedRows = rows.map(row => {
      const orderedRow = {};
      finalOrder.forEach(colName => {
        orderedRow[colName] = row[colName];
      });
      return orderedRow;
    });

    // 6. Return the restructured result
    return {
      database: 'mp_transport',
      tables: [{
        table: 'transport_records',
        columns: orderedColumns,
        Table_Content: orderedRows
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
  saveTransportRecord,
  getTransportRecord,
  getAllTransportRecords,
  getTransportHistory,
  updateTransportRecord,
  updatePaymentInfo,
  updateStatusInfo,
  deleteTransportRecord,
  inspectDatabase
};
