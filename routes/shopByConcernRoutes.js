const express = require('express')
const { 
    addToShopByConcern,
    getByConcerns,
    updateShopByConcern,
    getConcernById,
    getByConcernsForAdmin
 } = require('../controllers/shopByConcernController')
const router = express.Router()

router.post('/add', addToShopByConcern)
router.get('/get', getByConcerns)
router.get('/get-for-admin', getByConcernsForAdmin)
router.get('/get-by-id', getConcernById)
router.post('/update', updateShopByConcern)

module.exports = router