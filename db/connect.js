const mongoose = require("mongoose");
require('dotenv').config()
const Product = require('../models/productModel')
const ShopByConcern = require('../models/shopByConcernModel');
const FlashSale = require("../models/flashModel");
const User = require('../models/userModel')
const Order = require('../models/orderModel')

const dbConnect = async () => {
    try {
        const dbOptions = {
            dbName : 'bys_agrodb'
        }
        const connectionInstance =  await mongoose.connect(process.env.MONGO_URI, dbOptions)
        console.log(`MongoDB Connected ${connectionInstance.connection.host} <-> ${connectionInstance.connection.name}`)
        
    } catch(e) {
        console.log('MongoDB Connection Error', e.message)
        process.exit(1)
    }
}

module.exports = {
    dbConnect
}

