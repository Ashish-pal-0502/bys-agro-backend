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

const router = express.Router();

router.route("/create").post(createProduct);
router.route("/update").post(updateProduct);
router.route("/get-all-products").get(getAllProduct);
router.route("/get-inactive").get(getInactiveProducts);
router.get("/get-products", getProducts);
router.route("/get-products-by-category").get(getProductsByCategory);
router.route("/get-for-admin").get(getAllProductForAdmin);

router.route("/get-by-count-in-stock").get(getAllProductsByStockSorting);
router.route("/get-by-id").get(getProductById);
router.route("/get-product-by-id").get(getProductById);
router.route("/inventory").get(getProductInventory);
// router.route("/create-review").post(createProductReview);
router.route("/search-product").get(searchProducts);
router.route("/get-new-arrival").get(getNewArrival);
router.route("/get-featured-products").get(getFeaturedProducts);
router.route("/add-item-in-recently-viewed").post(addItemInRecentlyViewed);
router.route("/get-recently-viewed-item").get(getRecentlyViewedItems);
router.route("/toggle-best-seller-products").post(toggleBestSellerProducts);
router.route("/toggle-new-arrival-products").post(toggleNewArrivalProducts);
router.route("/get-best-seller").get(getBestSeller);
router.route("/search-best-seller-products").get(searchBestSellerProducts);
router.route("/search-new-arrival-products").get(searchNewArrivalProducts);
router.route("/delete-product-image").delete(deleteProductImage);
router.route("/delete").delete(deleteProduct);
router.route("/active").get(activeProduct);
router.route("/get-by-concerns").get(getProductsByShopByConcern);
router.route("/get-by-group-id").get(getProductsByGroupId);
router.route("/create-product-review").post(createProductReview);

router.get("/get-product-reviews", getProductReviews);
router.get("/get-product-reviews-by-group-id", getProductReviewsByGroupId);
router.route("/get-product-by-visual-id").get(getProductByVisualId);
router.post("/get-related", getRelatedProductsByConcerns);
router.post("/check-product-purchase", hasPurchasedProduct);
router.post("/get-related-by-category", getRelatedProductsByCategory);

module.exports = router;
