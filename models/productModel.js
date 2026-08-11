const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    image: [{ type: String, required: false }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const productSchema = new mongoose.Schema(
  {
    visualId: { type: String },
    groupId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
      type: mongoose.Schema.Types.String,
      ref: "Category",
      required: true,
    },
    shopByConcerns: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ShopByConcern" },
    ],
    journeyImage: { type: String, required: false },
    price: { type: Number, required: true },
    weight: String,
    discount: Number,
    images: [{ type: String }],
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    packageWeight: { type: String },
    nutritionalInfo: { type: String },
    productDetails: { type: String },
    benefits: { type: String },
    ingredients: { type: String },
    features: [{ type: String }],
    reviews: [reviewSchema],
    productCountInPackage: { type: Number },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    sellingBadge: { type: String },
    comboFlavours: [String],
    colorVariants: [String],
    isCombo: { type: Boolean, default: false },
    countInStock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },
    faqs: [
      {
        question: {
          type: String,
          required: true,
          trim: true,
        },
        answer: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    productHighlights: [
      {
        image: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    teaBase: { type: String },
    tasteProfile: { type: String },
    caffeineLevel: { type: String },
    cupsPerPack: { type: Number },
    brewingInstructions: { type: String },
    servingSuggestion: { type: String },
    bestTimeToDrink: { type: String },
  },
  { timestamps: true },
);

productSchema.pre("save", function (next) {
  if (this.visualId) return next();
  const processedName = this.name.trim().toUpperCase().replace(/\s+/g, "-");
  const timestamp = Date.now();
  this.visualId = `${processedName}-${timestamp}`;
  next();
});

productSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.visualId) return next();
  const doc = await this.model.findOne(this.getQuery());
  if (!doc) return next();
  if (doc.visualId) return next();
  const productName = update.name || doc.name;
  const processedName = productName.trim().toUpperCase().replace(/\s+/g, "-");
  const timestamp = Date.now();
  update.visualId = `${processedName}-${timestamp}`;
  next();
});

module.exports = mongoose.model("Product", productSchema);
