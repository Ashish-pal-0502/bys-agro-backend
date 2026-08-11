const mongoose = require('mongoose');

const RecentlyViewedProductSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.String, ref: 'Product', required: true },
    viewAt: { type: Date, default: Date.now }
}, { timestamps: true });

const RecentlyViewedProduct = mongoose.model('RecentlyViewedProduct', RecentlyViewedProductSchema)

module.exports = RecentlyViewedProduct
