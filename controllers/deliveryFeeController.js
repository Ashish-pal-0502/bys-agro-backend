const DeliveryFee = require("../models/deliveryFeeModel.js");
const asyncHandler = require('express-async-handler');

const createDeliveryFee = asyncHandler(async (req, res) => {
    const { paymentMethod, feeStrategy, feeAmount, freeThreshold, bannerMessage, codHandlingCharge, extraDiscount } = req.body;

    if (!["PREPAID", "COD"].includes(paymentMethod.toUpperCase())) {
        return res.status(400).json({ message: "Invalid payment method" });
    }

    if (!["FREE", "FIXED", "CONDITIONAL"].includes(feeStrategy)) {
        return res.status(400).json({ message: "Invalid fee strategy" });
    }

    if (extraDiscount != null && (extraDiscount < 0 || extraDiscount > 100)) {
        return res.status(400).json({ message: "Extra discount must be between 0 and 100" });
    }

    const existing = await DeliveryFee.findOne({ paymentMethod });
    if (existing) {
        return res.status(400).json({ message: `Delivery fee rule for ${paymentMethod} already exists. Use update instead.` });
    }

    const deliveryFee = DeliveryFee.create({ 
        paymentMethod, 
        feeStrategy, 
        feeAmount, 
        freeThreshold, 
        bannerMessage,
        codHandlingCharge, 
        extraDiscount 
    });

    res.status(201).json({ message: "Delivery fee rule created", data: deliveryFee });
});

const getAllDeliveryFees = asyncHandler(async (req, res) => {
    const fees = await DeliveryFee.find();
    res.status(200).json({ data: fees });
});

const getDeliveryFeeByPaymentMethod = asyncHandler(async (req, res) => {
    const { paymentMethod } = req.query;

    const fee = await DeliveryFee.findOne(
        { paymentMethod: paymentMethod.toUpperCase() },
    );

    res.status(200).json({ message: "Delivery fee rule fetched successfully", data: fee });
});

const updateDeliveryFee = asyncHandler(async (req, res) => {
    const { paymentMethod, feeStrategy, feeAmount, freeThreshold, bannerMessage, codHandlingCharge, extraDiscount } = req.body;

    const fee = await DeliveryFee.findOne({ paymentMethod: paymentMethod.toUpperCase() });
    if (!fee) {
        return res.status(404).json({ message: `No rule found for ${paymentMethod}` });
    }

    if (feeStrategy) fee.feeStrategy = feeStrategy;
    if (feeAmount !== undefined) fee.feeAmount = feeAmount;
    if (freeThreshold !== undefined) fee.freeThreshold = freeThreshold;
    if (bannerMessage) fee.bannerMessage = bannerMessage;
    if (codHandlingCharge !== undefined) fee.codHandlingCharge = codHandlingCharge;
    if (extraDiscount !== undefined && extraDiscount >= 0 && extraDiscount <= 100) fee.extraDiscount = extraDiscount;
    await fee.save();

    res.status(200).json({ message: "Delivery fee rule updated", data: fee });
});

const deleteDeliveryFee = asyncHandler(async (req, res) => {
    const { paymentMethod } = req.query;

    const fee = await DeliveryFee.findOneAndDelete({ paymentMethod: paymentMethod.toUpperCase() });
    if (!fee) {
        return res.status(404).json({ message: `No rule found for ${paymentMethod}` });
    }

    res.status(200).json({ message: "Delivery fee rule deleted", data: fee });
});

module.exports = {
    createDeliveryFee,
    getAllDeliveryFees,
    getDeliveryFeeByPaymentMethod,
    updateDeliveryFee,
    deleteDeliveryFee,
};