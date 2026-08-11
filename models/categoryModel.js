const mongoose = require("mongoose");

const categorySchema = mongoose.Schema({
  _id: String,
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  banner: {
    type: String,
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
