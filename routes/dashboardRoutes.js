const express = require('express')
const { getDashboardData } = require('../controllers/dashboardController')
const router = express.Router()

router.get('/get-dashboard-data', getDashboardData)

module.exports = router