const mongoose = require('mongoose')

const pincodeSchema = new mongoose.Schema({
    zip: { type: String, required: true }
})

module.exports = mongoose.model('PinCode', pincodeSchema)