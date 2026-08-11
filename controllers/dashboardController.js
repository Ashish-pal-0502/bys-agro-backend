const asyncHandler = require('express-async-handler')
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Order = require('../models/orderModel')
const Blog = require('../models/blogModel')
const Category = require('../models/categoryModel')
const ShopByConcern = require('../models/shopByConcernModel')
const Coupon = require('../models/couponModel')

const getDashboardData = asyncHandler(async (req, res) => {
   const usersCount = await User.countDocuments({})
   const productsCount = await Product.countDocuments({})
   const ordersCount = await Order.countDocuments({})
   const blogsCount = await Blog.countDocuments({})
   const categoryCount = await Category.countDocuments({})
   const couponCount = await Coupon.countDocuments({})

   res.send({
    usersCount,
    productsCount,
    ordersCount,
    blogsCount,
    categoryCount,
    couponCount
   })
})

module.exports = {
    getDashboardData
}