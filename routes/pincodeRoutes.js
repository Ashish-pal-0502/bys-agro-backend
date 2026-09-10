// routes/pincodeRoutes.js
const express = require('express')
const {
  addPincode,
  getPincodes,
  deletePincode,
} = require('../controllers/pincodeController')
const { isAdmin } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/add', isAdmin, addPincode)
router.get('/get', getPincodes)
router.delete('/delete/:id', isAdmin, deletePincode)

module.exports = router
