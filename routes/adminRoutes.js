const express = require('express')
const { adminRegistration, adminLogin, getAllAdmins, getAdminById, createOrderShipment } = require('../controllers/adminController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/register', adminRegistration)
router.post('/login', adminLogin)

router.get('/get-all-admins', getAllAdmins)
router.get('/get-admin-by-id', getAdminById)

router.post("/create-shipment", isAdmin, createOrderShipment);

module.exports = router