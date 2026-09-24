const crypto = require("crypto");
const Razorpay = require("razorpay");

const getClient = () =>
  new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET,
  });

// Checkout returns HMAC_SHA256(order_id + "|" + payment_id, key_secret) as razorpay_signature.
const isValidSignature = (orderId, paymentId, signature, secret = process.env.RAZOR_PAY_SECRET) => {
  if (!secret || !orderId || !paymentId || typeof signature !== "string") return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const fetchRazorpayOrder = (razorpayOrderId) => getClient().orders.fetch(razorpayOrderId);

// /order/payment charges a whole-rupee amount (Math.round) while orders can carry paise,
// so allow up to one rupee of rounding difference per batch.
const AMOUNT_TOLERANCE_PAISE = 100;

// Checks Razorpay's own record of the payment against what we expect.
// Returns null when fine, otherwise a human-readable reason.
const checkRazorpayOrder = (rzpOrder, { razorpayOrderId, userId, orders }) => {
  if (!rzpOrder || rzpOrder.id !== razorpayOrderId) {
    return "Payment record does not match";
  }

  if (rzpOrder.status !== "paid") {
    return "Payment has not been completed";
  }

  if (String(rzpOrder.notes?.userId) !== String(userId)) {
    return "Payment does not belong to this user";
  }

  const expectedPaise = Math.round(
    orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0) * 100
  );

  if (Math.abs(Number(rzpOrder.amount_paid) - expectedPaise) > AMOUNT_TOLERANCE_PAISE) {
    return "Paid amount does not match the order total";
  }

  return null;
};

module.exports = { isValidSignature, fetchRazorpayOrder, checkRazorpayOrder };
