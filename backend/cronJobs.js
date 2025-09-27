// backend/cronJobs.js - Updated Version (Manual Payout Request System)
const cron = require("node-cron");
const pool = require("./db");
const { createNotification } = require("./controllers/notificationsController");
const emailService = require("./utils/emailService");

// ==========================================
// AUTO-COMPLETE BOOKINGS AND RESERVATIONS
// ==========================================
async function autoCompleteBookings() {
  try {
    console.log("📋 Running auto-complete bookings job...");
    
    // Find bookings that should be auto-completed
    const [bookings] = await pool.query(`
      SELECT 
        b.id, 
        l.host_id,
        b.client_id, 
        l.title,
        b.status
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.status IN ('confirmed', 'arrived')
        AND b.end_date < CURDATE()
    `);

    if (bookings.length === 0) {
      console.log("ℹ️ No bookings to auto-complete.");
      return;
    }

    console.log(`📋 Found ${bookings.length} booking(s) to auto-complete.`);

    // Update status in bulk
    await pool.query(`
      UPDATE bookings
      SET status = 'completed', updated_at = NOW()
      WHERE status IN ('confirmed', 'arrived')
        AND end_date < CURDATE()
    `);

    // Process notifications for each booking
    for (const booking of bookings) {
      try {
        // Audit log
        await pool.query(`
          INSERT INTO booking_audit_logs (booking_id, action, details, created_at)
          VALUES (?, 'auto_completed', ?, NOW())
        `, [booking.id, `Booking auto-completed by system (was ${booking.status})`]);

        // Notify host that they can request payout
        await createNotification({
          userId: booking.host_id,
          message: `✅ Booking "${booking.title}" has been completed. You can now request a payout for your earnings.`,
          type: "booking_completed"
        });

        // Notify client
        await createNotification({
          userId: booking.client_id,
          message: `✅ Your stay at "${booking.title}" has been completed. Thank you for choosing our property! Please leave a review.`,
          type: "booking_completed"
        });

        console.log(`✓ Completed Booking ID: ${booking.id}`);
      } catch (notificationError) {
        console.error(`⚠️ Error processing booking ${booking.id}:`, notificationError);
      }
    }

    console.log(`✅ Successfully auto-completed ${bookings.length} booking(s).`);
  } catch (error) {
    console.error("❌ Error during auto-complete bookings job:", error);
  }
}

async function autoCompleteReservations() {
  try {
    console.log("🏨 Running auto-complete reservations job...");
    
    const [reservations] = await pool.query(`
      SELECT 
        r.id,
        r.client_id,
        r.host_id,
        l.title
      FROM reservations r
      JOIN listings l ON r.listing_id = l.id
      WHERE r.status = 'confirmed'
        AND r.check_out_date < CURDATE()
    `);

    if (reservations.length === 0) {
      console.log("ℹ️ No reservations to auto-complete.");
      return;
    }

    console.log(`📋 Found ${reservations.length} reservation(s) to auto-complete.`);

    // Update all eligible reservations
    await pool.query(`
      UPDATE reservations 
      SET status = 'completed', updated_at = NOW()
      WHERE status = 'confirmed' 
        AND check_out_date < CURDATE()
    `);

    for (const reservation of reservations) {
      // Log to reservation history
      await pool.query(`
        INSERT INTO reservation_history (reservation_id, user_id, action, old_status, new_status, notes, created_at)
        VALUES (?, 0, 'auto_completed', 'confirmed', 'completed', 'Auto-completed after check-out date', NOW())
      `, [reservation.id]);

      // Notify client
      await createNotification({
        userId: reservation.client_id,
        message: `Your stay at "${reservation.title}" is now complete. Please leave a review!`,
        type: 'reservation_completed'
      });

      // Notify host about payout eligibility
      await createNotification({
        userId: reservation.host_id,
        message: `Reservation for "${reservation.title}" has been completed. You can request a payout for your earnings.`,
        type: 'reservation_completed'
      });
    }

    console.log(`✅ Successfully auto-completed ${reservations.length} reservation(s).`);
  } catch (error) {
    console.error("❌ Error during auto-complete reservations job:", error);
  }
}

// ==========================================
// PAYMENT REMINDERS AND OVERDUE HANDLING
// ==========================================
async function sendPaymentReminders() {
  try {
    console.log("💳 Checking for payment reminders...");
    
    // Find reservations with upcoming payment due dates (3 days before)
    const [upcomingPayments] = await pool.query(`
      SELECT r.*, l.title 
      FROM reservations r
      JOIN listings l ON r.listing_id = l.id
      WHERE r.deposit_paid = 1 
        AND r.full_amount_paid = 0
        AND r.payment_due_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND r.status = 'confirmed'
    `);

    for (const reservation of upcomingPayments) {
      // Check if reminder already sent
      const [reminderCheck] = await pool.query(`
        SELECT id FROM payment_schedules 
        WHERE reservation_id = ? 
          AND payment_type = 'remaining'
          AND reminder_sent = 1
      `, [reservation.id]);

      if (reminderCheck.length === 0) {
        // Send reminder email
        await emailService.sendPaymentReminderEmail(reservation.guest_email, {
          listingTitle: reservation.title,
          checkIn: reservation.check_in_date,
          remainingAmount: reservation.remaining_amount,
          dueDate: reservation.payment_due_date,
          paymentUrl: `${process.env.FRONTEND_URL}/payment/remaining/${reservation.id}`
        });

        // Mark reminder as sent
        await pool.query(`
          UPDATE payment_schedules 
          SET reminder_sent = 1 
          WHERE reservation_id = ? AND payment_type = 'remaining'
        `, [reservation.id]);

        // Send in-app notification
        await createNotification({
          userId: reservation.client_id,
          message: `⏰ Reminder: Remaining payment of ₱${reservation.remaining_amount} is due in 3 days for your reservation at "${reservation.title}".`,
          type: 'payment_reminder'
        });

        console.log(`✅ Payment reminder sent for reservation ${reservation.id}`);
      }
    }

    // Check for overdue payments
    const [overdueReservations] = await pool.query(`
      SELECT r.*, l.title 
      FROM reservations r
      JOIN listings l ON r.listing_id = l.id
      WHERE r.deposit_paid = 1 
        AND r.full_amount_paid = 0
        AND r.payment_due_date < CURDATE()
        AND r.status = 'confirmed'
    `);

    for (const reservation of overdueReservations) {
      const daysOverdue = Math.floor((new Date() - new Date(reservation.payment_due_date)) / (1000 * 60 * 60 * 24));
      
      // Auto-cancel after 1 day grace period
      if (daysOverdue >= 1) {
        await pool.query(`
          UPDATE reservations 
          SET status = 'cancelled', 
              cancellation_reason = 'Payment overdue - automatically cancelled',
              cancelled_by = 'system',
              updated_at = NOW()
          WHERE id = ?
        `, [reservation.id]);

        // Notify both parties
        await createNotification({
          userId: reservation.client_id,
          message: `❌ Your reservation for "${reservation.title}" has been cancelled due to overdue payment.`,
          type: 'reservation_cancelled'
        });

        await createNotification({
          userId: reservation.host_id,
          message: `❌ Reservation for "${reservation.title}" cancelled - payment was overdue.`,
          type: 'reservation_cancelled'
        });

        console.log(`❌ Cancelled overdue reservation ${reservation.id}`);
      }
    }

    console.log("✅ Payment reminders job completed");
  } catch (error) {
    console.error("Error sending payment reminders:", error);
  }
}

// ==========================================
// PAYOUT REMINDERS (Manual Request System)
// ==========================================
async function sendPayoutAvailableNotifications() {
  try {
    console.log("💰 Notifying hosts about available payouts...");
    
    // Find hosts with completed bookings and available earnings
    const [hostsWithEarnings] = await pool.query(`
      SELECT 
        u.id as host_id,
        u.email,
        u.name,
        COUNT(DISTINCT b.id) as completed_bookings,
        SUM(p.host_earnings) as available_balance
      FROM users u
      JOIN listings l ON l.host_id = u.id
      JOIN bookings b ON b.listing_id = l.id
      JOIN payments p ON p.booking_id = b.id
      WHERE u.role = 'host'
        AND b.status = 'completed'
        AND p.status = 'succeeded'
        AND p.payout_status = 'pending'
        AND p.id NOT IN (
          SELECT payment_id FROM payout_items WHERE payment_id IS NOT NULL
        )
        AND b.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY u.id
      HAVING available_balance >= 500
    `);

    for (const host of hostsWithEarnings) {
      // Check if we already notified them this week
      const [recentNotification] = await pool.query(`
        SELECT id FROM notifications 
        WHERE user_id = ? 
          AND type = 'payout_available'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [host.host_id]);

      if (recentNotification.length === 0) {
        await createNotification({
          userId: host.host_id,
          message: `💰 You have ₱${host.available_balance.toLocaleString()} available from ${host.completed_bookings} completed bookings. Request a payout to receive your earnings!`,
          type: 'payout_available'
        });

        // Send email notification
        if (host.email) {
          await emailService.sendPayoutAvailableEmail(host.email, {
            hostName: host.name,
            availableBalance: host.available_balance,
            completedBookings: host.completed_bookings
          });
        }

        console.log(`✅ Notified host ${host.name} about available payout of ₱${host.available_balance}`);
      }
    }

    console.log(`✅ Payout notifications completed for ${hostsWithEarnings.length} hosts`);
  } catch (error) {
    console.error("Error sending payout notifications:", error);
  }
}

async function checkPendingPayoutRequests() {
  try {
    console.log("📊 Checking pending payout requests...");
    
    // Find pending payout requests older than 3 days
    const [pendingPayouts] = await pool.query(`
      SELECT 
        p.id,
        p.host_id,
        p.amount,
        u.name as host_name,
        DATEDIFF(NOW(), p.created_at) as days_pending
      FROM payouts p
      JOIN users u ON p.host_id = u.id
      WHERE p.status = 'pending'
        AND p.created_at <= DATE_SUB(NOW(), INTERVAL 3 DAY)
    `);

    if (pendingPayouts.length > 0) {
      // Notify all admins about pending payouts
      const [admins] = await pool.query(`SELECT id, email FROM users WHERE role = 'admin'`);
      
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          message: `⚠️ ${pendingPayouts.length} payout requests have been pending for more than 3 days and need attention!`,
          type: 'admin_payout_alert'
        });
      }

      console.log(`⚠️ Alerted admins about ${pendingPayouts.length} pending payouts`);
    }

    // Check for hosts waiting too long for payouts
    for (const payout of pendingPayouts) {
      if (payout.days_pending >= 7) {
        // Notify host about delay
        await createNotification({
          userId: payout.host_id,
          message: `Your payout request of ₱${payout.amount.toLocaleString()} has been pending for ${payout.days_pending} days. We're working on it and apologize for the delay.`,
          type: 'payout_delay'
        });
      }
    }

  } catch (error) {
    console.error("Error checking pending payouts:", error);
  }
}

// ==========================================
// CLEANUP AND MAINTENANCE
// ==========================================
async function cleanupOldData() {
  try {
    console.log("🧹 Running cleanup tasks...");
    
    // Delete old notifications (older than 90 days)
    const [notificationResult] = await pool.query(`
      DELETE FROM notifications 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        AND is_read = 1
    `);
    console.log(`Deleted ${notificationResult.affectedRows} old read notifications`);

    // Archive completed reservations older than 1 year
    const [archiveCheck] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE status = 'completed' 
        AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
    `);

    if (archiveCheck[0].count > 0) {
      // Create archive table if doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reservations_archive LIKE reservations
      `);

      // Archive old reservations
      await pool.query(`
        INSERT INTO reservations_archive
        SELECT * FROM reservations 
        WHERE status = 'completed' 
          AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
      `);

      // Delete archived reservations
      const [deleteResult] = await pool.query(`
        DELETE FROM reservations 
        WHERE status = 'completed' 
          AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
      `);
      
      console.log(`Archived ${deleteResult.affectedRows} old reservations`);
    }

    // Clean up expired verification codes
    const [verificationResult] = await pool.query(`
      UPDATE users 
      SET verification_code = NULL 
      WHERE verification_code IS NOT NULL 
        AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND is_verified = 0
    `);
    console.log(`Cleaned up ${verificationResult.affectedRows} expired verification codes`);

    // Clean up expired password reset codes
    const [resetResult] = await pool.query(`
      UPDATE users 
      SET reset_code = NULL 
      WHERE reset_code IS NOT NULL 
        AND updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);
    console.log(`Cleaned up ${resetResult.affectedRows} expired password reset codes`);

    // Remove orphaned payment schedules
    const [orphanedPayments] = await pool.query(`
      DELETE ps FROM payment_schedules ps
      LEFT JOIN reservations r ON ps.reservation_id = r.id
      WHERE r.id IS NULL
    `);
    console.log(`Removed ${orphanedPayments.affectedRows} orphaned payment schedules`);

    console.log("✅ Cleanup tasks completed");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// ==========================================
// REVIEW REMINDERS
// ==========================================
async function sendReviewReminders() {
  try {
    console.log("⭐ Sending review reminders...");
    
    // Find completed bookings without reviews (3 days after completion)
    const [bookingsToReview] = await pool.query(`
      SELECT 
        b.id as booking_id,
        b.client_id,
        b.listing_id,
        l.title,
        l.host_id,
        u.name as client_name
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      JOIN users u ON b.client_id = u.id
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.status = 'completed'
        AND r.id IS NULL
        AND DATE(b.updated_at) = DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    `);

    for (const booking of bookingsToReview) {
      // Remind client to review the property
      await createNotification({
        userId: booking.client_id,
        message: `⭐ How was your stay at "${booking.title}"? Share your experience to help other travelers!`,
        type: 'review_reminder'
      });

      // Remind host to review the guest
      await createNotification({
        userId: booking.host_id,
        message: `⭐ Please review your recent guest ${booking.client_name} for "${booking.title}"`,
        type: 'review_reminder'
      });
    }

    console.log(`Sent review reminders for ${bookingsToReview.length} bookings`);

    // Second reminder after 7 days
    const [secondReminder] = await pool.query(`
      SELECT 
        b.id as booking_id,
        b.client_id,
        l.title
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.status = 'completed'
        AND r.id IS NULL
        AND DATE(b.updated_at) = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    for (const booking of secondReminder) {
      await createNotification({
        userId: booking.client_id,
        message: `⭐ Last chance to review "${booking.title}"! Reviews help our community grow.`,
        type: 'review_reminder_final'
      });
    }

  } catch (error) {
    console.error("Error sending review reminders:", error);
  }
}

// ==========================================
// LISTING AVAILABILITY UPDATES
// ==========================================
async function updateListingAvailability() {
  try {
    console.log("🏠 Updating listing availability...");
    
    // Find listings with no availability for next 30 days
    const [fullyBookedListings] = await pool.query(`
      SELECT 
        l.id,
        l.host_id,
        l.title,
        COUNT(DISTINCT DATE(b.start_date)) as booked_days
      FROM listings l
      JOIN bookings b ON l.id = b.listing_id
      WHERE b.status IN ('confirmed', 'approved')
        AND b.start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      GROUP BY l.id
      HAVING booked_days >= 28
    `);

    for (const listing of fullyBookedListings) {
      // Update availability status
      await pool.query(`
        UPDATE listings 
        SET availability_status = 'unavailable',
            updated_at = NOW()
        WHERE id = ?
      `, [listing.id]);

      // Notify host
      await createNotification({
        userId: listing.host_id,
        message: `📅 Your listing "${listing.title}" is fully booked for the next 30 days! Great job!`,
        type: 'listing_fully_booked'
      });
    }

    // Re-enable listings that now have availability
    await pool.query(`
      UPDATE listings l
      SET availability_status = 'available'
      WHERE availability_status = 'unavailable'
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.listing_id = l.id
            AND b.status IN ('confirmed', 'approved')
            AND b.start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        )
    `);

    console.log(`Updated availability for ${fullyBookedListings.length} listings`);
  } catch (error) {
    console.error("Error updating listing availability:", error);
  }
}

// ==========================================
// SYSTEM HEALTH CHECK
// ==========================================
async function performHealthCheck() {
  try {
    console.log("🔍 Performing system health check...");
    
    // Check database connection
    const [dbCheck] = await pool.query("SELECT 1 as healthy");
    
    // Check for stuck transactions
    const [stuckPayments] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE status = 'processing' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    // Check for orphaned bookings
    const [orphanedBookings] = await pool.query(`
      SELECT COUNT(*) as count
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE l.id IS NULL
    `);

    if (stuckPayments[0].count > 0 || orphanedBookings[0].count > 0) {
      // Alert admins about issues
      const [admins] = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          message: `⚠️ System issues detected: ${stuckPayments[0].count} stuck payments, ${orphanedBookings[0].count} orphaned bookings`,
          type: 'system_alert'
        });
      }
    }

    console.log("✅ Health check completed");
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }
}

// ==========================================
// MAIN CRON JOB SCHEDULER
// ==========================================
function startCronJobs() {
  console.log("🚀 Initializing cron jobs...");

  // Daily at midnight - Auto-complete bookings and cleanup
  cron.schedule("0 0 * * *", async () => {
    console.log("🔔 [MIDNIGHT] Running daily tasks...");
    await autoCompleteBookings();
    await autoCompleteReservations();
    await updateListingAvailability();
  });

  // Daily at 10 AM - Payment reminders
  cron.schedule("0 10 * * *", async () => {
    console.log("🔔 [10 AM] Running payment reminder job...");
    await sendPaymentReminders();
  });

  // Daily at 2 PM - Review reminders
  cron.schedule("0 14 * * *", async () => {
    console.log("🔔 [2 PM] Running review reminder job...");
    await sendReviewReminders();
  });

  // Every Monday at 9 AM - Notify hosts about available payouts
  cron.schedule("0 9 * * 1", async () => {
    console.log("🔔 [MONDAY 9 AM] Notifying hosts about available payouts...");
    await sendPayoutAvailableNotifications();
  });

  // Every Wednesday and Friday at 10 AM - Check pending payout requests
  cron.schedule("0 10 * * 3,5", async () => {
    console.log("🔔 [WED/FRI 10 AM] Checking pending payout requests...");
    await checkPendingPayoutRequests();
  });

  // Weekly on Sunday at 2 AM - Cleanup tasks
  cron.schedule("0 2 * * 0", async () => {
    console.log("🔔 [SUNDAY 2 AM] Running cleanup tasks...");
    await cleanupOldData();
  });

  // Every 6 hours - System health check
  cron.schedule("0 */6 * * *", async () => {
    console.log("🔔 [EVERY 6 HOURS] System health check...");
    await performHealthCheck();
  });

  console.log("✅ All cron jobs scheduled successfully!");
  console.log("📅 Active schedules:");
  console.log("   - Daily midnight: Auto-complete bookings/reservations");
  console.log("   - Daily 10 AM: Payment reminders");
  console.log("   - Daily 2 PM: Review reminders");
  console.log("   - Monday 9 AM: Payout available notifications");
  console.log("   - Wed/Fri 10 AM: Check pending payouts");
  console.log("   - Sunday 2 AM: Cleanup old data");
  console.log("   - Every 6 hours: System health check");
}

module.exports = startCronJobs;