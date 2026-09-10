const express = require("express");

const {
  createProduct,
  updateProduct,
  getAllProduct,
  deleteProduct,
  getProductById,
  getProductInventory,
  toggleBestSellerProducts,
  toggleNewArrivalProducts,
  getBestSeller,
  getNewArrival,
  addItemInRecentlyViewed,
  getRecentlyViewedItems,
  deleteProductImage,
  searchBestSellerProducts,
  searchNewArrivalProducts,
  getAllProductsByStockSorting,
  searchProducts,
  getProductsByShopByConcern,
  getProductsByGroupId,
  createProductReview,
  getProductByVisualId,
  getAllProductForAdmin,
  getProducts,
  getProductsByCategory,
  getRelatedProductsByConcerns,
  getProductReviews,
  hasPurchasedProduct,
  getInactiveProducts,
  getFeaturedProducts,
  activeProduct,
  getProductReviewsByGroupId,
  getRelatedProductsByCategory,
} = require("../controllers/productController");
const { isAdmin, isUser } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin-only (catalog management)
router.route("/create").post(isAdmin, createProduct);
router.route("/update").post(isAdmin, updateProduct);
router.route("/get-inactive").get(isAdmin, getInactiveProducts);
router.route("/get-for-admin").get(isAdmin, getAllProductForAdmin);
router.route("/get-by-count-in-stock").get(isAdmin, getAllProductsByStockSorting);
router.route("/inventory").get(isAdmin, getProductInventory);
router.route("/toggle-best-seller-products").post(isAdmin, toggleBestSellerProducts);
router.route("/toggle-new-arrival-products").post(isAdmin, toggleNewArrivalProducts);
router.route("/delete-product-image").delete(isAdmin, deleteProductImage);
router.route("/delete").delete(isAdmin, deleteProduct);
router.route("/active").get(isAdmin, activeProduct);
router.route("/create-product-review").post(isAdmin, createProductReview);

// Public catalog reads (storefront)
router.route("/get-all-products").get(getAllProduct);
router.get("/get-products", getProducts);
router.route("/get-products-by-category").get(getProductsByCategory);
router.route("/get-by-id").get(getProductById);
router.route("/get-product-by-id").get(getProductById);
router.route("/search-product").get(searchProducts);
router.route("/get-new-arrival").get(getNewArrival);
router.route("/get-featured-products").get(getFeaturedProducts);
router.route("/get-best-seller").get(getBestSeller);
router.route("/search-best-seller-products").get(searchBestSellerProducts);
router.route("/search-new-arrival-products").get(searchNewArrivalProducts);
router.route("/get-by-concerns").get(getProductsByShopByConcern);
router.route("/get-by-group-id").get(getProductsByGroupId);
router.get("/get-product-reviews", getProductReviews);
router.get("/get-product-reviews-by-group-id", getProductReviewsByGroupId);
router.route("/get-product-by-visual-id").get(getProductByVisualId);
router.post("/get-related", getRelatedProductsByConcerns);
router.post("/get-related-by-category", getRelatedProductsByCategory);

// Per-user (requires identifying "this customer")
router.route("/add-item-in-recently-viewed").post(isUser, addItemInRecentlyViewed);
router.route("/get-recently-viewed-item").get(isUser, getRecentlyViewedItems);
router.post("/check-product-purchase", isUser, hasPurchasedProduct);

module.exports = router;
