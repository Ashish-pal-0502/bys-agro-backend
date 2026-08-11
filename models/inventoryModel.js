const mongoose = require('mongoose')

const inventorySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required: true
    },
    quantity: {
        type:Number,
        required: true,
        default: 0
    }
})

module.exports = mongoose.model('Inventory', inventorySchema)