// dailyReportScheduler.js
// Sends the daily WhatsApp report every day at 7:00 AM IST.
// Uses a cron job with timezone Asia/Kolkata.

const { CronJob } = require('cron');
const axios = require('axios');
const { sendWhatsAppTemplateMessage } = require('./whatsappService');
require('dotenv').config();

// ----- CONFIG ------
const RECIPIENTS = (process.env.WHATSAPP_RECIPIENTS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const INTERNAL_REPORT_URL = process.env.INTERNAL_REPORT_URL || "http://localhost:3000/api/report/today";

// Helper to format numbers with Indian comma separators (e.g., 20400 → "20,400")
const formatNum = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('en-IN');
};

// ----- JOB FUNCTION ------
async function runDailyReportJob() {
  if (RECIPIENTS.length === 0) {
    console.warn("⚠️ No WhatsApp recipients configured. Set WHATSAPP_RECIPIENTS in .env");
    return;
  }

  try {
    const { data } = await axios.get(INTERNAL_REPORT_URL);
    if (!data.success) throw new Error("Report endpoint returned success: false");

    const { generatedAt, date, transportReport, challanReport, outstandingReport } = data;

    // Order matches the new WhatsApp template (21 placeholders):
    // {{1}} date, {{2}} time,
    // Transport: {{3}} totalBuilty, {{4}} totalArticles, {{5}} totalWeight, {{6}} totalToPay, {{7}} totalPaid, {{8}} totalAmount,
    // Challan: {{9}} totalChallan, {{10}} challanNos, {{11}} truckNos, {{12}} totalWeight, {{13}} totalToPay, {{14}} totalPaid, {{15}} totalAmount,
    // Outstanding: {{16}} totalBuilty, {{17}} totalUnits, {{18}} totalWeight, {{19}} totalToPay, {{20}} totalPaid, {{21}} totalAmount
    const parameters = [
      date,
      generatedAt,
      formatNum(transportReport.totalBuilty),
      formatNum(transportReport.totalArticles),
      formatNum(transportReport.totalWeight),
      formatNum(transportReport.totalToPay),
      formatNum(transportReport.totalPaid),
      formatNum(transportReport.totalAmount),
      formatNum(challanReport.totalChallan),
      challanReport.challanNos,   // string – no formatting
      challanReport.truckNos,     // string – no formatting
      formatNum(challanReport.totalWeight),
      formatNum(challanReport.totalToPay),
      formatNum(challanReport.totalPaid),
      formatNum(challanReport.totalAmount),
      formatNum(outstandingReport.totalBuilty),
      formatNum(outstandingReport.totalUnits),
      formatNum(outstandingReport.totalWeight),
      formatNum(outstandingReport.totalToPay),
      formatNum(outstandingReport.totalPaid),
      formatNum(outstandingReport.totalAmount)
    ];

    for (const number of RECIPIENTS) {
      const result = await sendWhatsAppTemplateMessage(number, parameters);
      if (!result.success) {
        console.error(`❌ Report failed for ${number}:`, JSON.stringify(result.error));
      }
    }
  } catch (err) {
    console.error("❌ Daily report job failed:", err.message);
  }
}

// ----- SCHEDULER ------
function startDailyReportScheduler() {
  const cronExpression = '0 7 * * *'; // 7:00 AM IST
  const job = new CronJob(
    cronExpression,
    runDailyReportJob,
    null,
    true,
    'Asia/Kolkata'
  );
  job.start();
  console.log(`📅 Daily WhatsApp report scheduler started — runs at 7:00 AM IST`);
}

module.exports = { startDailyReportScheduler, runDailyReportJob };
