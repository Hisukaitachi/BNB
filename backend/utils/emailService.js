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
