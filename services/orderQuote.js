const Cart = require("../models/cartModel");
const FlashSale = require("../models/flashModel");
const LinkedOffer = require("../models/linkedOfferModel");
const DeliveryFee = require("../models/deliveryFeeModel");
const Coupon = require("../models/couponModel");
const { priceCartItems, orderTotals } = require("./pricing");

class QuoteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Cart + the active flash sale + the linked offers it references, priced by the shared rules.
const priceUserCart = async (userId, now = new Date()) => {
  const rawItems = await Cart.find({ user: userId }).populate("product");
  const cartItems = rawItems.filter((item) => item.product);

  const [flashSale, offers] = await Promise.all([
    FlashSale.findOne({ isActive: true, startTime: { $lte: now }, endTime: { $gte: now } }).lean(),
    LinkedOffer.find({
      _id: { $in: cartItems.map((i) => i.linkedVia?.linkedOfferId).filter(Boolean) },
    }).lean(),
  ]);

  const offersById = new Map(offers.map((o) => [String(o._id), o]));
  const priced = priceCartItems({ cartItems, flashSale, offersById, now });

  return { rawItems, cartItems, ...priced };
};

// Everything an order is charged for, computed from the database only. Nothing here reads prices
// from the request: the caller passes just the payment method and an optional coupon code.
const buildOrderQuote = async ({ userId, paymentMethod, couponCode }) => {
  if (paymentMethod !== "PREPAID" && paymentMethod !== "COD") {
    throw new QuoteError(400, "Invalid payment method");
  }

  const priced = await priceUserCart(userId);

  if (priced.lines.length === 0) {
    throw new QuoteError(400, "Your cart is empty");
  }

  for (const line of priced.lines) {
    if (line.item.product.isActive === false) {
      throw new QuoteError(400, `${line.item.product.name} is no longer available`);
    }
    if (!(line.qty > 0)) {
      throw new QuoteError(400, "Invalid quantity in cart");
    }
  }

  const deliveryRule = await DeliveryFee.findOne({ paymentMethod }).lean();

  let coupon = null;
  if (couponCode) {
    if (typeof couponCode !== "string") throw new QuoteError(400, "Invalid coupon");

    coupon = await Coupon.findOne({ name: couponCode.trim() });
    if (!coupon) throw new QuoteError(400, "Coupon not found");
    if (coupon.count >= coupon.limit) throw new QuoteError(400, "Coupon usage limit reached");
    if (coupon.usedBy.some((u) => String(u.user) === String(userId))) {
      throw new QuoteError(400, "Coupon already used by this user");
    }
  }

  const totals = orderTotals({ grandTotal: priced.grandTotal, deliveryRule, coupon });

  const orderItems = priced.lines.map(({ item, qty, base, flashId, unitFinalRounded }) => {
    const p = item.product;
    return {
      name: p.name,
      qty,
      image: p.images?.[0] || "/icons/honey-jar.png",
      price: base,
      finalPrice: unitFinalRounded,
      product: p._id,
      flashId,
      isCombo: Boolean(p.isCombo),
      itemWeight: parseFloat(p.weight) || 0,
      weight: parseFloat(p.packageWeight || p.weight) || 0,
      height: Number(p.height) || 0,
      length: Number(p.length) || 0,
      width: Number(p.width) || 0,
    };
  });

  const itemsPrice = orderItems.reduce((sum, i) => sum + i.finalPrice * i.qty, 0);

  return {
    orderItems,
    itemsPrice,
    grandTotal: priced.grandTotal,
    deliveryFee: totals.deliveryFee,
    codHandlingCharge: totals.codHandlingCharge,
    extraDiscountPercent: totals.extraDiscountPercent,
    couponDiscount: totals.couponDiscount,
    coupon,
    total: totals.total,
    freeDelivery: totals.deliveryFee === 0,
  };
};

module.exports = { QuoteError, priceUserCart, buildOrderQuote };
