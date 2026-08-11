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
const router = express.Router()


router.post('/add', addToCart)
router.get('/get', getUserCart)
router.delete('/remove', removeFromCart)
router.delete('/clear', clearCart)
// cart with linked offers
router.post("/add-linked-item", addLinkedItemToCart);
router.post("/apply-linked-discounts", applyLinkedDiscountsToCart);


module.exports = router