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
const router = express.Router();

router.route("/category/create").post(createCategory);
router.route("/category/get").get(getAllCategory);
router.route("/category/get-for-admin").get(getAllCategoryForAdmin)
router.get("/category/get-by-id", getCategoryById)
router.route("/category/update").post(updateCategory)
router.route("/subcategory/create").post(createSubCategory);
router.route("/subcategory/update").post(updateSubCategory);
router.route("/subcategory/get").get(getAllSubCategory);
router.route("/subcategory/get-by-category").get(getSubCategoryByCategory);
router.route("/banner/create").post(createBanner);
router.route("/banner/get").get(getBanner);
router.route("/coupon/create").post(createCoupon);
router.route("/coupon/update").post(updateCoupon);
router.route("/coupon/get").get(getCoupon);
router.route("/coupon/getById").get(getCouponById);
router.route("/coupon/post").post(couponUsed);
router.route("/apply-coupon").get(applyCoupon)
router.route("/coupon/get-users").get(getUsersWhoUsedCoupon)
router.route("/category/get/by-page").get(getAllCategoryPaginationApplied)
router.route("/subcategory/get/by-page").get(getAllSubCategoryPaginationApplied)
router.route("/category/search-category").get(searchCategory);
router.route("/subcategory/search-subcategory").get(searchSubCategory);
router.route("/coupon/get-paginate").get(getCouponPaginationApplied)
router.route("/banner/get-paginate").get(getBannerPaginationApplied)
router.route("/coupons/search-coupons").get(searchCoupons)

// delete
router.route("/category/delete").delete(deleteCategory);
router.route("/subcategory/delete").delete(deleteSubCategory);
router.route("/banner/delete").delete(deleteBanner);
router.route("/banner/update").post(updateBanner);
router.route("/mobilebanner/update").post(updateMobileBanner);

router.route("/coupon/delete").delete(deleteCoupon);


router.route('/bottombanner/create').post(createBottomBanner)
router.route('/bottombanner/update').post(updateBottomBanner)
router.route('/bottombanner/delete').delete(deleteBottomBanner)
router.route('/bottombanner/list').get(listBottomBanners)

router.route('/mobilebanner/create').post(createMobileBanner)
router.route('/mobilebanner/delete').delete(deleteMobileBanner)
router.route('/mobilebanner/list').get(getMobileBannerPaginationApplied)

module.exports = router;
