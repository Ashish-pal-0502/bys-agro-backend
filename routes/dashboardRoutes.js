const express = require('express')
const { getDashboardData } = require('../controllers/dashboardController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()

router.get('/get-dashboard-data', isAdmin, getDashboardData)

module.exports = router
