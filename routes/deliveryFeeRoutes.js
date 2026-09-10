const express = require("express");
const router = express.Router();
const {
  createDeliveryFee,
  getAllDeliveryFees,
  getDeliveryFeeByPaymentMethod,
  updateDeliveryFee,
  deleteDeliveryFee,
} = require("../controllers/deliveryFeeController.js");
const { isAdmin } = require("../middleware/authMiddleware.js");

router.post("/create", isAdmin, createDeliveryFee);
router.get("/all", isAdmin, getAllDeliveryFees);
router.get("/get", getDeliveryFeeByPaymentMethod);
router.post("/update", isAdmin, updateDeliveryFee);
router.delete("/delete", isAdmin, deleteDeliveryFee);

module.exports = router;
