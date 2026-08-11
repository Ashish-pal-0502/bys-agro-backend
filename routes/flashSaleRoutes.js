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
const router = express.Router()

router.post('/create', createFlashSale)
router.get('/get', getFlashSales)
router.get('/get-active', getActiveFlashSale)
router.delete('/delete', deleteFlashSale)
router.post('/update', updateFlashSale)
router.get('/get-flash-products', getFlashSaleProducts)
router.patch("/status", updateFlashSaleStatus);

module.exports = router