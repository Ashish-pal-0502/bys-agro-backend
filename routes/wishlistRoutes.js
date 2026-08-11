const express = require('express')
const { 
     addToWishlist,
     getWishlistByUser,
     removeFromWishlist,
     clearWishlist
 } = require('../controllers/wishlistController')
const router = express.Router()

router.post('/add', addToWishlist)
router.get('/get', getWishlistByUser)
router.delete('/remove', removeFromWishlist)
router.delete('/clear', clearWishlist)

module.exports = router