const nodemailer = require("nodemailer");

const createTransporter = (email, password) => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: email,
      pass: password,
    },
  });
};

const supportTransporter = createTransporter(process.env.SUPPORT_EMAIL, process.env.SUPPORT_PASS);
const orderTransporter   = createTransporter(process.env.ORDER_EMAIL, process.env.ORDER_PASS);
const cartTransporter    = createTransporter(process.env.CART_EMAIL, process.env.CART_PASS);
const verifyTransporter  = createTransporter(process.env.VERIFY_EMAIL, process.env.VERIFY_PASS);
const helpTransporter    = createTransporter(process.env.HELP_EMAIL, process.env.HELP_PASS);

module.exports = {
    supportTransporter,
    orderTransporter,
    cartTransporter,
    verifyTransporter,
    helpTransporter
}
