const express = require('express')
const {
    addToShopByConcern,
    getByConcerns,
    updateShopByConcern,
    getConcernById,
    getByConcernsForAdmin
 } = require('../controllers/shopByConcernController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/add', isAdmin, addToShopByConcern)
router.get('/get', getByConcerns)
router.get('/get-for-admin', isAdmin, getByConcernsForAdmin)
router.get('/get-by-id', getConcernById)
router.post('/update', isAdmin, updateShopByConcern)

module.exports = router
