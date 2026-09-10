const express = require('express')
const {
    createFlashSale,
    getFlashSales,
    getActiveFlashSale,
    deleteFlashSale,
    updateFlashSale,
    getFlashSaleProducts,
    updateFlashSaleStatus
 } = require('../controllers/flashSaleController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/create', isAdmin, createFlashSale)
router.get('/get', isAdmin, getFlashSales)
router.get('/get-active', getActiveFlashSale)
router.delete('/delete', isAdmin, deleteFlashSale)
router.post('/update', isAdmin, updateFlashSale)
router.get('/get-flash-products', getFlashSaleProducts)
router.patch("/status", isAdmin, updateFlashSaleStatus);

module.exports = router
