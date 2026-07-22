// dailyReportScheduler.js
// Runs a scheduled job every day at 10 PM: fetches the combined daily report
// (transport + challan + outstanding) from your own /api/report/today endpoint
// and sends it to every configured WhatsApp recipient.
//
// We call our OWN endpoint via HTTP instead of importing challanDB directly here,
// because /api/report/today already combines transportDB + challanDB logic —
// reusing it avoids duplicating that logic in two places.

const cron = require("node-cron");
const axios = require("axios");
const { sendWhatsAppTemplateMessage } = require("./whatsappService");
require("dotenv").config();

// Comma-separated numbers in .env, e.g: WHATSAPP_RECIPIENTS=919724117255,919812345678
const RECIPIENTS = (process.env.WHATSAPP_RECIPIENTS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

// Internal server URL — the scheduler calls the server's own API.
// Since HTTP runs on port 3000 (see mainServer.js), we call it locally.
const INTERNAL_REPORT_URL = process.env.INTERNAL_REPORT_URL || "http://localhost:3000/api/report/today";

/**
 * Sends today's combined report to all configured recipients.
 * Exported separately so it can also be triggered manually for testing
 * via the /api/test-whatsapp-report route, without waiting for 10 PM.
 */
async function runDailyReportJob() {
  // console.log(`[${new Date().toISOString()}] Running daily WhatsApp report job...`);

  if (RECIPIENTS.length === 0) {
    console.warn("No WhatsApp recipients configured. Set WHATSAPP_RECIPIENTS in .env");
    return;
  }

  try {
    const { data } = await axios.get(INTERNAL_REPORT_URL);

    if (!data.success) {
      throw new Error("Report endpoint returned success: false");
    }

    const { generatedAt, date, transportReport, challanReport, outstandingReport } = data;

    // Order MUST exactly match the {{1}} {{2}} {{3}}... placeholder order
    // in your approved "daily_report_summary" WhatsApp template.
    const parameters = [
      date,                                       // {{1}}
      generatedAt,                                // {{2}}
      String(transportReport.totalBuilty),        // {{3}}
      String(transportReport.totalArticles),       // {{4}}
      String(transportReport.totalWeight),          // {{5}}
      String(transportReport.totalToPay),             // {{6}}
      String(transportReport.totalPaid),                // {{7}}
      String(challanReport.totalChallan),                // {{8}}
      challanReport.truckNos,                              // {{9}}
      String(challanReport.totalWeight),                    // {{10}}
      String(challanReport.totalToPay),                       // {{11}}
      String(challanReport.totalPaid),                          // {{12}}
      String(outstandingReport.totalUnits),                       // {{13}}
      String(outstandingReport.totalWeight),                        // {{14}}
      String(outstandingReport.totalToPay),                           // {{15}}
      String(outstandingReport.totalPaid),                              // {{16}}
    ];

    for (const number of RECIPIENTS) {
      const result = await sendWhatsAppTemplateMessage(number, parameters);
      if (result.success) {
        // console.log(`  ✅ Report sent to ${number}`);
        // console.log(`     Response:`, JSON.stringify(result.data));
      } else {
        console.error(`  ❌ Report failed for ${number}:`, JSON.stringify(result.error));
      }
    }
  } catch (err) {
    console.error("Daily report job failed:", err.message);
  }
}

/**
 * Registers the cron job. Call this once when the server starts.
 * Cron pattern "0 22 * * *" = every day at 22:00 (10 PM) server local time.
 */
function startDailyReportScheduler() {
  // cron.schedule("0 22 * * *", () => {
  cron.schedule("55 11 * * *", () => {
    runDailyReportJob();
  });

  // console.log("📅 Daily WhatsApp report scheduler started — runs every day at 10:00 PM");
}

module.exports = { startDailyReportScheduler, runDailyReportJob };