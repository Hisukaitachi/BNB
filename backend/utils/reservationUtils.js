const pool = require('../db');

class ReservationUtils {
    // Calculate pricing breakdown
    static calculatePricing(basePrice, nights, guestCount = 1) {
        const total = basePrice * nights;
        const serviceFee = Math.round(total * 0.1 * 100) / 100; // 10% service fee
        const cleaningFee = 50; // Fixed cleaning fee
        const taxes = Math.round(total * 0.12 * 100) / 100; // 12% tax
        
        return {
            basePrice: Math.round(basePrice * 100) / 100,
            nights,
            subtotal: Math.round(total * 100) / 100,
            serviceFee,
            cleaningFee,
            taxes,
            totalAmount: Math.round((total + serviceFee + cleaningFee + taxes) * 100) / 100
        };
    }

    // Check date availability
    static async checkAvailability(listingId, checkInDate, checkOutDate, excludeReservationId = null) {
        let query = `
            SELECT id FROM reservations 
            WHERE listing_id = ? 
            AND status IN ('confirmed', 'pending')
            AND NOT (check_out_date <= ? OR check_in_date >= ?)
        `;
        
        const params = [listingId, checkInDate, checkOutDate];
        
        if (excludeReservationId) {
            query += ' AND id != ?';
            params.push(excludeReservationId);
        }

        const [conflicts] = await pool.query(query, params);
        return conflicts.length === 0;
    }

    // Generate reservation confirmation number
    static generateConfirmationNumber() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `RES${timestamp}${random}`;
    }

    // Get reservation status color for UI
    static getStatusColor(status) {
        const colors = {
            pending: '#f59e0b',
            confirmed: '#10b981',
            cancelled: '#ef4444',
            completed: '#6b7280'
        };
        return colors[status] || '#6b7280';
    }

    // Calculate cancellation policy
    static calculateCancellationRefund(reservation) {
        const now = new Date();
        const checkInDate = new Date(reservation.check_in_date);
        const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
        
        let refundPercentage = 0;
        
        if (daysUntilCheckIn >= 7) {
            refundPercentage = 100; // Full refund
        } else if (daysUntilCheckIn >= 3) {
            refundPercentage = 50; // 50% refund
        } else {
            refundPercentage = 0; // No refund
        }
        
        const refundAmount = (reservation.total_amount * refundPercentage) / 100;
        
        return {
            daysUntilCheckIn,
            refundPercentage,
            refundAmount: Math.round(refundAmount * 100) / 100,
            policy: this.getCancellationPolicyText(daysUntilCheckIn)
        };
    }

    static getCancellationPolicyText(daysUntilCheckIn) {
        if (daysUntilCheckIn >= 7) {
            return 'Free cancellation until 7 days before check-in';
        } else if (daysUntilCheckIn >= 3) {
            return '50% refund for cancellations 3-6 days before check-in';
        } else {
            return 'No refund for cancellations within 3 days of check-in';
        }
    }
}

module.exports = ReservationUtils;
