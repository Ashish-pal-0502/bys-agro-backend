const express = require('express')
const {
        addToCart,
        getUserCart,
        removeFromCart,
        clearCart,
        clearCartInternally,
        addLinkedItemToCart,
        applyLinkedDiscountsToCart,
} = require('../controllers/cartController')
const { isUser } = require('../middleware/authMiddleware')
const router = express.Router()


router.post('/add', isUser, addToCart)
router.get('/get', isUser, getUserCart)
router.delete('/remove', isUser, removeFromCart)
router.delete('/clear', isUser, clearCart)
// cart with linked offers
router.post("/add-linked-item", isUser, addLinkedItemToCart);
router.post("/apply-linked-discounts", isUser, applyLinkedDiscountsToCart);


module.exports = router
