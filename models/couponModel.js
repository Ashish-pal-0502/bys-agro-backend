const mongoose = require("mongoose");

const coupenSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Percentage", "Flat"],
    required: true,
  },
  discount: {
    type: Number,
    required: function () {
      return this.type === "Percentage";
    },
    min: 0,
    max: 100,
  },
  maxDiscount: {
    type: Number,
    min: 0,
  },
  flatDiscount: {
    type: Number,
    required: function () {
      return this.type === "Flat";
    },
    min: 0,
  },
  count: {
    type: Number,
    default: 0,
  },
  usedBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  limit: {
    type: Number,
    required: true,
  },
});

const Coupon = mongoose.model("Coupon", coupenSchema);

module.exports = Coupon;
