// Mirrors what the storefront shows: while a flash sale applies to a product, its price is
// base - flash discount and the product's regular discount is NOT applied on top.

const flashAppliesTo = (flashSale, productId) => {
  if (!flashSale) return false;
  if (flashSale.scope === "ALL") return true;
  if (flashSale.scope === "PRODUCTS") {
    return (flashSale.products || []).some((p) => String(p) === String(productId));
  }
  return false;
};

// Discount per single unit, clamped so the price never goes below zero.
const flashDiscountPerUnit = (price, flashSale) => {
  const base = Number(price) || 0;
  const value = Number(flashSale?.discountValue) || 0;

  const discount = flashSale?.discountType === "PERCENT" ? (base * value) / 100 : value;
  return Math.min(Math.max(discount, 0), base);
};

module.exports = { flashAppliesTo, flashDiscountPerUnit };
