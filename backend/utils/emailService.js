const nodemailer = require('nodemailer');
require('dotenv').config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationCode = async (to, code) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}`,
  });
};

exports.sendResetCode = async (to, code) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Password Reset Code',
    text: `Use this code to reset your password: ${code}`,
  });
};

exports.sendPayoutRequestEmail = async (to, amount) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Payout Request Received',
    html: `
      <h2>Payout Request Received</h2>
      <p>Your payout request for <strong>₱${amount.toLocaleString()}</strong> has been received.</p>
      <p>Processing time: 2-3 business days</p>
      <p>You will receive an email once your payout is processed.</p>
      <br>
      <p>Thank you,<br>StayBnB Team</p>
    `
  });
};

exports.sendPayoutProcessingEmail = async (to, amount, transactionRef) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Payout Being Processed',
    html: `
      <h2>Your Payout is Being Processed</h2>
      <p>Your payout of <strong>₱${amount.toLocaleString()}</strong> is being transferred to your account.</p>
      <p>Transaction Reference: ${transactionRef}</p>
      <p>You should receive the funds within 24 hours.</p>
      <br>
      <p>Thank you,<br>StayBnB Team</p>
    `
  });
};

exports.sendPayoutCompletedEmail = async (to, amount) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Payout Completed',
    html: `
      <h2>Payout Successfully Sent</h2>
      <p>Your payout of <strong>₱${amount.toLocaleString()}</strong> has been successfully sent to your account.</p>
      <p>Please check your bank account or GCash.</p>
      <p>If you don't see the funds within 24 hours, please contact support.</p>
      <br>
      <p>Thank you,<br>StayBnB Team</p>
    `
  });
};

exports.sendPayoutRejectedEmail = async (to, amount, reason) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Payout Request Rejected',
    html: `
      <h2>Payout Request Rejected</h2>
      <p>Your payout request for <strong>₱${amount.toLocaleString()}</strong> has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please review the reason and submit a new request if needed.</p>
      <p>If you have questions, please contact support.</p>
      <br>
      <p>Thank you,<br>StayBnB Team</p>
    `
  });
};

exports.sendReservationRequestEmail = async (hostEmail, details) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to: hostEmail,
    subject: 'New Reservation Request',
    html: `
      <h2>New Reservation Request</h2>
      <p>You have a new reservation request for <strong>${details.listingTitle}</strong></p>
      <ul>
        <li>Guest: ${details.guestName}</li>
        <li>Check-in: ${details.checkIn}</li>
        <li>Check-out: ${details.checkOut}</li>
        <li>Total Amount: ₱${details.totalAmount}</li>
        <li>Deposit Required: ₱${details.depositAmount}</li>
      </ul>
      <p>Please log in to approve or decline this request.</p>
    `
  });
};

exports.sendReservationApprovedEmail = async (guestEmail, details) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to: guestEmail,
    subject: 'Reservation Approved - Payment Required',
    html: `
      <h2>Your Reservation Has Been Approved!</h2>
      <p>Great news! Your reservation for <strong>${details.listingTitle}</strong> has been approved.</p>
      <p>To secure your booking, please pay the deposit of <strong>₱${details.depositAmount}</strong></p>
      <a href="${details.paymentUrl}" style="display:inline-block;background:#10b981;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Deposit Now</a>
      <p>Note: The remaining 50% will be due 3 days before your check-in date.</p>
    `
  });
};

exports.sendPaymentReminderEmail = async (guestEmail, details) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to: guestEmail,
    subject: 'Payment Reminder - Remaining Balance Due',
    html: `
      <h2>Payment Reminder</h2>
      <p>This is a reminder that the remaining balance for your reservation is due soon.</p>
      <ul>
        <li>Property: ${details.listingTitle}</li>
        <li>Check-in: ${details.checkIn}</li>
        <li>Remaining Amount: ₱${details.remainingAmount}</li>
        <li>Due Date: ${details.dueDate}</li>
      </ul>
      <a href="${details.paymentUrl}" style="display:inline-block;background:#10b981;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Now</a>
      <p>Please complete payment to avoid cancellation of your reservation.</p>
    `
  });
};

exports.sendCancellationEmail = async (email, details) => {
  await transporter.sendMail({
    from: `"StayBnB" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reservation Cancelled',
    html: `
      <h2>Reservation Cancelled</h2>
      <p>Your reservation has been cancelled.</p>
      <h3>Cancellation Details:</h3>
      <ul>
        <li>Reservation ID: ${details.reservationId}</li>
        <li>Property: ${details.listingTitle}</li>
        <li>Refund Percentage: ${details.refundPercentage}%</li>
        <li>Cancellation Fee: ₱${details.cancellationFee}</li>
        <li>Refund Amount: ₱${details.refundAmount}</li>
      </ul>
      ${details.refundAmount > 0 ? '<p>Your refund is being processed and should appear in your account within 5-10 business days.</p>' : ''}
    `
  });
};