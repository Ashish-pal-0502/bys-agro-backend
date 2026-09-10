const express = require("express");
const {
  getOrders,
  updateOrderDeliveryStatus,
  addOrderItems,
  getMyOrders,
  getMonthlySales,
  getSalesDateRange,
  getPendingOrders,
  getOrderFilter,
  updateOrderToPaid,
  getFailedOnlineOrders,
  updateOrderToUnPaid,
  updateOrderToPaidAdmin,
  getOrderById,
  payment,
  searchOrders,
  deleteOrder,
  getPendingOrdersPaginated,
  searchPendingOrders,
  searchFailedOrders,
  getWayBillNumberByOrder,
  getPendingOrdersForDownload,
  getOrdersForDownload,
   getFailedOnlineOrdersForDownload,
   createOrder,
   verifyOrder,
   createBatchOrders,
   verifyMultipleOrders,
   schedulePickup,
   verifyOrdersByAdmin
} = require("../controllers/orderController.js");
const { isUser, isAdmin } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Customer-facing (own orders only, enforced in the controller)
router.route("/myorders1").get(isUser, getMyOrders);
router.route("/myorders-details").get(isUser, getOrderById);
router.post('/create-order', isUser, createBatchOrders)
router.route("/verify-order").post(isUser, verifyMultipleOrders);
router.route("/payment").get(isUser, payment);

// Admin-only
router.route("/").get(isAdmin, getOrders);
router.route("/getmonthysales").get(isAdmin, getMonthlySales);
router.route("/getPendingOrders").get(isAdmin, getPendingOrders);
router.route("/getPendingOrdersPaginated").get(isAdmin, getPendingOrdersPaginated);
router.route("/getPendingOrdersForDownload").get(isAdmin, getPendingOrdersForDownload);
router.route("/search-pending-order").get(isAdmin, searchPendingOrders)
router.route("/getsalesdaterange").get(isAdmin, getSalesDateRange);
router.route("/orderfilter").get(isAdmin, getOrderFilter);
router.route("/online-failed").get(isAdmin, getFailedOnlineOrders);
router.route("/online-failed-for-download").get(isAdmin, getFailedOnlineOrdersForDownload);
router.route("/update").post(isAdmin, updateOrderDeliveryStatus);
router.route("/verify-order-admin").post(isAdmin, verifyOrdersByAdmin);
router.route("/update-order-to-paid").post(isAdmin, updateOrderToPaid);
router.route("/update-order-to-paid-admin").post(isAdmin, updateOrderToPaidAdmin);
router.route("/update-order-to-unpaid").post(isAdmin, updateOrderToUnPaid);
router.route("/get-orders").get(isAdmin, getOrders)
router.route("/get-orders-for-download").get(isAdmin, getOrdersForDownload)
router.route("/search-orders").get(isAdmin, searchOrders)
router.route("/search-failed-orders").get(isAdmin, searchFailedOrders)
router.route("/delete-orders").delete(isAdmin, deleteOrder)
router.route("/get-waybill-no").get(isAdmin, getWayBillNumberByOrder)
router.get('/schedule-pickup', isAdmin, schedulePickup)

module.exports = router;
