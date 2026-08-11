const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    discountType: {
      type: String,
      enum: ["PERCENT", "FLAT"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true
    },

    startTime: {
      type: Date,
      required: true
    },
    
    endTime: {
      type: Date,
      required: true
    },

    perUserLimit: {
      type: Number,
      default: 1
    },

    isActive: {
      type: Boolean,
      default: true
    },

    scope: {
      type: String,
      enum: ["ALL", "PRODUCTS"],
      default: "ALL"
    },

    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }]
  },
  { timestamps: true }
);

flashSaleSchema.index({
  isActive: 1,
  startTime: 1,
  endTime: 1
});

const FlashSale = mongoose.model("FlashSale", flashSaleSchema);

module.exports = FlashSale;
