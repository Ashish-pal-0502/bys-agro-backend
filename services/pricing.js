// Single source of truth for what a customer pays. Pure functions: callers load the data.
// Mirrors what the storefront displays, so a quote only differs from the UI if the data changed.

const { flashAppliesTo, flashDiscountPerUnit } = require("../utils/flashPricing");

const clampPositive = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

const offerIsLive = (offer, now) =>
  Boolean(
    offer &&
      offer.isActive &&
      (!offer.startDate || offer.startDate <= now) &&
      (!offer.endDate || offer.endDate >= now)
  );

const comboDiscountPerUnit = (basePrice, offer) => {
  if (offer.discountType === "percentage") return (basePrice * offer.discountValue) / 100;
  if (offer.discountType === "flat") return offer.discountValue;
  return 0;
};

/**
 * cartItems: [{ _id, quantity, product: { _id, price, discount }, linkedVia?: { parentProductId, linkedOfferId } }]
 * offersById: Map<string, offer>   flashSale: active flash sale or null
 *
 * Per unit: flash price replaces the regular discount while a flash sale applies (as on the storefront);
 * a live linked (combo) offer is taken off the base price on top of that.
 * Combo items whose parent is missing, or whose offer is no longer live, lose the combo discount and are
 * reported in `revokedItemIds` so the caller can clear them.
 */
const priceCartItems = ({ cartItems, flashSale, offersById, now = new Date() }) => {
  const productIdsInCart = new Set(cartItems.map((i) => String(i.product._id)));

  let totalMRP = 0;
  let totalComboDiscount = 0;
  let totalMRPDiscount = 0;
  let grandTotal = 0;
  const revokedItemIds = [];
  const lines = [];

  for (const item of cartItems) {
    const product = item.product;
    const qty = Number(item.quantity) || 0;
    const base = Number(product.price) || 0;

    const flash = flashAppliesTo(flashSale, product._id);
    const regularDiscountPerUnit = flash
      ? flashDiscountPerUnit(base, flashSale)
      : Math.min(base * ((Number(product.discount) || 0) / 100), base);

    let comboPerUnit = 0;
    const offerId = item.linkedVia?.linkedOfferId;
    if (offerId) {
      const parentInCart = productIdsInCart.has(String(item.linkedVia.parentProductId));
      const offer = offersById.get(String(offerId));

      if (parentInCart && offerIsLive(offer, now)) {
        comboPerUnit = Math.min(clampPositive(comboDiscountPerUnit(base, offer)), base);
      } else {
        revokedItemIds.push(item._id);
      }
    }

    const unitFinal = Math.max(base - regularDiscountPerUnit - comboPerUnit, 0);

    totalMRP += base * qty;
    totalMRPDiscount += regularDiscountPerUnit * qty;
    totalComboDiscount += comboPerUnit * qty;
    grandTotal += unitFinal * qty;

    lines.push({
      item,
      qty,
      base,
      flashId: flash ? flashSale._id : null,
      // whole rupees, like the storefront's line prices
      unitFinalRounded: Math.round(Math.max(base - regularDiscountPerUnit, 0)),
    });
  }

  return { lines, totalMRP, totalComboDiscount, totalMRPDiscount, grandTotal, revokedItemIds };
};

// rule: DeliveryFee document for the chosen payment method (or null)
const deliveryFeeFor = (grandTotal, rule) => {
  if (!rule) return 0;
  if (rule.feeStrategy === "FREE") return 0;
  if (rule.feeStrategy === "CONDITIONAL") return grandTotal >= rule.freeThreshold ? 0 : rule.feeAmount;
  if (rule.feeStrategy === "FIXED") return rule.feeAmount;
  return 0;
};

// Coupon discount on the cart total, capped by maxDiscount and by the cart total itself.
const couponDiscountFor = (coupon, grandTotal) => {
  if (!coupon) return 0;

  let discount = 0;
  if (coupon.type === "Percentage") {
    discount = (grandTotal * coupon.discount) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  } else if (coupon.type === "Flat") {
    discount = coupon.flatDiscount;
  }

  return Math.min(clampPositive(discount), grandTotal);
};

const orderTotals = ({ grandTotal, deliveryRule, coupon }) => {
  const deliveryFee = deliveryFeeFor(grandTotal, deliveryRule);
  const codHandlingCharge = Number(deliveryRule?.codHandlingCharge) || 0;
  const extraDiscountPercent = Number(deliveryRule?.extraDiscount) || 0;
  const couponDiscount = couponDiscountFor(coupon, grandTotal);

  const total = Math.max(
    0,
    grandTotal + deliveryFee + codHandlingCharge - (grandTotal * extraDiscountPercent) / 100 - couponDiscount
  );

  return { deliveryFee, codHandlingCharge, extraDiscountPercent, couponDiscount, total };
};

module.exports = { priceCartItems, deliveryFeeFor, couponDiscountFor, orderTotals };
