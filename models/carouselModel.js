const mongoose = require("mongoose");

const carouselSchema = mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.String,
    ref: "Category",
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  concern: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopByConcern"
  }
}, { timestamps: true });

const Banner = mongoose.model("Banner", carouselSchema);

module.exports = Banner;
