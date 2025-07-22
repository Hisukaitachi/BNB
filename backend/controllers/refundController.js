const pool = require('../db');
const paymentService = require('../services/paymentService');

// controllers/refundController.js
exports.refundPayment = async (req, res) => {
  const { bookingId, reason } = req.body;
  const clientId = req.user.id;

  try {
    // 1. Get the payment ID from booking
    const [rows] = await pool.query(`
  SELECT p.payment_intent_id, p.amount
FROM payments p
JOIN bookings b ON b.id = p.booking_id
WHERE b.id = ? AND b.client_id = ? AND p.status = 'succeeded';

`, [bookingId, clientId]);

if (rows.length === 0) {
  return res.status(404).json({ message: 'No successful payment found for this booking' });
}

    const { payment_id, amount } = rows[0];

    // 2. Refund via PayMongo
    const refund = await paymentService.createRefund(payment_id, reason, amount);

    res.status(200).json({ message: 'Refund issued', refund });
  } catch (err) {
    console.error('[Refund Error]', err.message);
    res.status(500).json({ message: 'Refund failed', error: err.message });
  }
};
