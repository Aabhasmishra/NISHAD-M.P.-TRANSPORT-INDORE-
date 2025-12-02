module.exports = (paymentDB) => {
  const router = require('express').Router();

  // Enable CORS
  router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // Get transport record by GR number (invoice number)
  router.get("/transport-records/:grNo", async (req, res) => {
    try {
      const { grNo } = req.params;
      
      const record = await paymentDB.getTransportRecordByGR(grNo);

      if (!record) {
        return res.status(404).json({ error: "Transport record not found" });
      }

      res.json(record);
    } catch (err) {
      console.error("Error fetching transport record:", err);
      res.status(500).json({ 
        error: "Failed to fetch transport record",
        details: err.message 
      });
    }
  });

  // Create a new payment
  router.post("/payments", async (req, res) => {
    try {
      const result = await paymentDB.createPayment(req.body);
      res.status(201).json(result);
    } catch (err) {
      console.error("Error creating payment:", err);
      res.status(500).json({ error: "Failed to record payment" });
    }
  });

  // Get payment by invoice number
  router.get("/payments/:invoiceNumber", async (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      
      const payment = await paymentDB.getPaymentByInvoice(invoiceNumber);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(payment);
    } catch (err) {
      console.error("Error fetching payment:", err);
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  router.get("/payments", async (req, res) => {
    try {
      const payments = await paymentDB.getAllPayments(100);
      res.json(payments);
    } catch (err) {
      console.error("Error fetching payments:", err);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Update payment
  router.put("/payments/:invoiceNumber", async (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      
      const result = await paymentDB.updatePayment(invoiceNumber, req.body);

      if (!result) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(result);
    } catch (err) {
      console.error("Error updating payment:", err);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // Delete payment
  router.delete("/payments/:invoiceNumber", async (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      
      const result = await paymentDB.deletePayment(invoiceNumber);

      if (!result) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(result);
    } catch (err) {
      console.error("Error deleting payment:", err);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // database viewer for payment table
  router.get("/payments/viewer", async (req, res) => {
    try {
      const rows = await paymentDB.getAllPayments(100);
      
      // Format the data for better display
      const formattedRows = rows.map(row => ({
        invoiceNumber: row.invoice_number,
        invoiceType: row.invoice_type,
        invoiceAmount: row.invoice_amount,
        amountCollected: row.amount_collected,
        mode: row.mode_of_collection,
        comments: row.comments,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Create HTML response
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Records Viewer</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>Payment Records (Last 100)</h1>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Inv. Amt</th>
                <th>Collected</th>
                <th>Mode</th>
                <th>Comments</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              ${formattedRows.map(row => `
                <tr>
                  <td>${row.invoiceNumber}</td>
                  <td>${row.invoiceType}</td>
                  <td>${row.invoiceAmount}</td>
                  <td>${row.amountCollected}</td>
                  <td>${row.mode}</td>
                  <td>${row.comments || ''}</td>
                  <td>${new Date(row.createdAt).toLocaleString()}</td>
                  <td>${new Date(row.updatedAt).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      res.send(html);
    } catch (err) {
      console.error("Error fetching payment records:", err);
      res.status(500).send("Failed to fetch payment records");
    }
  });

  return router;
};