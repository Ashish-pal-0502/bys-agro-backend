const express = require('express')
const { adminRegistration, adminLogin, getAllAdmins, getAdminById, createOrderShipment } = require('../controllers/adminController')
const { isAdmin } = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/config')
const router = express.Router()

// Only an already-authenticated admin can create another admin account
router.post('/register', isAdmin, adminRegistration)
router.post('/login', authLimiter, adminLogin)

router.get('/get-all-admins', isAdmin, getAllAdmins)
router.get('/get-admin-by-id', isAdmin, getAdminById)

router.post("/create-shipment", isAdmin, createOrderShipment);

module.exports = router