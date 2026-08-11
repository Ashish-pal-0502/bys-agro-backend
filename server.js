const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const cron = require('node-cron')
const { requestBulkPickup } = require('./controllers/shiprocketService.js')
const { limiter, corsOptions } = require('./middleware/config.js')
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");
const { dbConnect } = require('./db/connect.js')
const userRoute = require('./routes/userRoute.js')
const uploadRoutes = require('./routes/upload.js')
const productRoutes = require("./routes/productRoute.js");
const faqRoutes = require('./routes/faqRoutes')
const orderRoutes = require('./routes/orderRoutes.js')
const wishlistRoutes = require('./routes/wishlistRoutes.js')
const blogRoutes = require('./routes/blogRoutes.js')
const variationRoutes = require('./routes/variationRoutes.js')
const shopByConcernRoutes = require('./routes/shopByConcernRoutes.js')
const cartRoutes = require('./routes/cartRoutes.js')
const adminRoutes = require('./routes/adminRoutes.js')
const dashboardRoutes = require('./routes/dashboardRoutes.js')
const flashSaleRoutes = require('./routes/flashSaleRoutes.js')
const shippingRoutes = require('./routes/deliveryRoutes.js')
const deliveryRoutes = require('./routes/deliveryFeeRoutes.js')
const linkedOfferRoutes = require('./routes/linkedOfferRoutes.js')
const globalReviewRoutes = require('./routes/globalReviewRoutes.js')
const pincodeRoutes = require('./routes/pincodeRoutes.js')
const testimonialRoutes = require("./routes/testimonialRoutes.js");
const { abandonedCartEmail } = require('./middleware/abadonedCartEmail.js')
const User = require('./models/userModel.js')
const Product = require('./models/productModel.js')
const { updateOrdersTrackingStatus } = require('./controllers/orderController.js')
const { abandonedCartWhatsapp } = require('./jobs/abandonedCartWhatsapp.js')
dotenv.config()

const app = express()
dbConnect()

const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions));
app.use(limiter)

app.use('/api/user', userRoute)
app.use("/api/admin", adminRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/product', productRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/order', orderRoutes)
app.use('/api/blog', blogRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/variation', variationRoutes)
app.use('/api/shop-by-concern', shopByConcernRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/flashsale", flashSaleRoutes)
app.use("/api/shipping", shippingRoutes)
app.use("/api/delivery-fee", deliveryRoutes)
app.use("/api/linked-offer", linkedOfferRoutes)
app.use("/api/global", globalReviewRoutes)
app.use("/api/pincode", pincodeRoutes)
app.use("/api/testimonial", testimonialRoutes);

app.use(notFound)
app.use(errorHandler)

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});


//cron.schedule("30 23 * * *", requestBulkPickup);

cron.schedule("0 */2 * * *", requestBulkPickup);

cron.schedule('0 * * * *', abandonedCartEmail)

cron.schedule("0 0 * * *", updateOrdersTrackingStatus);

cron.schedule("0 * * * *", abandonedCartWhatsapp);

app.listen(PORT, async () => {
    console.log(`Server is running on our PORT ${PORT}`)
})