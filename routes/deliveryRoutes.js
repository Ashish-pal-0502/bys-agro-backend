const { checkServiceability, calculateShippingCost, createWarehouse, getWarehouses, deleteWarehouse,
    createShiprocketOrderTest, generateAWB, cancelShiprocketOrder, cancelShiprocketAWBs, cancelShipmentByOrderId, requestPickupForOrder, calculateShippingForOrder, getServiceableCouriers
 } = require('../controllers/shiprocketService')
const express = require('express')
const { isAdmin, isUser } = require('../middleware/authMiddleware')

const router = express.Router()

router.post('/check-pincode', checkServiceability)
router.post('/calculate-shipping-cost', calculateShippingCost)
router.post('/calculate-shipping-cost-for-order', isUser, calculateShippingForOrder)

router.post('/create-warehouse', isAdmin, createWarehouse)
router.get('/get-warehouses', isAdmin, getWarehouses)
router.delete('/delete-warehouse', isAdmin, deleteWarehouse)
router.post('/create-order-test', isAdmin, createShiprocketOrderTest)

router.post('/generate-awb', isAdmin, generateAWB)
router.post('/cancel-shiprocket-order', isAdmin, cancelShiprocketOrder)
router.post('/cancel-order-through-awb', isAdmin, cancelShiprocketAWBs)

router.post('/cancel-shipment-by-order-id', isAdmin, cancelShipmentByOrderId)
router.get('/request-pickup', isAdmin, requestPickupForOrder)
router.post('/get-serviceable-couriers', isAdmin, getServiceableCouriers)

module.exports = router
