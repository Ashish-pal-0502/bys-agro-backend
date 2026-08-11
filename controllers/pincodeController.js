// controllers/pincodeController.js
const asyncHandler = require('express-async-handler')
const PinCode = require('../models/pincodeModel')

const addPincode = asyncHandler(async (req, res) => {
  const { zip } = req.body

  if (!zip) {
    return res.status(400).json({ message: 'Pincode is required' })
  }

  const existing = await PinCode.findOne({ zip })
  if (existing) {
    return res.status(400).json({ message: 'Pincode already exists' })
  }

  await PinCode.create({ zip })

  res.status(201).json({ message: 'Pincode added successfully' })
})


const getPincodes = asyncHandler(async (req, res) => {
  const pincodes = await PinCode.find().sort({ createdAt: -1 })

  if (!pincodes || pincodes.length === 0) {
    return res.status(404).json({ message: 'No pincodes found' })
  }

  res.status(200).json({ pincodes })
})


const deletePincode = asyncHandler(async (req, res) => {
  const pincode = await PinCode.findById(req.params.id)

  if (!pincode) {
    return res.status(404).json({ message: 'Pincode not found' })
  }

  await pincode.deleteOne()

  res.status(200).json({ message: 'Pincode deleted successfully' })
})

module.exports = {
  addPincode,
  getPincodes,
  deletePincode,
}
