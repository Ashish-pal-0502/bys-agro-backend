const asyncHandler = require("express-async-handler")
const GlobalReview = require("../models/globalReviewModel")

const addGlobalReview = asyncHandler(async (req, res) => {
  const { userId, productId, rating, comment} = req.body

  const globalReview = await GlobalReview.create({
    user: userId,
    product: productId,
    rating,
    comment
  })

  res.status(201).json(globalReview)
})

const getGlobalReviews = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  const [reviews, totalDocuments] = await Promise.all([
    GlobalReview.find({ }).populate('user product')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(Number(pageSize)),

    GlobalReview.countDocuments({ }),
    
  ])

  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.status(200).json({
    reviews,
    pageCount,
    pageNumber,
    totalDocuments,
  })
})


module.exports = { 
    addGlobalReview,
    getGlobalReviews
 }
