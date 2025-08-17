// cronJobs.js
const cron = require("node-cron");
const autoCompleteBookings = require("./utils/autoCompleteBookings");

function startCronJobs() {
  // Run every day at midnight (server time)
  cron.schedule("0 0 * * *", async () => {
    console.log("🔔 Running auto-complete bookings job...");
    await autoCompleteBookings();
  });
}

module.exports = startCronJobs;
