// utils/autoCompleteBookings.js
const pool = require("../db");
const { createNotification } = require("../controllers/notificationsController");

/**
 * Auto-completes bookings that have passed their end date.
 * - Updates booking status from "confirmed" or "arrived" → "completed"
 * - Logs the action to booking_audit_logs
 * - Sends notifications to host and client
 */
async function autoCompleteBookings() {
  try {
    // Step 1: Find all eligible bookings (both confirmed and arrived)
    const [bookings] = await pool.query(
      `
      SELECT 
        b.id, 
        l.host_id,       -- from listings
        b.client_id, 
        l.title,         -- from listings
        b.status         -- current status for logging
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.status IN ('confirmed', 'arrived')
        AND b.end_date < CURDATE();
      `
    );

    if (bookings.length === 0) {
      console.log("ℹ️ No bookings to auto-complete.");
      return;
    }

    console.log(`📋 Found ${bookings.length} booking(s) to auto-complete.`);

    // Step 2: Update status in bulk
    await pool.query(
      `
      UPDATE bookings
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('confirmed', 'arrived')
        AND end_date < CURDATE()
      `
    );

    // Step 3: Process each booking for logging and notifications
    for (const booking of bookings) {
      try {
        // Audit log
        await pool.query(
          `
          INSERT INTO booking_audit_logs (booking_id, action, details)
          VALUES (?, 'auto_completed', ?)
          `,
          [booking.id, `Booking "${booking.title}" auto-completed by system job (was ${booking.status})`]
        );

        // Notify host
        await createNotification({
          userId: booking.host_id,
          type: "booking_completed",
          message: `✅ Booking "${booking.title}" has been automatically completed after checkout.`,
        });
        console.log(`📢 Host notified (ID: ${booking.host_id}) for Booking ID: ${booking.id}`);

        // Notify client
        await createNotification({
          userId: booking.client_id,
          type: "booking_completed",
          message: `✅ Your stay at "${booking.title}" has been completed. Thank you for choosing our property!`,
        });
        console.log(`📢 Client notified (ID: ${booking.client_id}) for Booking ID: ${booking.id}`);

        console.log(`✓ Completed Booking ID: ${booking.id} (${booking.status} → completed)`);
        
      } catch (notificationError) {
        console.error(`⚠️ Error processing booking ${booking.id}:`, notificationError);
        // Continue with other bookings even if one fails
      }
    }

    console.log(`✅ Successfully auto-completed ${bookings.length} booking(s).`);
    return bookings.length; // Return count for testing/monitoring
    
  } catch (error) {
    console.error("❌ Error during auto-complete job:", error);
    throw error; // Re-throw for proper error handling
  }
}

module.exports = autoCompleteBookings;