const mongoose = require("mongoose");

const linkedOfferSchema = new mongoose.Schema({
    parentProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },
    linkedProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    discountType: {
        type: String,
        enum: ["percentage", "flat"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    priority: {
        type: Number,
        default: 1,
    },
    startDate: Date,
    endDate: Date,
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

linkedOfferSchema.index(
    { parentProduct: 1, linkedProduct: 1 },
    { unique: true }
);

module.exports = mongoose.model("LinkedOffer", linkedOfferSchema);
