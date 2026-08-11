const mongoose = require("mongoose");

const Schema = mongoose.Schema

const deliveryFeeSchema = new Schema({
    paymentMethod: {
        type: String,
        required: true,
        enum: ["PREPAID", "COD"],
        unique: true,
    },
    feeStrategy: {
        type: String,
        required: true,
        enum: ["FREE", "FIXED", "CONDITIONAL"],
    },
    feeAmount: {
        type: Number,
        default: 0,
        min: 0,
        required: function () {
            return this.feeStrategy === "FIXED" || this.feeStrategy === "CONDITIONAL";
        }
    },
    freeThreshold: {
        type: Number,
        default: null,
        required: function () {
            return this.feeStrategy === 'CONDITIONAL';
        }
    },
    bannerMessage: {
        type: String,
        trim: true,
    },
    codHandlingCharge: {
        type: Number,
        default: 0,
        min: 0,
    },
    extraDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    }
}, { timestamps: true })

const DeliveryFee = mongoose.model('DeliveryFee', deliveryFeeSchema);

module.exports = DeliveryFee