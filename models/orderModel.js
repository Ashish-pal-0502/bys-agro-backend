const mongoose = require("mongoose");
const Counter = require('../models/counter.js')

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    visualId: { type: String },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true, default: 1 },
        image: { type: String },
        price: { type: Number, required: true },
        flashId: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashSale' },
        finalPrice: { type: Number, required: true },
        isCombo: { type: Boolean },
        weight: { type: Number },
        itemWeight: { type: Number },
        height: { type: Number },
        length: { type: Number },
        width: { type: Number },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        }
      },
    ],
    shippingAddress: {
      address: { type: String },
      city: { type: String },
      landmark: { type: String },
      area: { type: String },
      mobileNumber: { type: Number },
      email: { type: String },
      pincode: { type: String },
      state: { type: String },
    },
    emailDelivery: {
      type: String,
    },
    itemsPrice: {
      type: Number,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    invoiceId: {
      type: String,
    },
    isPaid: {
      type: Boolean,
    },
    taxPrice: {
      type: Number,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    freeDelivery: {
      type: Boolean,
      default: false
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    paidAt: {
      type: Date,
    },
    deliveryStatus: {
      type: String,
      enum: ["Processing", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Processing",
    },
    deliveredAt: {
      type: Date,
    },
    notes: {
      type: String,
      required: false,
    },
    wayBill: {
      type: String
    },
    discount: {
      type: Number
    },
    code: {
      type: String
    },
    courierId: {
      type: Number,
      required: true
    },
    courierName: {
      type: String,
      default: false
    },
    totalWeight: {
      type: Number,
      min: 0.1 
    },
    totalHeight: {
      type: Number,
      required: true
    },
    totalWidth: {
      type: Number,
      required: true
    },
    totalLength: {
      type: Number,
      required: true
    },
    freeDelivery: {
      type: Boolean,
      default: false
    },
    estimatedDeliveryDays: {
      type: String,
      required: false
    },
    shipment: {
      shiprocketOrderId: { type: Number },
      shipmentId: { type: Number },
      awbData: { type: Object },
      awb: { type: String },
      courierCompanyId: { type: Number },
      courierName: { type: String },
      shippingCost: { type: Number },
      estimatedDeliveryDays: { type: Number },
      etd: { type: String },
      pickupLocation: { type: String },
      status: { type: String },
      lastTrackedAt: { type: Date },
      liveTrackingData: { type: Object },
      liveTracking: {
        courier: { type: String },
        currentStatus: { type: String },
        history: { type: Array }, 
        lastUpdated: { type: Date }
      },
    readyToShip: { type: Boolean, default: false },
    pickupRequested: { type: Boolean, default: false },
    pickupRequestedAt: Date,

    }
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("save", async function (next) {
  try {
    if (this.visualId) return next();

    const year = new Date().getFullYear().toString().slice(-2);

    const counter = await Counter.findOneAndUpdate(
      { name: `order_${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.visualId = `ORD${year}-${counter.seq.toString().padStart(4, "0")}`;

    next();
  } catch (err) {
    next(err);
  }
});



const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
