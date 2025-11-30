const express = require("express");
const transportDB = require("./transportDB");
const customersDB = require("./customersDB");
const transporterDB = require("./transporterDB");
const userDB = require("./userDB");
const challanDB = require("./challanDB");
const shippingStatusDB = require("./statusDB");
const paymentDB = require("./paymentDB");
const crossingDB = require("./crossingDB");
const createDatabaseViewer = require("./databaseViewer");
require("dotenv").config();
const db = require('./db');

const app = express();
app.use(express.json());

// Initialize all databases
async function initialize() {
  try {
    await transportDB.initialize();
    await customersDB.initialize();
    await transporterDB.initialize();
    await userDB.initialize();
    await challanDB.initialize();
    await shippingStatusDB.initialize();
    await paymentDB.initialize();
    await crossingDB.initialize(); 
    console.log("All databases initialized successfully");
  } catch (err) {
    console.error("Failed to initialize databases:", err);
    process.exit(1);
  }
}

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Import route modules
const transportRoutes = require("./transportRoutes")(transportDB);
const customerRoutes = require("./customerRoutes")(customersDB);
const transporterRoutes = require("./transporterRoutes")(transporterDB);
const userRoutes = require("./userRoutes")(userDB);
const challanRoutes = require("./challanRoutes")(challanDB);
const shippingStatusRoutes = require("./statusRoutes")(shippingStatusDB);
const paymentRoutes = require("./paymentRoutes")(paymentDB);
const crossingRoutes = require("./crossingRoutes")(crossingDB); 

// Create database viewer routes - now including crossingDB
const databaseViewerRoutes = createDatabaseViewer(
  transportDB, 
  customersDB, 
  transporterDB, 
  userDB, 
  challanDB, 
  shippingStatusDB,
  paymentDB,
  crossingDB 
);

// Use routes
app.use("/api", transportRoutes);
app.use("/api", customerRoutes);
app.use("/api", transporterRoutes);
app.use("/api", userRoutes);
app.use("/api", challanRoutes);
app.use("/api", shippingStatusRoutes);
app.use("/api", paymentRoutes);
app.use("/api", crossingRoutes);
app.use("/", databaseViewerRoutes);

// Database inspection endpoint
app.get("/api/AabhasServer", async (req, res) => {
  try {
    const inspection = await transporterDB.inspectDatabase();
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Available endpoints:");
      console.log("Transport Records:");
      console.log("  POST   /api/transport-records");
      console.log("  GET    /api/transport-records");
      console.log("  GET    /api/transport-records?grNo=...");
      console.log("  PUT    /api/transport-records/:grNo");
      console.log("  DELETE /api/transport-records/:grNo");
      
      console.log("\nCustomers:");
      console.log("  GET    /api/customers?name=...");
      console.log("  GET    /api/customers/all-names");
      console.log("  GET    /api/customers/all");
      console.log("  POST   /api/customers");
      console.log("  PUT    /api/customers/:name");
      console.log("  DELETE /api/customers/:name");
      
      console.log("\nTransporters:");
      console.log("  POST   /api/transporters");
      console.log("  GET    /api/transporters?search=...");
      console.log("  GET    /api/transporters/all");
      console.log("  PUT    /api/transporters/:vehicleNumber");
      console.log("  DELETE /api/transporters/:vehicleNumber");
      
      console.log("\nUsers:");
      console.log("  POST   /api/users");
      console.log("  GET    /api/users/search?name=...");
      console.log("  GET    /api/users/all");
      console.log("  GET    /api/users/:id");
      console.log("  PUT    /api/users/:id");
      console.log("  DELETE /api/users/:id");

      console.log("\nChallan:");
      console.log("  POST   /api/challan");
      console.log("  GET    /api/challan");
      console.log("  GET    /api/challan?challan_no=...");
      console.log("  PUT    /api/challan/:challan_no");
      console.log("  DELETE /api/challan/:challan_no");
      
      console.log("\nShipping Status:");
      console.log("  GET    /api/status");
      console.log("  GET    /api/status?gr_no=...");
      console.log("  PUT    /api/status/:gr_no");
      console.log("  DELETE /api/status/:gr_no");
      
      console.log("\nPayment:");
      console.log("  GET    /api/transport-records/:grNo - Get transport record details");
      console.log("  POST   /api/payments - Create new payment");
      console.log("  GET    /api/payments/:invoiceNumber - Get payment by invoice number");
      console.log("  GET    /api/payments - Get all payments (last 100)");
      console.log("  PUT    /api/payments/:invoiceNumber - Update payment");
      console.log("  DELETE /api/payments/:invoiceNumber - Delete payment");
      console.log("  GET    /api/payments/viewer - View payment records");
      
      console.log("\nCrossing Statements:");
      console.log("  POST   /api/crossing");
      console.log("  GET    /api/crossing");
      console.log("  GET    /api/crossing?cx_number=...");
      console.log("  PUT    /api/crossing/:cx_number");
      console.log("  DELETE /api/crossing/:cx_number");
      
      console.log("\nDatabase Inspection:");
      console.log("  GET    /api/AabhasServer (JSON API)");
      console.log("  GET    /AabhasServer (HTML Viewer)");
      console.log("  GET    /export/:dbName (Excel Export)");
      
      console.log("\nDatabase Viewer available at: http://localhost:3000/AabhasServer");
    });
  })
  .catch((err) => {
    console.error("Failed to initialize server:", err);
  });

// Graceful shutdown
async function shutdown(reason) {
  try {
    console.log('Shutting down server...', reason || '');
    await db.close();
    console.log('Database pool closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});