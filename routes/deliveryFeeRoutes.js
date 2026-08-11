const express = require("express");
const router = express.Router();
const {
  createDeliveryFee,
  getAllDeliveryFees,
  getDeliveryFeeByPaymentMethod,
  updateDeliveryFee,
  deleteDeliveryFee,
} = require("../controllers/deliveryFeeController.js");

router.post("/create", createDeliveryFee);
router.get("/all", getAllDeliveryFees);
router.get("/get", getDeliveryFeeByPaymentMethod);
router.post("/update", updateDeliveryFee);
router.delete("/delete", deleteDeliveryFee);

module.exports = router;