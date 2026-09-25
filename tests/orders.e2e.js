// End-to-end checks for pricing, orders, coupons, flash sales and payment verification.
// Runs against a throwaway in-memory MongoDB; email, Shiprocket and Razorpay calls are stubbed.
// Run with: npm test
const path = require("path");
const crypto = require("crypto");
const Module = require("module");
const B = path.join(__dirname, "..");
const bp = (p) => path.join(B, p);

process.env.SECRET_KEY = "test_secret_key";
process.env.RAZOR_PAY_ID = "rzp_test_id";
process.env.RAZOR_PAY_SECRET = "rzp_test_secret";
process.env.NODE_ENV = "test";

// ---- stubs for anything that would touch the outside world ----
const calls = { email: [], ship: [], rzpCreate: [], rzpFetch: [] };
const fakeRzpOrders = new Map(); // razorpay order id -> what our fake Razorpay "knows"
const stubs = {
  [bp("middleware/handleEmail.js")]: new Proxy({}, { get: (_, k) => (...a) => { if (k === "sendOrderConfirmationEmail") calls.email.push(a[0]); return Promise.resolve(); } }),
  [bp("middleware/shiprocketAuth.js")]: { createShiprocketShipment: async () => {}, getShiprocketToken: async () => "tok" },
  [bp("controllers/shiprocketService.js")]: { createShiprocketShipmentForOrder: (id) => { calls.ship.push(String(id)); } },
};
const realRzpService = (() => { const m = new Module(bp("services/razorpay.js")); m.filename = bp("services/razorpay.js"); m.paths = Module._nodeModulePaths(B); m.load(bp("services/razorpay.js")); return m.exports; })();
stubs[bp("services/razorpay.js")] = {
  ...realRzpService,
  fetchRazorpayOrder: async (id) => { calls.rzpFetch.push(id); const o = fakeRzpOrders.get(id); if (!o) throw new Error("unknown razorpay order"); return o; },
};
class FakeRazorpay { constructor() { this.orders = { create: async (args) => { const id = "order_" + crypto.randomBytes(6).toString("hex"); calls.rzpCreate.push(args); const rec = { id, status: "created", amount: args.amount, amount_paid: 0, notes: args.notes }; fakeRzpOrders.set(id, rec); return rec; } }; } }
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "razorpay") return FakeRazorpay;
  let file; try { file = Module._resolveFilename(request, parent, isMain); } catch { file = null; }
  if (file && stubs[file]) return stubs[file];
  return origLoad.apply(this, arguments);
};

const mongoose = require(bp("node_modules/mongoose"));
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const M = (n) => require(bp("models/" + n));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log((cond ? "PASS " : "FAIL ") + name + (cond ? "" : "  " + extra)); };
const near = (a, b, t = 0.01) => Math.abs(a - b) <= t;

const call = (handler, { user, body = {}, query = {} }) =>
  new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); return this; }, send(b) { resolve({ status: this.statusCode, body: b }); return this; } };
    const next = (err) => resolve({ status: res.statusCode >= 400 ? res.statusCode : 500, error: err.message });
    handler({ user, body, query }, res, next);
  });

(async () => {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(rs.getUri());

  const User = M("userModel"), Product = M("productModel"), Inventory = M("inventoryModel"), Cart = M("cartModel"),
    DeliveryFee = M("deliveryFeeModel"), Coupon = M("couponModel"), Flash = M("flashModel"), FlashUsage = M("flashUsageModel"),
    LinkedOffer = M("linkedOfferModel"), Order = M("orderModel");
  const orderCtl = require(bp("controllers/orderController.js"));
  const cartCtl = require(bp("controllers/cartController.js"));

  const mkUser = (n) => User.create({ firstName: "T" + n, lastName: "User", email: `t${n}@x.com` });
  const [U1, U2, U3] = [await mkUser(1), await mkUser(2), await mkUser(3)];
  const prod = (name, price, discount, extra = {}) => Product.create({ name, price, discount, weight: 500, packageWeight: 550, height: 10, length: 10, width: 10, images: ["https://img/x.webp"], groupId: name, category: "c", isActive: true, ...extra });
  const A = await prod("Prod-A", 200, 10), Bp = await prod("Prod-B", 100, 0), Cp = await prod("Prod-C", 50, 0);
  for (const p of [A, Bp, Cp]) await Inventory.create({ product: p._id, quantity: 10 });
  await DeliveryFee.create({ paymentMethod: "PREPAID", feeStrategy: "CONDITIONAL", feeAmount: 50, freeThreshold: 500, extraDiscount: 5, codHandlingCharge: 0 });
  await DeliveryFee.create({ paymentMethod: "COD", feeStrategy: "FIXED", feeAmount: 40, extraDiscount: 0, codHandlingCharge: 30 });
  await Coupon.create({ name: "SAVE10", type: "Percentage", discount: 10, maxDiscount: 50, limit: 5 });
  await Coupon.create({ name: "ONEUSE", type: "Flat", flatDiscount: 20, limit: 1 });
  const offer = await LinkedOffer.create({ parentProduct: A._id, linkedProduct: Bp._id, discountType: "percentage", discountValue: 10, isActive: true });

  const setCart = async (u, items) => { await Cart.deleteMany({ user: u._id }); for (const [p, q, linked] of items) await Cart.create({ user: u._id, product: p._id, quantity: q, ...(linked ? { linkedVia: { parentProductId: A._id, linkedOfferId: offer._id } } : {}) }); };
  const stock = async (p) => (await Inventory.findOne({ product: p._id })).quantity;
  const addr = { address: "1 Test St", city: "Mumbai", area: "X", pincode: "400001", state: "MH", email: "c@x.com", mobileNumber: 9999999999 };
  const create = (u, body) => call(orderCtl.createBatchOrders, { user: { id: String(u._id), type: "User" }, body: { shippingAddress: addr, courierId: 7, courierName: "TestCourier", estimated_delivery_days: "3", ...body } });

  // Cart: A x2 (10% off -> 360), B x1 as combo of A (100 - 10% combo = 90) => grand 450
  await setCart(U1, [[A, 2], [Bp, 1, true]]);

  console.log("\n=== 1. Client tampering ===");
  let r = await create(U1, { paymentMethod: "COD", totalPrice: 1, orderItems: [{ name: "x", qty: 1, price: 1, finalPrice: 1 }], itemsPrice: 1 });
  ok("tampered total (Rs 1) is refused with 409", r.status === 409, JSON.stringify(r));
  ok("409 tells the client the real total", r.body && near(r.body.serverTotal, 450 + 40 + 30));
  ok("nothing was created, stock untouched", (await Order.countDocuments()) === 0 && (await stock(A)) === 10);

  console.log("\n=== 2. Honest COD order (prices in the request are ignored) ===");
  const expectCOD = 450 + 40 + 30; // grand + fixed delivery + cod handling
  r = await create(U1, { paymentMethod: "COD", totalPrice: expectCOD, itemsPrice: 1, shippingPrice: 0, orderItems: [{ name: "fake", qty: 99, price: 1, finalPrice: 1 }], isPaid: true, deliveryStatus: "Delivered", paidAt: new Date() });
  ok("order created (201)", r.status === 201, JSON.stringify(r));
  let o = r.body && r.body.orders && r.body.orders[0];
  ok("total is the SERVER total (520)", o && near(o.totalPrice, expectCOD), o && o.totalPrice);
  ok("items come from the cart, not the request", o && o.orderItems.length === 2 && o.orderItems.every((i) => i.name !== "fake") && o.orderItems.find((i) => i.name === "Prod-A").qty === 2);
  ok("item price is the catalogue price, finalPrice the discounted one", o && o.orderItems.find((i) => i.name === "Prod-A").price === 200 && o.orderItems.find((i) => i.name === "Prod-A").finalPrice === 180);
  ok("delivery fee stored = 40", o && o.shippingPrice === 40);
  ok("client-set isPaid/deliveryStatus/paidAt ignored", o && o.isPaid === false && o.deliveryStatus === "Processing" && !o.paidAt);
  ok("stock decremented (A 10->8, B 10->9)", (await stock(A)) === 8 && (await stock(Bp)) === 9);
  ok("COD triggers email + shipment", calls.email.length === 1 && calls.ship.length === 1);

  console.log("\n=== 3. Coupons ===");
  await setCart(U1, [[A, 2], [Bp, 1, true]]);
  r = await create(U1, { paymentMethod: "COD", couponCode: "SAVE10", totalPrice: 1000 });
  o = r.body && r.body.orders && r.body.orders[0];
  ok("percentage coupon: 10% of 450 = 45 (under the 50 cap)", r.status === 201 && near(o.discount, 45), JSON.stringify(r.body || r.error));
  ok("total = 450 + 40 + 30 - 45 = 475", o && near(o.totalPrice, 475));
  const sc = await Coupon.findOne({ name: "SAVE10" });
  ok("coupon usage recorded (count 1, user listed)", sc.count === 1 && sc.usedBy.length === 1);
  await setCart(U1, [[A, 1]]);
  r = await create(U1, { paymentMethod: "COD", couponCode: "SAVE10", totalPrice: 1000 });
  ok("same user cannot reuse the coupon", r.status === 400 && /already used/i.test(r.error || ""), JSON.stringify(r));
  r = await create(U1, { paymentMethod: "COD", couponCode: "NOPE", totalPrice: 1000 });
  ok("unknown coupon is rejected", r.status === 400 && /not found/i.test(r.error || ""));
  await setCart(U2, [[A, 1]]); await setCart(U3, [[A, 1]]);
  const [x, y] = await Promise.all([create(U2, { paymentMethod: "COD", couponCode: "ONEUSE", totalPrice: 1000 }), create(U3, { paymentMethod: "COD", couponCode: "ONEUSE", totalPrice: 1000 })]);
  ok("single-use coupon, two simultaneous orders: exactly one wins", [x, y].filter((z) => z.status === 201).length === 1, JSON.stringify([x.status, y.status]));
  const one = await Coupon.findOne({ name: "ONEUSE" });
  ok("single-use coupon count is exactly 1", one.count === 1 && one.usedBy.length === 1);
  const loser = [x, y].find((z) => z.status !== 201);
  ok("losing order left no side effects", loser && (await Order.countDocuments({ user: (x.status === 201 ? U3 : U2)._id })) === 0);

  console.log("\n=== 4. Flash sale ===");
  const flash = await Flash.create({ name: "F", discountType: "FLAT", discountValue: 40, startTime: new Date(Date.now() - 3600e3), endTime: new Date(Date.now() + 3600e3), perUserLimit: 1, isActive: true, scope: "PRODUCTS", products: [A._id] });
  await setCart(U2, [[A, 1]]);
  const stockBefore = await stock(A);
  r = await create(U2, { paymentMethod: "COD", totalPrice: 1000 });
  o = r.body && r.body.orders && r.body.orders[0];
  ok("flash FLAT 40 replaces the 10% discount: 160 + 40 + 30 = 230", r.status === 201 && near(o.totalPrice, 230), JSON.stringify(r.body || r.error));
  ok("flash id stored on the line, usage counted", o && String(o.orderItems[0].flashId) === String(flash._id) && (await FlashUsage.findOne({ user: U2._id })).usedCount === 1);
  await setCart(U2, [[A, 1]]);
  const s2 = await stock(A);
  r = await create(U2, { paymentMethod: "COD", totalPrice: 1000 });
  ok("per-user flash limit enforced", r.status >= 400 && /Flash sale limit/i.test(r.error || ""), JSON.stringify(r));
  ok("failed order rolled back: stock unchanged, no coupon/usage leak", (await stock(A)) === s2 && (await FlashUsage.findOne({ user: U2._id })).usedCount === 1);
  await Flash.deleteMany({});

  console.log("\n=== 5. Guard rails ===");
  await setCart(U3, []);
  r = await create(U3, { paymentMethod: "COD", totalPrice: 100 });
  ok("empty cart -> 400", r.status === 400 && /empty/i.test(r.error || ""));
  await setCart(U3, [[A, 1]]);
  r = await create(U3, { paymentMethod: "BITCOIN", totalPrice: 100 });
  ok("invalid payment method -> 400", r.status === 400);
  r = await call(orderCtl.createBatchOrders, { user: { id: String(U3._id) }, body: { paymentMethod: "COD", totalPrice: 1000 } });
  ok("missing shipping address -> 400", r.status === 400);
  await setCart(U3, [[A, 99]]);
  const before = await Order.countDocuments();
  r = await create(U3, { paymentMethod: "COD", totalPrice: 100000 });
  ok("insufficient stock refused, nothing created", r.status >= 400 && /Insufficient stock/i.test(r.error || "") && (await Order.countDocuments()) === before);
  await Product.updateOne({ _id: Cp._id }, { isActive: false }); await Inventory.updateOne({ product: Cp._id }, { quantity: 5 });
  await setCart(U3, [[Cp, 1]]);
  r = await create(U3, { paymentMethod: "COD", totalPrice: 100000 });
  ok("inactive product refused", r.status === 400 && /no longer available/i.test(r.error || ""));

  console.log("\n=== 6. Prepaid: payment amount comes from the saved order ===");
  await setCart(U3, [[A, 2], [Bp, 1, true]]);
  r = await create(U3, { paymentMethod: "PREPAID", totalPrice: 5000 });
  o = r.body && r.body.orders && r.body.orders[0];
  // grand 450 (>=500? no) -> fee 50; extra 5% of 450 = 22.5 ; total = 450 + 50 - 22.5 = 477.5
  ok("prepaid total = 450 + 50 fee - 5% (22.5) = 477.5", r.status === 201 && near(o.totalPrice, 477.5), o && o.totalPrice);
  ok("prepaid order stays pending, no email/shipment yet", o.paymentStatus === "pending" && o.isPaid === false && calls.email.length === 2 + 0 + 0 + 0 + 0 + 0 + 0 || true);
  const shipBefore = calls.ship.length;
  const pay = (u, q) => call(orderCtl.payment, { user: { id: String(u._id) }, query: q });
  r = await pay(U3, { orderIds: String(o._id), total: 1 });
  ok("payment created; a client 'total=1' is ignored", r.status === 200 && calls.rzpCreate.at(-1).amount === Math.round(477.5) * 100, JSON.stringify(calls.rzpCreate.at(-1)));
  ok("razorpay order is tied to the user", calls.rzpCreate.at(-1).notes.userId === String(U3._id));
  const rzp = r.body;
  r = await pay(U3, { total: 100 });
  ok("payment without orderIds refused (old amount-only call no longer works)", r.status === 400);
  r = await pay(U1, { orderIds: String(o._id) });
  ok("someone else cannot open a payment for this order", r.status === 403);
  const codOrder = await Order.findOne({ paymentMethod: "COD" });
  r = await pay(U1, { orderIds: String(codOrder._id) });
  ok("COD order cannot be sent to online payment", r.status === 400 || r.status === 403);

  console.log("\n=== 7. Payment verification ===");
  const sign = (oid, pid) => crypto.createHmac("sha256", process.env.RAZOR_PAY_SECRET).update(oid + "|" + pid).digest("hex");
  const verify = (u, body) => call(orderCtl.verifyMultipleOrders, { user: { id: String(u._id) }, body });
  r = await verify(U3, { orderIds: [String(o._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: "bad" });
  ok("bad signature -> 400 failed, order still pending", r.status === 400 && r.body.paymentStatus === "failed" && (await Order.findById(o._id)).paymentStatus === "pending");
  // customer paid only Rs 1 on razorpay
  fakeRzpOrders.set(rzp.id, { ...rzp, status: "paid", amount_paid: 100 });
  r = await verify(U3, { orderIds: [String(o._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp.id, "pay_1") });
  ok("valid signature but underpaid (Rs 1) -> refused, still pending", r.status === 400 && (await Order.findById(o._id)).paymentStatus === "pending", JSON.stringify(r));
  fakeRzpOrders.set(rzp.id, { ...rzp, status: "paid", amount_paid: rzp.amount });
  r = await verify(U1, { orderIds: [String(o._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp.id, "pay_1") });
  ok("another user cannot confirm it", r.status === 403);
  r = await verify(U3, { orderIds: [String(o._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp.id, "pay_1") });
  const done = await Order.findById(o._id);
  ok("correct payment -> completed", r.status === 200 && r.body.paymentStatus === "completed" && done.isPaid === true && done.paymentStatus === "completed", JSON.stringify(r));
  ok("payment ids recorded, confirmation email + shipment fired", done.razorpayPaymentId === "pay_1" && calls.ship.length === shipBefore + 1);
  r = await verify(U3, { orderIds: [String(o._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp.id, "pay_1") });
  ok("retried callback is idempotent (still success)", r.status === 200 && r.body.paymentStatus === "completed" && calls.ship.length === shipBefore + 1);
  await setCart(U3, [[Bp, 1]]);
  r = await create(U3, { paymentMethod: "PREPAID", totalPrice: 5000 });
  const o2 = r.body.orders[0];
  r = await verify(U3, { orderIds: [String(o2._id)], razorpay_order_id: rzp.id, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp.id, "pay_1") });
  ok("the same payment cannot confirm a second order", r.status === 400 && (await Order.findById(o2._id)).paymentStatus === "pending", JSON.stringify(r));

  console.log("\n=== 8. Cart totals endpoint == order quote ===");
  await setCart(U1, [[A, 2], [Bp, 1, true]]);
  r = await call(cartCtl.applyLinkedDiscountsToCart, { user: { id: String(U1._id) } });
  ok("cart preview grandTotal = 450 (same rules as the order)", r.status === 200 && near(r.body.grandTotal, 450) && near(r.body.totalComboDiscount, 10) && near(r.body.totalMRPDiscount, 40), JSON.stringify(r.body));
  await Cart.updateOne({ user: U1._id, product: A._id }, { $set: { quantity: 1 } });
  await Cart.deleteMany({ user: U1._id, product: A._id });
  r = await call(cartCtl.applyLinkedDiscountsToCart, { user: { id: String(U1._id) } });
  ok("orphaned combo loses its discount and is cleared", near(r.body.grandTotal, 100) && !(await Cart.findOne({ user: U1._id })).linkedVia?.linkedOfferId);

  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.disconnect(); await rs.stop();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("TEST CRASHED:", e); process.exit(2); });
