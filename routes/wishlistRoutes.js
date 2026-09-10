const express = require('express')
const {
     addToWishlist,
     getWishlistByUser,
     removeFromWishlist,
     clearWishlist
 } = require('../controllers/wishlistController')
const { isUser } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/add', isUser, addToWishlist)
router.get('/get', isUser, getWishlistByUser)
router.delete('/remove', isUser, removeFromWishlist)
router.delete('/clear', isUser, clearWishlist)

module.exports = router
