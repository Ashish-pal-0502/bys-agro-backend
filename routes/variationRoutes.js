const express = require("express");
const {
  createCategory,
  getAllCategory,
  createSubCategory,
  getAllSubCategory,
  createBanner,
  getBanner,
  deleteCategory,
  deleteSubCategory,
  deleteBanner,
  getSubCategoryByCategory,
  updateCategory,
  updateSubCategory,
  getAllCategoryPaginationApplied,
  getAllSubCategoryPaginationApplied,
  searchCategory,
  searchSubCategory,
  getBannerPaginationApplied,
  searchCoupons,
  createBottomBanner,
  deleteBottomBanner,
  listBottomBanners,
  createMobileBanner,
  getMobileBanner,
  getMobileBannerPaginationApplied,
  deleteMobileBanner,
  getCategoryById,
  getAllCategoryForAdmin,
  updateBanner,
  updateBottomBanner,
  updateMobileBanner
} = require("../controllers/variationController.js");
const {
  createCoupon,
  getCoupon,
  getCouponById,
  deleteCoupon,
  couponUsed,
  getCouponPaginationApplied,
  updateCoupon,
  applyCoupon,
  getUsersWhoUsedCoupon,
} = require("../controllers/couponController.js");
const { isAdmin, isUser } = require("../middleware/authMiddleware.js");
const router = express.Router();

// Public catalog reads (storefront)
router.route("/category/get").get(getAllCategory);
router.get("/category/get-by-id", getCategoryById)
router.route("/subcategory/get").get(getAllSubCategory);
router.route("/subcategory/get-by-category").get(getSubCategoryByCategory);
router.route("/banner/get").get(getBanner);
router.route('/bottombanner/list').get(listBottomBanners)
router.route('/mobilebanner/list').get(getMobileBannerPaginationApplied)

// Coupon application (own usage only, enforced in the controller)
router.route("/apply-coupon").get(isUser, applyCoupon)

// Admin-only (catalog + banner + coupon management)
router.route("/category/create").post(isAdmin, createCategory);
router.route("/category/get-for-admin").get(isAdmin, getAllCategoryForAdmin)
router.route("/category/update").post(isAdmin, updateCategory)
router.route("/subcategory/create").post(isAdmin, createSubCategory);
router.route("/subcategory/update").post(isAdmin, updateSubCategory);
router.route("/banner/create").post(isAdmin, createBanner);
router.route("/coupon/create").post(isAdmin, createCoupon);
router.route("/coupon/update").post(isAdmin, updateCoupon);
router.route("/coupon/get").get(isAdmin, getCoupon);
router.route("/coupon/getById").get(isAdmin, getCouponById);
router.route("/coupon/post").post(isAdmin, couponUsed);
router.route("/coupon/get-users").get(isAdmin, getUsersWhoUsedCoupon)
router.route("/category/get/by-page").get(isAdmin, getAllCategoryPaginationApplied)
router.route("/subcategory/get/by-page").get(isAdmin, getAllSubCategoryPaginationApplied)
router.route("/category/search-category").get(isAdmin, searchCategory);
router.route("/subcategory/search-subcategory").get(isAdmin, searchSubCategory);
router.route("/coupon/get-paginate").get(isAdmin, getCouponPaginationApplied)
router.route("/banner/get-paginate").get(isAdmin, getBannerPaginationApplied)
router.route("/coupons/search-coupons").get(isAdmin, searchCoupons)

router.route("/category/delete").delete(isAdmin, deleteCategory);
router.route("/subcategory/delete").delete(isAdmin, deleteSubCategory);
router.route("/banner/delete").delete(isAdmin, deleteBanner);
router.route("/banner/update").post(isAdmin, updateBanner);
router.route("/mobilebanner/update").post(isAdmin, updateMobileBanner);

router.route("/coupon/delete").delete(isAdmin, deleteCoupon);


router.route('/bottombanner/create').post(isAdmin, createBottomBanner)
router.route('/bottombanner/update').post(isAdmin, updateBottomBanner)
router.route('/bottombanner/delete').delete(isAdmin, deleteBottomBanner)

router.route('/mobilebanner/create').post(isAdmin, createMobileBanner)
router.route('/mobilebanner/delete').delete(isAdmin, deleteMobileBanner)

module.exports = router;
