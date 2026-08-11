const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema({
  _id: String,
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.String,
    required: true,
    ref: "Category",
  },
  image: {
    type: String,
  },
  active: {
    type: Boolean,
  },
});

const SubCategory = mongoose.model("SubCategory", subCategorySchema);

module.exports = SubCategory;
