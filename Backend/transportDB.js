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
  // Convert all inputs to numbers safely
  const toNumber = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Calculate sum of article amounts
  const articleSum = amountString 
    ? amountString.split('|').reduce((sum, val) => sum + toNumber(val), 0)
    : 0;

  // Sum all charges
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

  // Calculate payment values
  const totalAmount = calculateTotalAmount(
    recordData.amount,
    recordData.motorFreight || 0,
    recordData.hammali || 0,
    recordData.otherCharges || 0
  );

  const toPay = recordData.paymentType === 'TO PAY' ? totalAmount : 0;
  const paid = recordData.paymentType === 'PAID' ? totalAmount : 0;

  await pool.query(
    `INSERT INTO transport_records (
      gr_no, date, from_location, 
      consignor_code, consignor_gst, consignor_name,
      to_location, consignee_code, consignee_gst, consignee_name,
      article_no, article_length, said_to_contain, tax_free, 
      weight_chargeable, actual_weight, hsn, amount, remarks, 
      goods_type, value_declared, gst_will_be_paid_by,
      to_pay, paid, motor_freight, hammali, other_charges
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
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
      recordData.otherCharges || 0
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

// Get transport records history between consignor and consignee
async function getTransportHistory(consignor, consignee) {
  const { rows } = await pool.query(
    `SELECT * FROM transport_records 
     WHERE consignor_name ILIKE $1 AND consignee_name ILIKE $2
     ORDER BY updated_at DESC, created_at DESC 
     LIMIT 5`,
    [`%${consignor}%`, `%${consignee}%`]
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

// Update transport record
async function updateTransportRecord(grNo, recordData) {
  const [day, month, year] = recordData.date.split('-');
  const formattedDate = `${year}-${month}-${day}`;
  const hsn = recordData.hsn || Array(recordData.articleLength).fill('9999').join('|');

  // Calculate payment values
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
    // Get table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transport_records'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    // Get table content
    const contentResult = await pool.query('SELECT * FROM transport_records ORDER BY gr_no DESC');
    
    return {
      database: 'mp_transport',
      tables: [{
        table: 'transport_records',
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
  saveTransportRecord,
  getTransportRecord,
  getAllTransportRecords,
  getTransportHistory,
  updateTransportRecord,
  deleteTransportRecord,
  inspectDatabase
};
