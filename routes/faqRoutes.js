const express = require('express')
const { addFAQ, getFAQ, updateFAQ, deleteFAQ } = require('../controllers/faqController')
const router = express.Router()

router.post('/add-faq', addFAQ)
router.get('/get-faq', getFAQ)
router.post('/update-faq', updateFAQ)
router.delete('/delete-faq', deleteFAQ)

module.exports = router