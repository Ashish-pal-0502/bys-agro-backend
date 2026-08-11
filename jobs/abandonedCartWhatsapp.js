const Cart = require("../models/cartModel");
const { sendTemplateMessage } = require("../services/whatsappService");

const abandonedCartWhatsapp = async () => {
    try {
        console.log("Running abandoned cart WhatsApp...");

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        // const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000);

        const carts = await Cart.find({
            createdAt: { $lte: oneHourAgo },
            // createdAt: { $lte: oneMinAgo },
            whatsappReminderSent: false,
        })
            .populate("user")
            .populate("product");
        // console.log("Carts", carts);
        if (carts.length === 0) return; 

        const userCartMap = {};

        // Grouping carts by user (to send only single message)
        carts.forEach((cart) => {
            const userId = cart.user?._id?.toString();

            if (!userCartMap[userId]) {
                userCartMap[userId] = {
                    user: cart.user,
                    cartIds: [],
                }
            }

            userCartMap[userId].cartIds.push(cart._id);
        })

        // Send one WhatsApp per user
        for (const userId in userCartMap) {
            const { user, cartIds } = userCartMap[userId];
            // console.log("user", user);
            // Skip if no mobile exitsts for a user
            if (!user?.phone) continue;

            // Get full cart for user
            const fullCart = await Cart.find({ user: user._id })
                .populate("product");

            // const products = fullCart.map((cart) => cart.product?.name);

            // let productText = "";

            // if (products.length === 1) {
            //     productText = products[0];
            // } else {
            //     productText = `${products[0]} and ${products.length - 1} more item(s)`;
            // }

            const isSent = await sendTemplateMessage({
                phone: user.phone,
                customerName: user.firstName || "User",
                // productName: productText,
            })
            // console.log("isSent", isSent)

            // Mark sent
            if (isSent) {
                await Cart.updateMany(
                    { _id: { $in: cartIds } },
                    { whatsappReminderSent: true }
                )
            }
        }

        console.log("Abandoned cart WhatsApp completed");

    } catch (error) {
        console.log("WhatsApp Cron Error:", error);
    }
};

module.exports = {
    abandonedCartWhatsapp,
};