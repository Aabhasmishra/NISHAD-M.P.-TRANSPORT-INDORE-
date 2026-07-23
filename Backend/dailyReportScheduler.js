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

    const parameters = [
      date,
      generatedAt,
      String(transportReport.totalBuilty),
      String(transportReport.totalArticles),
      String(transportReport.totalWeight),
      String(transportReport.totalToPay),
      String(transportReport.totalPaid),
      String(challanReport.totalChallan),
      challanReport.truckNos,
      String(challanReport.totalWeight),
      String(challanReport.totalToPay),
      String(challanReport.totalPaid),
      String(outstandingReport.totalUnits),
      String(outstandingReport.totalWeight),
      String(outstandingReport.totalToPay),
      String(outstandingReport.totalPaid),
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
  // console.log(`📅 Daily WhatsApp report scheduler started — runs at 7:00 AM IST`);
}

module.exports = { startDailyReportScheduler, runDailyReportJob };
