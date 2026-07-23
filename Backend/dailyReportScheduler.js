const express = require("express");
const http = require("http");
const transportDB = require("./transportDB");
const customersDB = require("./customersDB");
const transporterDB = require("./transporterDB");
const userDB = require("./userDB");
const challanDB = require("./challanDB");
const crossingDB = require("./crossingDB");
const otherDB = require("./otherDB");
const createDatabaseViewer = require("./databaseViewer");
const { startDailyReportScheduler } = require("./dailyReportScheduler");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

async function initialize() {
  try {
    await transportDB.initialize();
    await customersDB.initialize();
    await transporterDB.initialize();
    await userDB.initialize();
    await challanDB.initialize();
    await crossingDB.initialize();
    await otherDB.initialize();
    console.log("All databases initialized successfully");

    startDailyReportScheduler();
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
const crossingRoutes = require("./crossingRoutes")(crossingDB);
const otherRoutes = require("./otherRoutes")(otherDB);

// Create database viewer routes
const databaseViewerRoutes = createDatabaseViewer(
  transportDB,
  customersDB,
  transporterDB,
  userDB,
  challanDB,
  crossingDB,
  otherDB
);

// Use routes
app.use("/api", transportRoutes);
app.use("/api", customerRoutes);
app.use("/api", transporterRoutes);
app.use("/api", userRoutes);
app.use("/api", challanRoutes);
app.use("/api", crossingRoutes);
app.use("/api", otherRoutes);
app.use("/", databaseViewerRoutes);

// TEMPORARY: manual trigger to test the WhatsApp report without waiting for 10 PM
app.get("/api/test-whatsapp-report", async (req, res) => {
  try {
    const { runDailyReportJob } = require("./dailyReportScheduler");
    await runDailyReportJob();
    res.json({ success: true, message: "Test report triggered. Check WhatsApp and server logs." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Database inspection endpoint
app.get("/api/AabhasServer", async (req, res) => {
  try {
    const inspection = await transporterDB.inspectDatabase();
    res.json(inspection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- START ONLY HTTP SERVER ----------
initialize()
  .then(() => {
    const httpPort = 3000;
    const httpServer = http.createServer(app);

    httpServer.listen(httpPort, () => {
      console.log(`✅ HTTP server running on http://localhost:${httpPort}`);
      console.log(`(HTTPS temporarily disabled for local testing)`);
    });

    printEndpoints();
  })
  .catch((err) => {
    console.error("Failed to initialize server:", err);
  });

// Helper function to print all registered endpoints
function printEndpoints() {
  console.log("Available endpoints:");
  console.log("Transport Records:");
  console.log(" POST /api/transport-records");
  console.log(" GET /api/transport-records");
  console.log(" GET /api/transport-records?grNo=...");
  console.log(" PUT /api/transport-records/:grNo");
  console.log(" DELETE /api/transport-records/:grNo");

  console.log("\nCustomers:");
  console.log(" GET /api/customers?name=...");
  console.log(" GET /api/customers/all-names");
  console.log(" GET /api/customers/all");
  console.log(" POST /api/customers");
  console.log(" PUT /api/customers/:name");
  console.log(" DELETE /api/customers/:name");

  console.log("\nTransporters:");
  console.log(" POST /api/transporters");
  console.log(" GET /api/transporters?search=...");
  console.log(" GET /api/transporters/all");
  console.log(" PUT /api/transporters/:vehicleNumber");
  console.log(" DELETE /api/transporters/:vehicleNumber");

  console.log("\nUsers:");
  console.log(" POST /api/users");
  console.log(" GET /api/users/search?name=...");
  console.log(" GET /api/users/all");
  console.log(" GET /api/users/:id");
  console.log(" PUT /api/users/:id");
  console.log(" DELETE /api/users/:id");

  console.log("\nChallan:");
  console.log(" POST /api/challan");
  console.log(" GET /api/challan");
  console.log(" GET /api/challan?challan_no=...");
  console.log(" PUT /api/challan/:challan_no");
  console.log(" DELETE /api/challan/:challan_no");

  console.log("\nCrossing Statements:");
  console.log(" POST /api/crossing");
  console.log(" GET /api/crossing");
  console.log(" GET /api/crossing?cx_number=...");
  console.log(" PUT /api/crossing/:cx_number");
  console.log(" DELETE /api/crossing/:cx_number");

  console.log("\nOther / Stations:");
  console.log(" GET /api/other/stations");
  console.log(" POST /api/other/stations");

  console.log("\nDatabase Inspection:");
  console.log(" GET /api/AabhasServer (JSON API)");
  console.log(" GET /AabhasServer (HTML Viewer)");
  console.log(" GET /export/:dbName (Excel Export)");

  console.log("\nDatabase Viewer available at: http://localhost:3000/AabhasServer");
}
