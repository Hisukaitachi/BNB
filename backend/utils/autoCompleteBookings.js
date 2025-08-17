// utils/autoCompleteBookings.js
const pool = require("../db");
const { createNotification } = require("../controllers/notificationsController");

/**
 * Auto-completes bookings that have passed their end date.
 * - Updates booking status from "confirmed" → "completed"
 * - Logs the action to booking_audit_logs
 * - Sends notifications to host and client
 */
async function autoCompleteBookings() {
  try {
    // Step 1: Find all eligible bookings
    const [bookings] = await pool.query(
      `
      SELECT 
        b.id, 
        l.host_id,       -- from listings
        b.client_id, 
        l.title          -- from listings
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.status = 'confirmed'
        AND b.end_date < CURDATE();
      `
    );

    if (bookings.length === 0) {
      console.log("ℹ️ No bookings to auto-complete.");
      return;
    }

    // Step 2: Update status in bulk
    await pool.query(
      `
      UPDATE bookings
      SET status = 'completed'
      WHERE status = 'confirmed'
        AND end_date < CURDATE()
      `
    );

    // Step 3: Process each booking
    for (const booking of bookings) {
      // Audit log
      await pool.query(
        `
        INSERT INTO booking_audit_logs (booking_id, action, details)
        VALUES (?, 'auto_completed', ?)
        `,
        [booking.id, `Booking "${booking.title}" auto-completed by system job`]
      );

      // Notify host
      await createNotification({
        userId: booking.host_id,
        type: "booking_completed",
        message: `Booking "${booking.title}" has been automatically completed.`,
      });
      console.log(`📢 Host notified (ID: ${booking.host_id}) for Booking ID: ${booking.id}`);

      // Notify client
      await createNotification({
        userId: booking.client_id,
        type: "booking_completed",
        message: `Your booking "${booking.title}" has been automatically completed.`,
      });
      console.log(`📢 Client notified (ID: ${booking.client_id}) for Booking ID: ${booking.id}`);
    }

    console.log(`✅ Successfully auto-completed ${bookings.length} booking(s).`);
  } catch (error) {
    console.error("❌ Error during auto-complete job:", error);
  }
}

module.exports = autoCompleteBookings;
