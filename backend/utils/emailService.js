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