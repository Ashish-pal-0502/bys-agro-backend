

const nodemailer = require("nodemailer");

// Amazon SES uses ONE set of SMTP credentials to send from ANY email on your verified domain.
const sesTransporter = nodemailer.createTransport({
  host: "email-smtp.ap-south-1.amazonaws.com", // Mumbai region
  port: 465,
  secure: true,
  auth: {
    user: process.env.SES_SMTP_USERNAME, // Your ONE SES SMTP username
    pass: process.env.SES_SMTP_PASSWORD, // Your ONE SES SMTP password
  },
});

module.exports = { sesTransporter };