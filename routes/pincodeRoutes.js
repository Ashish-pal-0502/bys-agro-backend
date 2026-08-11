// routes/pincodeRoutes.js
const express = require('express')
const {
  addPincode,
  getPincodes,
  deletePincode,
} = require('../controllers/pincodeController')

const router = express.Router()

router.post('/add', addPincode)
router.get('/get', getPincodes)
router.delete('/delete/:id', deletePincode)

module.exports = router
