const express = require('express')
const { addFAQ, getFAQ, updateFAQ, deleteFAQ } = require('../controllers/faqController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/add-faq', isAdmin, addFAQ)
router.get('/get-faq', getFAQ)
router.post('/update-faq', isAdmin, updateFAQ)
router.delete('/delete-faq', isAdmin, deleteFAQ)

module.exports = router
