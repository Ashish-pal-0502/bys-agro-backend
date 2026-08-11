const { checkServiceability, calculateShippingCost, createWarehouse, getWarehouses, deleteWarehouse,
    createShiprocketOrderTest, generateAWB, cancelShiprocketOrder, cancelShiprocketAWBs, cancelShipmentByOrderId, requestPickupForOrder, calculateShippingForOrder, getServiceableCouriers
 } = require('../controllers/shiprocketService')
const express = require('express')

const router = express.Router()

router.post('/check-pincode', checkServiceability)
router.post('/calculate-shipping-cost', calculateShippingCost)
router.post('/calculate-shipping-cost-for-order', calculateShippingForOrder)

router.post('/create-warehouse', createWarehouse)
router.get('/get-warehouses', getWarehouses)
router.delete('/delete-warehouse', deleteWarehouse)
router.post('/create-order-test', createShiprocketOrderTest)

router.post('/generate-awb', generateAWB)
router.post('/cancel-shiprocket-order', cancelShiprocketOrder)
router.post('/cancel-order-through-awb', cancelShiprocketAWBs)

router.post('/cancel-shipment-by-order-id', cancelShipmentByOrderId)
router.get('/request-pickup', requestPickupForOrder)
router.post('/get-serviceable-couriers', getServiceableCouriers)

module.exports = router