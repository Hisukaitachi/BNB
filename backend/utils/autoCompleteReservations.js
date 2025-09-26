const pool = require('../db');
const { createNotification } = require('../controllers/notificationsController');

async function autoCompleteReservations() {
    try {
        console.log('🏨 Running auto-complete reservations job...');

        // Find reservations that should be auto-completed
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
            console.log('ℹ️ No reservations to auto-complete.');
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

        // Send notifications for each completed reservation
        for (const reservation of reservations) {
            // Log to reservation history
            await pool.query(`
                INSERT INTO reservation_history (reservation_id, user_id, action, old_status, new_status, notes)
                VALUES (?, 0, 'auto_completed', 'confirmed', 'completed', 'Auto-completed after check-out date')
            `, [reservation.id]);

            // Notify client
            await createNotification({
                userId: reservation.client_id,
                message: `Your stay at "${reservation.title}" is now complete. Please leave a review!`,
                type: 'reservation_completed'
            });

            // Notify host
            await createNotification({
                userId: reservation.host_id,
                message: `Reservation for "${reservation.title}" has been completed automatically.`,
                type: 'reservation_completed'
            });
        }

        console.log(`✅ Successfully auto-completed ${reservations.length} reservation(s).`);

    } catch (error) {
        console.error('❌ Error during auto-complete reservations job:', error);
    }
}

module.exports = autoCompleteReservations;