const asyncHandler = require("express-async-handler")
const bcrypt = require('bcrypt')
const Admin = require("../models/adminModel.js")
const Order = require("../models/orderModel.js")
const User = require("../models/userModel.js")
const { createShiprocketShipmentForOrder } = require("./shiprocketService.js")
const { sendOrderConfirmationEmail } = require("../middleware/handleEmail.js")

const adminRegistration = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body

    const adminExist = await Admin.findOne({ email })
    if (adminExist) {
        return res.status(400).send({ message: "Admin already exist with this email" })
    }

    if (name && email && password) {
        const admin = new Admin({
            name,
            email,
            password
        })

        await admin.save()
        const token = await admin.generateAccessToken()

        res.status(201).json({
            status: true,
            message: 'Admin created successfully',
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                token
            }
        });
    } else {
        res.status(400).send({ status: false, message: 'All Fields are required' })
    }
})

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (email && password) {
        let admin = await Admin.findOne({ email })
        if (admin && (await admin.isPasswordCorrect(password))) {
            admin.password = undefined;
            const token = await admin.generateAccessToken()
            res.json({
                status: true,
                admin,
                token
            });
        } else {
            res.status(400);
            throw new Error("Invalid credentials");
        }
    }
})

const resetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) {
        return res.status(400).send({ status: true, message: 'Email not Found' })
    }
    const existedAdmin = await Admin.findOne({ email })
    if (!existedAdmin) {
        return res.status(400).send({ status: false, message: 'Email not exist' })
    }
    const randomPassword = await sendResetEmail()
    existedAdmin.password = randomPassword
    await existedAdmin.save()
    res.status(200).send({ status: true, message: 'Check Your Email for Password Reset' })
})



const getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await Admin.find({})

    if (!admins || admins.length === 0) {
        throw new Error('No Admin Found')
    }

    res.status(200).send({ admins })
})

const getAdminById = asyncHandler(async (req, res) => {
    const { adminId } = req.query

    const admin = await Admin.findOne({ _id: adminId })

    if (!admin) {
        throw new Error('Admin not found')
    }
    res.status(200).send({ admin })
})

const createOrderShipment = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ message: "Order Id is required", });
    }

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    if (order.shipment?.shipmentId) {
        return res.status(400).json({ message: "Shipment already created for this order" });
    }

    const user = await User.findOne({ _id: order.user })
    let userName = "Customer"
    if (user && user?.firstName && user?.lastName) {
        userName = `${user?.firstName} ${user?.lastName}`
    } else if (user && user?.firstName) {
        userName = `${user?.firstName}`
    } else if (user?.email) {
        userName = user?.email
    } else {
        userName = "Customer"
    }

    await sendOrderConfirmationEmail({
        userName: userName,
        email: order.shippingAddress?.email,
        orderItems: order.orderItems,
        orderId: order._id,
        subtotal: order.itemsPrice,
        discount: order.discount,
        tax: 5,
        shipping: order.shippingPrice,
        totalPrice: order.totalPrice,
        shippingAddress: order.shippingAddress,
        billingAddress: order.shippingAddress,
        visualId: order.visualId || order._id
    })

    await createShiprocketShipmentForOrder(order._id);

    const updatedOrder = await Order.findById(orderId).populate("user");;

    res.status(200).json({ message: "Shipment created successfully", order: updatedOrder });
})


module.exports = {
    adminRegistration,
    adminLogin,
    resetPassword,
    getAllAdmins,
    getAdminById,
    createOrderShipment,
}