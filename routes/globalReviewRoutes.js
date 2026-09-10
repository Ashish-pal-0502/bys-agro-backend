const express = require('express')
const {
    addGlobalReview,
    getGlobalReviews
 } = require('../controllers/globalReviewController')
const { isUser } = require('../middleware/authMiddleware')
const router = express.Router()

router.post(
  "/reviews",
  isUser,
  addGlobalReview
)

router.get("/reviews", getGlobalReviews)

module.exports = router
