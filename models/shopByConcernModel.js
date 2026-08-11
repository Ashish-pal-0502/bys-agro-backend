const mongoose = require('mongoose')

const shopByConcernSchema = new mongoose.Schema({
    title: String,
    details: String,
    image: String
}, { timestamps: true })

module.exports = mongoose.model('ShopByConcern', shopByConcernSchema)