const express = require('express')
const { 
    addGlobalReview,
    getGlobalReviews
 } = require('../controllers/globalReviewController')
const router = express.Router()

router.post(
  "/reviews",
  addGlobalReview
)

router.get("/reviews", getGlobalReviews)

module.exports = router