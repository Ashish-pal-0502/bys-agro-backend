const mongoose = require("mongoose");

const flashSaleUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    flashSale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlashSale",
      required: true
    },
    usedCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model("FlashSaleUsage", flashSaleUsageSchema);
