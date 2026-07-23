// dailyReportScheduler.js
// Runs a scheduled job every day at 7:00 AM IST (change for testing)
//
// Now includes a live clock in the console to help debug time issues.

const { CronJob } = require('cron');
const axios = require('axios');
const { sendWhatsAppTemplateMessage } = require('./whatsappService');
require('dotenv').config();

// ------ LIVE CLOCK (console) ------
function startClock() {
  setInterval(() => {
    const now = new Date();
    const istOptions = { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeStr = now.toLocaleString('en-IN', { ...istOptions, year: 'numeric', month: '2-digit', day: '2-digit' });
    // Clear line and print updated time
    process.stdout.write(`\r🕐 Server time (IST): ${timeStr}    `);
  }, 5000); // update every 5 seconds
}

// ------ CONFIG ------
const RECIPIENTS = (process.env.WHATSAPP_RECIPIENTS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const INTERNAL_REPORT_URL = process.env.INTERNAL_REPORT_URL || "http://localhost:3000/api/report/today";

// ------ JOB FUNCTION ------
async function runDailyReportJob() {
  const now = new Date();
  const istOptions = { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' };
  const timeStr = now.toLocaleString('en-IN', { ...istOptions, year: 'numeric', month: '2-digit', day: '2-digit' });
  console.log(`\n⏰ [${timeStr}] Running daily WhatsApp report job...`);

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
      if (result.success) {
        console.log(`✅ Report sent to ${number}`);
      } else {
        console.error(`❌ Report failed for ${number}:`, JSON.stringify(result.error));
      }
    }
  } catch (err) {
    console.error("❌ Daily report job failed:", err.message);
  }
}

// ------ SCHEDULER ------
function startDailyReportScheduler() {
  // Show current time and timezone info on startup
  const now = new Date();
  const istOptions = { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const startTime = now.toLocaleString('en-IN', { ...istOptions, year: 'numeric', month: '2-digit', day: '2-digit' });
  console.log(`\n🚀 Server started at IST: ${startTime}`);
  console.log(`   Server system time: ${now.toString()}`);
  console.log(`   Timezone: Asia/Kolkata (IST)`);

  // Start the live clock
  startClock();

  // Create cron job – FOR TESTING, CHANGE TO '0 14 * * *' for 2 PM
  const cronExpression = '0 15 * * *';  // <-- CHANGE TO '0 7 * * *' for 7 AM after testing
  const job = new CronJob(
    cronExpression,
    runDailyReportJob,
    null,
    true,
    'Asia/Kolkata'
  );
  job.start();
  console.log(`\n📅 Daily WhatsApp report scheduled with cron: "${cronExpression}" IST`);
  console.log(`   (Next run: ${job.nextDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
}

module.exports = { startDailyReportScheduler, runDailyReportJob };
