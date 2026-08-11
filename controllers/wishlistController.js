const asyncHandler = require('express-async-handler');
const Wishlist = require('../models/wishlistModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');

const addToWishlist = asyncHandler(async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ message: 'User ID and Product ID are required' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const existing = await Wishlist.findOne({ user: userId, product: productId });
  if (existing) return res.status(400).json({ message: 'Product already in wishlist' });

  const wishlistItem = await Wishlist.create({ user: userId, product: productId });

  res.status(201).json({ message: 'Product added to wishlist', wishlistItem });
});

const getWishlistByUser = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ message: 'User ID is required' });

  const wishlist = await Wishlist.find({ user: userId }).populate('product');

  res.status(200).json({ message: 'Wishlist retrieved successfully', wishlist });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { userId, productId } = req.query;

  if (!userId || !productId) return res.status(400).json({ message: 'User ID and Product ID are required' });

  const deleted = await Wishlist.findOneAndDelete({ user: userId, product: productId });

  if (!deleted) return res.status(404).json({ message: 'Product not found in wishlist' });

  res.status(200).json({ message: 'Product removed from wishlist' });
});

const clearWishlist = asyncHandler(async (req, res) => {
  const { userId } = req.query

  await Wishlist.deleteMany({ user: userId })

  res.send({ message: "Wishlist Cleared" })
})



module.exports = {
  addToWishlist,
  getWishlistByUser,
  removeFromWishlist,
  clearWishlist
};
