const asyncHandler = require("express-async-handler");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
// const UserReward = require("../models/userReward");
const nodemailer = require("nodemailer");
const Inventory = require("../models/inventoryModel");
const Coupon = require('../models/couponModel')
const mongoose = require('mongoose')
const { createShiprocketShipment } = require('../middleware/shiprocketAuth')
const { createShiprocketShipmentForOrder } = require('./shiprocketService')
const FlashSale = require('../models/flashModel')
const FlashSaleUsage = require('../models/flashUsageModel')
const cron = require('node-cron');
const { getShiprocketToken } = require("../middleware/shiprocketAuth");
const { sendOrderConfirmationEmail } = require('../middleware/handleEmail.js')
const axios = require('axios')
const dayjs = require("dayjs");
const { createSingleParcel } = require('../controllers/checkSlab.js')

// const emailTemplate = require("../document/email");
// const endOfDay = require("date-fns/endOfDay");
// const startOfDay = require("date-fns/startOfDay");
// const startOfMonth = require("date-fns/startOfMonth");
// const endOfMonth = require("date-fns/endOfMonth");
// const pdf = require("html-pdf");
// const template = require("../document/template");
// const { parseISO } = require("date-fns");
// const OrderPDF = require("./orderPdf");
const Razorpay = require("razorpay");
// const { generateWayBill } = require("./dhlController");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// const sendEmail = (orderItems, paymentMethod, totalPrice, user) => {
//   const items = orderItems;
//   var options = { format: "A4" };

//   pdf
//     .create(OrderPDF({ items, user, paymentMethod, totalPrice }), options)
//     .toFile(`${__dirname}/invoice1.pdf`, (err) => {
//       transporter.sendMail({
//         from: ` Oransia <info@oransia.com>`, // sender address
//         to: `${user.email}`, // list of receivers
//         replyTo: `<info@oransia.com>`,
//         subject: `Order Confirm ${user?.name}`, // Subject line
//         text: `Order from Oransia`, // plain text body
//         html: emailTemplate(orderItems, paymentMethod, totalPrice), // html body
//         attachments: [
//           {
//             filename: "invoice1.pdf",
//             path: `${__dirname}/invoice1.pdf`,
//           },
//         ],
//       });
//     });
// };

// const addOrderItems = asyncHandler(async (req, res) => {
//   const {
//     orderItems,
//     shippingAddress,
//     paymentMethod,
//     invoiceId,
//     shippingPrice,
//     paidAt,
//     itemsPrice,
//     totalPrice,
//     paymentResult,
//     deliveryStatus,
//     deliveredAt,
//     userId,
//     notes,
//     isPaid,
//   } = req.body;

//   if (paymentMethod == "COD") {

//     const order = await Order.create({
//       orderItems,
//       user: userId,
//       shippingAddress,
//       paymentResult,
//       paymentMethod,
//       itemsPrice,
//       deliveryStatus,
//       isPaid: true,
//       totalPrice,
//       notes,
//       invoiceId,
//       shippingPrice,
//       paidAt,
//     });

//     if (order) {
//       for (let i = 0; i < orderItems.length; i++) {
//         const product = await Inventory.findOne({
//           product: orderItems[i].product,
//         });

//         if (product) {
//           product.qty = product.qty - orderItems[i].qty;
//           const updatedProduct = await product.save();
//         }
//       }


//       const orderForWayBill = await Order.findOne({_id: order._id}).populate('user')

//       const result =  await generateWayBill(orderForWayBill)
//        console.log('result', result)
//       if(result) {
//         const updatedOrder = await Order.findByIdAndUpdate(
//           orderForWayBill._id,
//           { $set: { wayBill: result } },
//           { new: true }
//       );
//       return res.status(201).json(updatedOrder);
//       }

//       //   sendEmail(orderItems, paymentMethod, totalPrice, user);
//       res.status(201).json({order});
//     }
//   } else {

//     const order = await Order.create({
//       orderItems,
//       user: userId,
//       shippingAddress,
//       paymentResult,
//       paymentMethod,
//       itemsPrice,
//       deliveryStatus,
//       totalPrice,
//       notes,
//       invoiceId,
//       shippingPrice,
//       deliveredAt,
//       paidAt,
//       isPaid,
//     });

//     if (order && isPaid == true) {
//       // count in stock algo

//       for (let i = 0; i < orderItems.length; i++) {
//         const product = await Inventory.findOne({
//           product: orderItems[i].product,
//         });

//         if (product) {
//           product.qty = product.qty - orderItems[i].qty;
//           const updatedProduct = await product.save();
//         }
//       }
//       const orderForWayBill = await Order.findOne({_id: order._id}).populate('user')
//       // const result =  await generateWayBill(orderForWayBill)
//       // if(result) {
//       //   const updatedOrder = await Order.findByIdAndUpdate(
//       //     orderForWayBill._id,
//       //     { $set: { wayBill: result } },
//       //     { new: true }
//       // );
//       // return res.status(201).json(updatedOrder);
//       // }

//       res.status(201).json({ order });
//       //   sendEmail(orderItems, paymentMethod, totalPrice, user);
//       // res.status(201).json(order);
//     }
//   }
// });

function getCheapest(couriers) {
  if (couriers.length === 0) return null;

  let cheapest = couriers[0];

  for (let i = 1; i < couriers.length; i++) {
    if (Number(couriers[i].rate) < Number(cheapest.rate)) {
      cheapest = couriers[i];
    }
  }

  return cheapest;
}


function getFastest(couriers) {
  if (couriers.length === 0) return null;

  let fastest = couriers[0];

  for (let i = 1; i < couriers.length; i++) {
    if (Number(couriers[i].etd_hours) < Number(fastest.etd_hours)) {
      fastest = couriers[i];
    }
  }

  return fastest;
}


function getRecommended(couriers, recommendedId) {
  for (let i = 0; i < couriers.length; i++) {
    if (couriers[i].courier_company_id === recommendedId) {
      return couriers[i];
    }
  }
  return null;
}


// const calculateParcelShippingPrice = async ({
//   parcel,
//   pickupPincode,
//   deliveryPincode,
//   paymentMethod,
// }) => {
//   const params = {
//     pickup_postcode: pickupPincode,
//     delivery_postcode: deliveryPincode,
//     weight: parcel.totalWeight / 1000,
//     length: parcel.totalLength || 10,
//     breadth: parcel.totalWidth || 10,
//     height: parcel.totalHeight || 10,
//     cod: paymentMethod === "COD" ? 1 : 0
//   };

//   const token = await getShiprocketToken()

//   const response = await axios.get(
//     "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
//     {
//       headers: { Authorization: `Bearer ${token}` },
//       params
//     }
//   );

//   const data = response.data.data;
//   const couriers = data.available_courier_companies || [];

//   if (!couriers.length) return 0;

//   const cheapest = getCheapest(couriers);
//   const fastest = getFastest(couriers);
//   const recommended = getRecommended(
//     couriers,
//     data.recommended_courier_company_id
//   );

//   if (recommended?.rate) return Number(recommended.rate);
//   if (cheapest?.rate) return Number(cheapest.rate);
//   if (fastest?.rate) return Number(fastest.rate);

//   return 0;
// };

const calculateParcelShippingPrice = async ({
  parcel,
  pickupPincode,
  deliveryPincode,
  paymentMethod,
}) => {
  try {
    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: Math.max(parcel?.totalWeight || 0.1, 0.1) / 1000,
      length: parcel?.totalLength || 10,
      breadth: parcel?.totalWidth || 10,
      height: parcel?.totalHeight || 10,
      cod: paymentMethod === "COD" ? 1 : 0,
    };

    const token = await getShiprocketToken();

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      {
        headers: { Authorization: `Bearer ${token}` },
        params,
      }
    );

    const data = response?.data?.data || {};
    const couriers = data.available_courier_companies || [];

    if (!couriers.length) {
      return {
        shippingPrice: 0,
        courierCompanyId: null,
        courierName: null,
        estimatedDeliveryDays: null,
      };
    }

    const cheapest = getCheapest(couriers);
    const fastest = getFastest(couriers);
    const recommended = getRecommended(
      couriers,
      data.recommended_courier_company_id
    );

    // Priority: recommended → cheapest → fastest
    const selectedCourier =
      recommended?.rate
        ? recommended
        : cheapest?.rate
          ? cheapest
          : fastest?.rate
            ? fastest
            : null;

    if (!selectedCourier) {
      return {
        shippingPrice: 0,
        courierCompanyId: null,
        courierName: null,
        estimatedDeliveryDays: null,
      };
    }

    return {
      shippingPrice: Number(selectedCourier.rate || 0),
      courierCompanyId: selectedCourier.courier_company_id || null,
      courierName: selectedCourier.courier_name || null,
      estimatedDeliveryDays:
        selectedCourier.estimated_delivery_days || null,
    };
  } catch (error) {
    console.error(
      "calculateParcelShippingPrice error:",
      error.response?.data || error.message
    );

    // ❗ fail-safe return (never breaks order creation)
    return {
      shippingPrice: 0,
      courierCompanyId: null,
      courierName: null,
      estimatedDeliveryDays: null,
    };
  }
};



const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    invoiceId,
    shippingPrice,
    paidAt,
    itemsPrice,
    totalPrice,
    paymentResult,
    deliveryStatus,
    deliveredAt,
    userId,
    notes,
    isPaid,
    code,
    discount,
    totalWeight
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  for (const item of orderItems) {
    const productInventory = await Inventory.findOne({ product: item.product });
    if (!productInventory) {
      res.status(400);
      throw new Error(`Product not found in inventory: ${item.product}`);
    }
    const orderQty = item.qty || item.quantity || 0;
    if (productInventory.quantity < orderQty) {
      res.status(400);
      throw new Error(
        `Insufficient stock for product ${item.product}. Available: ${productInventory.quantity}, requested: ${orderQty}`
      );
    }
  }

  const order = await Order.create({
    orderItems,
    user: userId,
    shippingAddress,
    paymentResult,
    paymentMethod,
    itemsPrice,
    deliveryStatus,
    totalPrice,
    notes,
    invoiceId,
    shippingPrice,
    paidAt,
    deliveredAt,
    isPaid,
    discount,
    code,
    totalWeight
  });

  if (!order) {
    res.status(400);
    throw new Error('Order could not be created');
  }

  for (const item of orderItems) {
    const productInventory = await Inventory.findOne({ product: item.product });
    const orderQty = item.qty || item.quantity || 0;
    if (productInventory) {
      productInventory.quantity = Math.max(productInventory.quantity - orderQty, 0);
      await productInventory.save();
    }
  }

  if (code) {
    const coupon = await Coupon.findOne({ code })
    if (coupon) {
      coupon.usedBy.push({ user: userId });
      await coupon.save();
    }
  }


  res.status(201).json({ message: "Order created", order });
});

// const verifyOrderItems = asyncHandler(async (req, res) => {
//   const {
//     orderItems,
//     shippingAddress,
//     paymentMethod,
//     invoiceId,
//     shippingPrice,
//     paidAt,
//     itemsPrice,
//     totalPrice,
//     paymentResult,
//     deliveryStatus,
//     deliveredAt,
//     userId,
//     notes,
//     isPaid,
//     code,
//     discount,
//     totalWeight
//   } = req.body;

//   if (!orderItems || orderItems.length === 0) {
//     res.status(400);
//     throw new Error('No order items');
//   }

//   for (const item of orderItems) {
//     const productInventory = await Inventory.findOne({ product: item.product });
//     if (!productInventory) {
//       res.status(400);
//       throw new Error(`Product not found in inventory: ${item.product}`);
//     }
//     const orderQty = item.qty || item.quantity || 0;
//     if (productInventory.quantity < orderQty) {
//       res.status(400);
//       throw new Error(
//         `Insufficient stock for product ${item.product}. Available: ${productInventory.quantity}, requested: ${orderQty}`
//       );
//     }
//   }

//   const order = await Order.create({
//     orderItems,
//     user: userId,
//     shippingAddress,
//     paymentResult,
//     paymentMethod,
//     itemsPrice,
//     deliveryStatus,
//     totalPrice,
//     notes,
//     invoiceId,
//     shippingPrice,
//     paidAt,
//     deliveredAt,
//     isPaid,
//     discount,
//     code,
//     totalWeight
//   });

//   if (!order) {
//     res.status(400);
//     throw new Error('Order could not be created');
//   }

//   for (const item of orderItems) {
//     const productInventory = await Inventory.findOne({ product: item.product });
//     const orderQty = item.qty || item.quantity || 0;
//     if (productInventory) {
//       productInventory.quantity = Math.max(productInventory.quantity - orderQty, 0); 
//       await productInventory.save();
//     }
//   }

//   if(code) {
//     const coupon = await Coupon.findOne({ code })
//     if (coupon) {
//       coupon.usedBy.push({ user: userId });
//       await coupon.save();
//     }
//   }

//   res.status(201).json({ message: "Order created", order });
// });

// const createOrder = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       orderItems,
//       shippingAddress,
//       paymentMethod,
//       invoiceId,
//       shippingPrice,
//       paidAt,
//       itemsPrice,
//       totalPrice,
//       paymentResult,
//       deliveryStatus,
//       deliveredAt,
//       userId,
//       notes,
//       isPaid,
//       code,
//       discount,
//       totalWeight
//     } = req.body;

//     if (!orderItems || orderItems.length === 0) {
//       res.status(400);
//       throw new Error('No order items');
//     }

//     for (const item of orderItems) {
//       const productInventory = await Inventory.findOne(
//         { product: item.product },
//         null,
//         { session }
//       );

//       if (!productInventory) {
//         res.status(400);
//         throw new Error(`Product not found in inventory: ${item.product}`);
//       }

//       const orderQty = item.qty || item.quantity || 0;

//       if (productInventory.quantity < orderQty) {
//         res.status(400);
//         throw new Error(
//           `Insufficient stock for product ${item.product}. Available: ${productInventory.quantity}, requested: ${orderQty}`
//         );
//       }
//     }

//     const order = await Order.create(
//       [
//         {
//           orderItems,
//           user: userId,
//           shippingAddress,
//           paymentResult,
//           paymentMethod,
//           itemsPrice,
//           deliveryStatus,
//           totalPrice,
//           notes,
//           invoiceId,
//           shippingPrice,
//           paidAt,
//           deliveredAt,
//           isPaid,
//           discount,
//           code,
//           totalWeight
//         }
//       ],
//       { session }
//     );

//     for (const item of orderItems) {
//       const orderQty = item.qty || item.quantity || 0;

//       await Inventory.updateOne(
//         { product: item.product },
//         { $inc: { quantity: -orderQty } },
//         { session }
//       );
//     }

//     if (code) {
//       const coupon = await Coupon.findOne({ code }, null, { session });

//       if (coupon) {
//         coupon.usedBy.push({ user: userId });
//         await coupon.save({ session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({
//       message: 'Order created',
//       order: order[0]
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// });

// using this
// const createOrder = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       orderItems,
//       shippingAddress,
//       paymentMethod,
//       invoiceId,
//       shippingPrice,
//       paidAt,
//       itemsPrice,
//       totalPrice,
//       paymentResult,
//       deliveryStatus,
//       deliveredAt,
//       userId,
//       notes,
//       isPaid,
//       code,
//       discount,
//       totalWeight
//     } = req.body;

//     if (!orderItems || orderItems.length === 0) {
//       res.status(400);
//       throw new Error('No order items');
//     }

//     const now = new Date();


//     for (const item of orderItems) {
//       const orderQty = item.qty || item.quantity || 0;

//       const productInventory = await Inventory.findOne(
//         { product: item.product },
//         null,
//         { session }
//       );

//       if (!productInventory) {
//         res.status(400);
//         throw new Error(`Product not found in inventory: ${item.product}`);
//       }

//       if (productInventory.quantity < orderQty) {
//         res.status(400);
//         throw new Error(
//           `Insufficient stock for product ${item.product}. Available: ${productInventory.quantity}, requested: ${orderQty}`
//         );
//       }

//       if (item.flashId) {
//         const flashSale = await FlashSale.findOne(
//           {
//             _id: item.flashId,
//             isActive: true,
//             startTime: { $lte: now },
//             endTime: { $gte: now }
//           },
//           null,
//           { session }
//         );

//         if (!flashSale) {
//           res.status(400);
//           throw new Error(`Flash sale expired or inactive for product ${item.product}`);
//         }

//         if (
//           flashSale.scope === 'PRODUCTS' &&
//           !flashSale.products.some(
//             p => p.toString() === item.product.toString()
//           )
//         ) {
//           res.status(400);
//           throw new Error(`Product not eligible for flash sale`);
//         }

//         const usage = await FlashSaleUsage.findOne(
//           { user: userId, flashSale: flashSale._id },
//           null,
//           { session }
//         );

//         const usedCount = usage?.usedCount || 0;

//         if (usedCount + orderQty > flashSale.perUserLimit) {
//           res.status(400);
//           throw new Error(
//             `Flash sale limit exceeded. Limit: ${flashSale.perUserLimit}, Used: ${usedCount}`
//           );
//         }
//       }
//     }

//     const order = await Order.create(
//       [
//         {
//           orderItems,
//           user: userId,
//           shippingAddress,
//           paymentResult,
//           paymentMethod,
//           itemsPrice,
//           deliveryStatus,
//           totalPrice,
//           notes,
//           invoiceId,
//           shippingPrice,
//           paidAt,
//           deliveredAt,
//           isPaid,
//           discount,
//           code,
//           totalWeight
//         }
//       ],
//       { session }
//     );


//     for (const item of orderItems) {
//       const orderQty = item.qty || item.quantity || 0;

//       await Inventory.updateOne(
//         { product: item.product },
//         { $inc: { quantity: -orderQty } },
//         { session }
//       );
//     }

//     for (const item of orderItems) {
//       if (!item.flashId) continue;

//       const orderQty = item.qty || item.quantity || 0;

//       await FlashSaleUsage.findOneAndUpdate(
//         {
//           user: userId,
//           flashSale: item.flashId
//         },
//         {
//           $inc: { usedCount: orderQty }
//         },
//         {
//           upsert: true,
//           session
//         }
//       );
//     }


//     if (code) {
//       const coupon = await Coupon.findOne({ code }, null, { session });

//       if (coupon) {
//         coupon.usedBy.push({ user: userId });
//         await coupon.save({ session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({
//       message: 'Order created',
//       order: order[0]
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// });

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

function mergeParcelItems(items) {
  if (items.length === 1) {
    return [{ ...items[0], qty: 1 }];
  }

  const [first, second] = items;

  const canMerge =
    first.weight === second.weight &&
    first.isCombo === second.isCombo;

  if (canMerge) {
    return [{
      ...first,
      qty: 2
    }];
  }

  return [
    { ...first, qty: 1 },
    { ...second, qty: 1 }
  ];
}


const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      invoiceId,
      shippingPrice,
      paidAt,
      itemsPrice,
      totalPrice,
      paymentResult,
      deliveryStatus,
      deliveredAt,
      userId,
      notes,
      isPaid,
      code,
      discount,
      totalWeight
    } = req.body;

    console.log('itemsPrice', itemsPrice)

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error('No order items');
    }

    const now = new Date();


    for (const item of orderItems) {
      const orderQty = item.qty || item.quantity || 0;

      const productInventory = await Inventory.findOne(
        { product: item.product },
        null,
        { session }
      );

      if (!productInventory) {
        res.status(400);
        throw new Error(`Product not found in inventory: ${item.product}`);
      }

      if (productInventory.quantity < orderQty) {
        res.status(400);
        throw new Error(
          `Insufficient stock for product ${item.product}. Available: ${productInventory.quantity}, requested: ${orderQty}`
        );
      }
    }


    const flashQtyMap = {};
    for (const item of orderItems) {
      if (!item.flashId) continue;
      const qty = item.qty || item.quantity || 0;
      flashQtyMap[item.flashId] = (flashQtyMap[item.flashId] || 0) + qty;
    }

    for (const [flashId, totalQty] of Object.entries(flashQtyMap)) {
      const flashSale = await FlashSale.findOne(
        {
          _id: flashId,
          isActive: true,
          startTime: { $lte: now },
          endTime: { $gte: now }
        },
        null,
        { session }
      );

      if (!flashSale) {
        res.status(400);
        throw new Error(`Flash sale expired or inactive`);
      }

      if (flashSale.scope === 'PRODUCTS') {
        const invalidItem = orderItems.find(
          i =>
            i.flashId?.toString() === flashId &&
            !flashSale.products.some(p => p.toString() === i.product.toString())
        );

        if (invalidItem) {
          res.status(400);
          throw new Error(`Product not eligible for flash sale`);
        }
      }

      const usage = await FlashSaleUsage.findOne(
        { user: userId, flashSale: flashId },
        null,
        { session }
      );
      const usedCount = usage?.usedCount || 0;

      if (usedCount + totalQty > flashSale.perUserLimit) {
        res.status(400);
        throw new Error(
          `Flash sale limit exceeded. Limit: ${flashSale.perUserLimit}, Used: ${usedCount}, Requested: ${totalQty}`
        );
      }
    }


    const order = await Order.create(
      [
        {
          orderItems,
          user: userId,
          shippingAddress,
          paymentResult,
          paymentMethod,
          itemsPrice,
          deliveryStatus,
          totalPrice,
          notes,
          invoiceId,
          shippingPrice,
          paidAt,
          deliveredAt,
          isPaid,
          discount,
          code,
          totalWeight
        }
      ],
      { session }
    );


    for (const item of orderItems) {
      const orderQty = item.qty || item.quantity || 0;

      await Inventory.updateOne(
        { product: item.product },
        { $inc: { quantity: -orderQty } },
        { session }
      );
    }


    for (const [flashId, qty] of Object.entries(flashQtyMap)) {
      await FlashSaleUsage.findOneAndUpdate(
        { user: userId, flashSale: flashId },
        { $inc: { usedCount: qty } },
        { upsert: true, session }
      );
    }


    if (code) {
      const coupon = await Coupon.findOne({ code }, null, { session });
      if (coupon) {
        coupon.usedBy.push({ user: userId });
        await coupon.save({ session });
      }
    }


    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Order created',
      order: order[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});


const { groupOrderItemsForShipping, getDeliveryInfo } = require('../controllers/checkSlab.js');
const mapStatus = require("../utils/mapDeliveryStatus.js");


const createBatchOrders = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      invoiceId,
      shippingPrice,
      courierId,
      paidAt,
      paymentResult,
      deliveryStatus,
      itemsPrice,
      totalPrice,
      deliveredAt,
      userId,
      notes,
      isPaid,
      code,
      courierName,
      estimated_delivery_days,
      discount = 0,
      freeDelivery
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

    const now = new Date();

    for (const item of orderItems) {
      const qty = item.qty || 0;
      const inventory = await Inventory.findOne({ product: item.product }, null, { session });
      if (!inventory) throw new Error(`Product not found: ${item.name}`);
      if (inventory.quantity < qty) throw new Error(`Insufficient stock: ${item.name}`);
    }

    const flashQtyMap = {};
    for (const item of orderItems) {
      if (!item.flashId) continue;
      const qty = item.qty || 0;
      flashQtyMap[item.flashId] = (flashQtyMap[item.flashId] || 0) + qty;
    }

    for (const [flashId, totalQty] of Object.entries(flashQtyMap)) {
      const flashSale = await FlashSale.findOne(
        { _id: flashId, isActive: true, startTime: { $lte: now }, endTime: { $gte: now } },
        null,
        { session }
      );
      if (!flashSale) throw new Error("Flash sale expired or inactive");

      const usage = await FlashSaleUsage.findOne({ user: userId, flashSale: flashId }, null, { session });
      const usedCount = usage?.usedCount || 0;
      if (usedCount + totalQty > flashSale.perUserLimit) throw new Error("Flash sale limit exceeded");
    }

    const parcel = createSingleParcel(orderItems);

    const order = await Order.create(
      [
        {
          orderItems,
          user: userId,
          shippingAddress,
          paymentResult,
          paymentMethod,
          itemsPrice,
          deliveryStatus,
          totalPrice,
          notes,
          invoiceId,
          shippingPrice: shippingPrice,
          courierId,
          courierName,
          totalWeight: parcel.totalWeight,
          totalWidth: parcel.totalWidth,
          totalHeight: parcel.totalHeight,
          totalLength: parcel.totalLength,
          paidAt,
          deliveredAt,
          isPaid,
          discount,
          code,
          freeDelivery,
          estimated_delivery_days
        }
      ],
      { session }
    );

    for (const item of orderItems) {
      const qty = item.qty || 0;
      await Inventory.updateOne({ product: item.product }, { $inc: { quantity: -qty } }, { session });
    }

    for (const [flashId, qty] of Object.entries(flashQtyMap)) {
      await FlashSaleUsage.findOneAndUpdate(
        { user: userId, flashSale: flashId },
        { $inc: { usedCount: qty } },
        { upsert: true, session }
      );
    }

    if (code) {
      const coupon = await Coupon.findOne({ code }, null, { session });
      if (coupon) {
        coupon.usedBy.push({ user: userId });
        await coupon.save({ session });
      }
    }


    await session.commitTransaction();
    session.endSession();
    console.log("order", order);
    if (paymentMethod === "COD") {
      console.log('COD Ship is running')
      order.forEach(async (o) => {
        const user = await User.findOne({ _id: o.user })
        let userName = "Customer"
        if (user && user.firstName && user.lastName) {
          userName = `${user.firstName} ${user.lastName}`
        } else if (user && user.firstName) {
          userName = `${user.firstName}`
        } else if (user.email) {
          userName = user.email
        } else {
          userName = "Customer"
        }

        sendOrderConfirmationEmail({
          userName: userName,
          email: o.shippingAddress?.email,
          orderItems: o.orderItems,
          orderId: o._id,
          subtotal: o.itemsPrice,
          discount: o.discount,
          tax: 5,
          shipping: o.shippingPrice,
          totalPrice: o.totalPrice,
          shippingAddress: o.shippingAddress,
          billingAddress: o.shippingAddress,
          visualId: o.visualId || o._id
        })

      })
      order.forEach(o => createShiprocketShipmentForOrder(o._id));
    }

    // await Promise.all(
    //   order.map(async (o) => {
    //     const user = await User.findById(o.user);

    //     let userName = "Customer";

    //     if (user?.firstName && user?.lastName) {
    //       userName = `${user.firstName} ${user.lastName}`;
    //     } else if (user?.firstName) {
    //       userName = user.firstName;
    //     } else if (user?.email) {
    //       userName = user.email;
    //     }

    //     await sendOrderConfirmationEmail({
    //       userName,
    //       email: o.shippingAddress?.email,
    //       orderItems: o.orderItems,
    //       orderId: o._id,
    //       subtotal: o.itemsPrice,
    //       discount: o.discount,
    //       tax: 5,
    //       shipping: o.shippingPrice,
    //       totalPrice: o.totalPrice,
    //       shippingAddress: o.shippingAddress,
    //       billingAddress: o.shippingAddress,
    //       visualId: o.visualId || o._id
    //     });

    //     await createShiprocketShipmentForOrder(o._id);
    //   })
    // );

    res.status(201).json({
      message: "Orders created successfully",
      totalOrders: 1,
      orders: order
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});



const verifyOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderId,
      paymentStatus,
      paymentMethod,
      invoiceId,
      paidAt
    } = req.body;

    if (!orderId || !paymentStatus) {
      res.status(400);
      throw new Error('orderId and paymentStatus are required');
    }

    const order = await Order.findById(orderId).session(session);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.paymentStatus !== 'pending') {
      res.status(400);
      throw new Error('Order already verified');
    }

    if (paymentStatus === 'failed') {
      for (const item of order.orderItems) {
        const qty = item.qty || item.quantity || 0;

        await Inventory.updateOne(
          { product: item.product },
          { $inc: { quantity: qty } },
          { session }
        );
      }

      order.paymentStatus = 'failed';
      order.isPaid = false;
      order.paymentMethod = paymentMethod || order.paymentMethod;
      order.invoiceId = invoiceId || order.invoiceId;

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: 'Payment failed. Inventory reverted.',
        order
      });
    }

    if (paymentStatus === 'completed') {
      order.paymentStatus = 'completed';
      order.isPaid = true;
      order.paidAt = paidAt || new Date();
      order.paymentMethod = paymentMethod;
      order.invoiceId = invoiceId;

      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      // createShiprocketShipmentForOrder(order._id)

      return res.status(200).json({
        message: 'Payment verified successfully',
        order
      });
    }

    throw new Error('Invalid payment status');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

const verifyMultipleOrders = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderIds,
      paymentStatus,
      paymentMethod,
      invoiceId,
      paidAt
    } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.status(400);
      throw new Error('orderIds must be a non-empty array');
    }

    if (!paymentStatus) {
      res.status(400);
      throw new Error('paymentStatus is required');
    }

    const orders = await Order.find({
      _id: { $in: orderIds }
    }).session(session);

    if (orders.length !== orderIds.length) {
      res.status(404);
      throw new Error('One or more orders not found');
    }

    for (const order of orders) {
      if (order.paymentStatus !== 'pending') {
        res.status(400);
        throw new Error('One or more orders already verified');
      }
    }

    if (paymentStatus === 'failed') {
      for (const order of orders) {
        for (const item of order.orderItems) {
          const qty = item.qty || item.quantity || 0;

          await Inventory.updateOne(
            { product: item.product },
            { $inc: { quantity: qty } },
            { session }
          );
        }

        order.paymentStatus = 'failed';
        order.isPaid = false;
        order.paymentMethod = paymentMethod || order.paymentMethod;
        order.invoiceId = invoiceId || order.invoiceId;

        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        message: 'Payment failed. Inventory reverted for all orders.',
        orders
      });
    }

    if (paymentStatus === 'completed') {
      for (const order of orders) {
        order.paymentStatus = 'completed';
        order.isPaid = true;
        order.paidAt = paidAt || new Date();
        order.paymentMethod = paymentMethod;
        order.invoiceId = invoiceId;

        const user = await User.findOne({ _id: order.user })
        let userName = "Customer"
        if (user && user.firstName && user.lastName) {
          userName = `${user.firstName} ${user.lastName}`
        } else if (user && user.firstName) {
          userName = `${user.firstName}`
        } else if (user.email) {
          userName = user.email
        } else {
          userName = "Customer"
        }

        sendOrderConfirmationEmail({
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


        await order.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      orders.forEach(o => createShiprocketShipmentForOrder(o._id));

      return res.status(200).json({
        message: 'Payment verified successfully for all orders',
        orders
      });
    }

    throw new Error('Invalid payment status');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

const verifyOrdersByAdmin = asyncHandler(async (req, res) => {
  const {
    orderId,
    paymentStatus = "completed",
    paymentMethod,
    invoiceId,
    paidAt,
  } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (paymentStatus !== "completed") {
    throw new Error("Invalid payment status");
  }

  if (order.isPaid) {
    return res.status(400).json({ message: "Order already paid" });
  }

  order.paymentStatus = "completed";
  order.isPaid = true;
  order.paidAt = paidAt || new Date();
  order.paymentMethod = paymentMethod;
  if (invoiceId) order.invoiceId = invoiceId;

  await order.save();

  if (paymentMethod === "Prepaid") {

    await createShiprocketShipmentForOrder(order._id);
    // console.log("creating shipment")

    const user = await User.findById(order.user);
    let userName = user?.firstName || user?.email || "Customer";

    await sendOrderConfirmationEmail({
      userName,
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
    });

    // console.log("sending confirmation email")
  }


  return res.status(200).json({
    message: "Payment verified successfully",
    order,
  });

});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.query.id).populate(
    "user",
    "name email"
  )
    .populate("orderItems.product", "-_id groupId");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.shipment?.awb) {
    try {
      const token = await getShiprocketToken();
      const awb_code = order.shipment.awb
      const response = await axios.get(
        `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb_code}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // console.log('response', response)

      const tracking = response.data;
      if (tracking) {
        // console.log("tracking", tracking)
        // order.shipment.liveTrackingData = response.data.tracking_data;
        // console.log('response.data', response.data[awb_code]?.tracking_data)
        // order.shipment.status = tracking.current_status;
        // order.shipment.lastTrackedAt = new Date();
        // await order.save();
      }
    } catch (err) {
      console.error("Tracking fetch failed:", err.response?.data || err.message);
    }
  }

  res.json(order);
});


const updateOrderToPaid = asyncHandler(async (req, res) => {
  const a = req.body.invoiceId;
  const order = await Order.findById(req.body.id);
  const user = await User.findById(order.user);
  const orderItems = order.orderItems;
  const paymentMethod = order.paymentMethod;
  const totalPrice = order.totalprice;
  if (order) {
    order.isPaid = true;
    order.invoiceId = a;
    order.paidAt = Date.now();

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});
const updateOrderToPaidAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});
const updateOrderToUnPaid = asyncHandler(async (req, res) => {
  const a = req.body.invoiceId;
  const order = await Order.findById(req.body.id);

  if (order) {
    order.isPaid = false;
    order.invoiceId = a;

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20, userId } = req.query

  if (!userId) {
    res.status(400);
    throw new Error("User not found");
  }

  const userExists = await User.findById(userId)
  if (!userExists) {
    res.status(400);
    throw new Error("User not found");
  }

  const hasActiveOrders = await Order.exists({
    user: userId,
    deliveryStatus: { $nin: ["Delivered", "Cancelled"] }
  });

  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (pageNumber - 1));

  if (hasActiveOrders) {
    const token = await getShiprocketToken();
    const SIX_HOURS = 1000 * 60 * 60 * 6;
    await Promise.all(
      orders.map(async (order) => {
        if (
          order.deliveryStatus !== "Delivered" &&
          order.deliveryStatus !== "Cancelled" &&
          order?.shipment?.awb &&
          (
            !order.shipment.lastTrackedAt ||
            Date.now() - new Date(order.shipment.lastTrackedAt).getTime() > SIX_HOURS
          )
        ) {
          try {
            const response = await axios.get(
              `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${order.shipment.awb}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // console.log("response.data", response.data)

            const trackingData = response.data.tracking_data;
            const currentStatus = trackingData?.shipment_track?.[0]?.current_status;
            if (trackingData) {
              order.shipment.liveTrackingData = trackingData;
              order.shipment.status = currentStatus;
              order.shipment.lastTrackedAt = new Date();

              // syncing order status
              order.deliveryStatus = mapStatus(currentStatus);

              await order.save();
            }
          } catch (err) {
            console.error("Tracking fetch failed:", err.response?.data || err.message);
          }
        }
      })
    );
  }

  const totalDocuments = await Order.countDocuments({ user: userId })
  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.json({ orders, pageCount });
});

const getFailedOnlineOrders = asyncHandler(async (req, res) => {
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Order.countDocuments({ isPaid: false });
  var pageCount = Math.floor(count / 10);
  if (count % 10 !== 0) {
    pageCount = pageCount + 1;
  }
  const orders = await Order.find({ isPaid: false }).populate('user')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ orders, pageCount });
});


const getFailedOnlineOrdersForDownload = asyncHandler(async (req, res) => {

  const orders = await Order.find({ isPaid: false }).populate('user')
    .sort({ createdAt: -1 })


  res.json({ orders });
});


const updateOrderDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId, deliveryStatus } = req.body;

  const order = await Order.findOneAndUpdate(
    { _id: orderId },
    { deliveryStatus: deliveryStatus },
    { new: true }
  );
  if (order && order.deliveryStatus == "Cancelled") {
    order.isPaid = false;
    for (let i = 0; i < order.orderItems.length; i++) {
      const product = await Product.findById(order.orderItems[i].product);
      if (product) {
        product.countInStock = product.countInStock + order.orderItems[i].qty;
        await product.save();
      }
    }
    // reward algo
    const reward = await UserReward.findOne({ user: order.user });

    reward.amount =
      reward.amount - order.itemsPrice * 0.01 < 0
        ? 0
        : reward.amount - order.itemsPrice * 0.01;
    const updatedOrder = await order.save();
    await reward.save();
    res.json(updatedOrder);
  } else if (order && order.deliveryStatus == "Delivered") {
    order.deliveredAt = Date.now();
    order.isPaid = true;
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } else {
    res.json(order);
  }
});

const getOrders = asyncHandler(async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Order.countDocuments({});

  // console.log('count', count)
  var pageCount = Math.ceil(count / pageSize);

  const orders = await Order.find({}).populate('orderItems.product')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate("user");

  // console.log('pageCount', pageCount)
  res.json({ orders, pageCount });
});

const getOrdersForDownload = asyncHandler(async (req, res) => {

  const orders = await Order.find({ isPaid: true }).populate('orderItems.product')
    .sort({ createdAt: -1 })
    .populate("user");

  res.json({ orders });
});



const getPendingOrders = asyncHandler(async (req, res) => {
  const count = await Order.countDocuments({
    deliveryStatus: { $ne: "Delivered" },
  });
  const count2 = await Order.countDocuments({
    deliveryStatus: "Cancelled",
  });

  const total = count - count2;

  res.json(total);
});

const getPendingOrdersPaginated = asyncHandler(async (req, res) => {
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;

  const count = await Order.countDocuments({
    deliveryStatus: { $ne: "Delivered" },
  });

  const countCancelled = await Order.countDocuments({
    deliveryStatus: "Cancelled",
  });

  const total = count - countCancelled;
  const pendingOrders = await Order.find({
    deliveryStatus: { $ne: "Delivered" },
  })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('user', 'id name email phone')
    .populate('orderItems.product');

  const pageCount = Math.ceil(total / pageSize);

  res.json({
    total,
    orders: pendingOrders,
    pageCount,
  });
});


const getPendingOrdersForDownload = asyncHandler(async (req, res) => {

  const pendingOrders = await Order.find({
    deliveryStatus: { $ne: "Delivered" },
  })
    .sort({ createdAt: -1 })
    .populate('user', 'id name email phone')
    .populate('orderItems.product');



  res.json({
    orders: pendingOrders,
  });
});

const getMonthlySales = asyncHandler(async (req, res) => {
  const date = req.query.date;
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Order.countDocuments({});
  var pageCount = Math.floor(count / 10);
  if (count % 10 !== 0) {
    pageCount = pageCount + 1;
  }
  const d1 = parseISO(date);
  const monthlySales = await Order.find({
    $and: [
      {
        createdAt: {
          $gte: startOfMonth(d1),
          $lte: endOfMonth(d1),
        },
      },
      { isPaid: true },
      { deliveryStatus: "Delivered" },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate("user", "id name");

  res.json({ monthlySales, pageCount });
});
const getSalesDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const s1 = parseISO(startDate);
  const s2 = parseISO(endDate);

  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Order.countDocuments({ isPaid: true });
  var pageCount = Math.floor(count / 10);
  if (count % 10 !== 0) {
    pageCount = pageCount + 1;
  }

  const monthlySales = await Order.find({
    $and: [
      {
        createdAt: {
          $gte: startOfDay(s1),
          $lte: endOfDay(s2),
        },
      },
      { isPaid: true },
      { deliveryStatus: "Delivered" },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate("user", "id name")
    .populate("orderItems.product");

  res.json({
    monthlySales,
    pageCount,
  });
});

const getOrderFilter = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;
  const s1 = parseISO(startDate);
  const s2 = parseISO(endDate);
  if (status) {
    const monthlySales = await Order.find({
      $and: [
        {
          createdAt: {
            $gte: startOfDay(s1),
            $lte: endOfDay(s2),
          },
        },
        { deliveryStatus: status },
        { isPaid: true },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("user", "id name")
      .populate("orderItems.product");

    res.json({
      monthlySales,
    });
  } else {
    const monthlySales = await Order.find({
      $and: [
        {
          createdAt: {
            $gte: startOfDay(s1),
            $lte: endOfDay(s2),
          },
        },
        { isPaid: true },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("user", "id name")
      .populate("orderItems.product");

    res.json({
      monthlySales,
    });
  }
});

const payment = asyncHandler(async (req, res) => {
  const total = Number(req.query.total);

  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ message: "Invalid amount", });
  }

  const user = await User.findById(req.query.userId);

  const instance = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET,
  });

  const result = await instance.orders.create({
    amount: total * 100,
    currency: "INR",
    receipt: "receipt#1",
    notes: {
      userId: user._id,
      key: process.env.RAZOR_PAY_ID,
    },
  });

  res.json(result);
});

// const searchOrders = asyncHandler(async (req, res) => {
//   console.log('req.query', req.query)
//   const query = req.query.Query;
//   const pageSize = 30;
//   const page = Number(req.query.pageNumber) || 1;

//   const matchCriteria = {
//     $or: [
//       { deliveryStatus: { $regex: query, $options: "i" } },
//       { 'orderItems.name': { $regex: query, $options: "i" } },
//     ],
//   };

//   const ordersPipeline = [
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'user',
//         foreignField: '_id',
//         as: 'user',
//       },
//     },
//     { $unwind: '$user' },
//     {
//       $match: {
//         $or: [
//           { 'user.name': { $regex: query, $options: 'i' } },
//           matchCriteria.$or[0],
//           matchCriteria.$or[1],
//         ],
//       },
//     },
//     { $sort: { createdAt: -1 } },
//     { $skip: pageSize * (page - 1) },
//     { $limit: pageSize },
//   ];

//   const countPipeline = [
//     ...ordersPipeline.slice(0, -2),
//     { $count: 'totalOrders' },
//   ];

//   const [orders, countResult] = await Promise.all([
//     Order.aggregate(ordersPipeline).exec(),
//     Order.aggregate(countPipeline).exec(),
//   ]);

//   const count = countResult.length > 0 ? countResult[0].totalOrders : 0;
//   const pageCount = Math.ceil(count / pageSize);

//   if (!orders || orders.length === 0) {
//     return res.status(404).json({ message: 'No orders found' });
//   }

//   res.status(200).json({
//     orders,
//     pageCount,
//   });
// });

const searchOrders = async (req, res) => {
  try {
    const { Query: query, pageNumber = 1 } = req.query;

    const pageSize = 10;
    const skip = (pageNumber - 1) * pageSize;

    let filter = {};

    if (query && query.trim() !== "") {
      const q = query.trim();

      if (mongoose.Types.ObjectId.isValid(q)) {
        filter._id = q;
      } else {
        const users = await User.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }).select("_id");

        const userIds = users.map(u => u._id);

        filter.$or = [
          { user: { $in: userIds } },
          { invoiceId: { $regex: q, $options: "i" } },
        ];
      }
    }

    const orders = await Order.find(filter)
      .populate("user")
      .populate('orderItems.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalCount = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pageCount: Math.ceil(totalCount / pageSize),
      totalOrders: totalCount,
    });

  } catch (error) {
    console.error("Search order error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching orders.",
    });
  }
};

const deleteOrder = asyncHandler(async (req, res) => {

  const { id } = req.query;

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  await Order.findByIdAndDelete(id);

  res.status(200).json({ message: 'Order deleted successfully' });
});


const searchPendingOrders = asyncHandler(async (req, res) => {
  const query = req.query.Query;
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;

  const matchCriteria = {
    deliveryStatus: { $ne: "Delivered" },
  };

  const ordersPipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        $and: [
          matchCriteria,
          {
            $or: [
              { 'user.name': { $regex: query, $options: 'i' } },
              { deliveryStatus: { $regex: query, $options: 'i' } },
              { 'orderItems.name': { $regex: query, $options: 'i' } },
            ],
          },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: pageSize * (page - 1) },
    { $limit: pageSize },
  ];

  const countPipeline = [
    ...ordersPipeline.slice(0, -2),
    { $count: 'totalOrders' },
  ];

  const [orders, countResult] = await Promise.all([
    Order.aggregate(ordersPipeline).exec(),
    Order.aggregate(countPipeline).exec(),
  ]);

  const count = countResult.length > 0 ? countResult[0].totalOrders : 0;
  const pageCount = Math.ceil(count / pageSize);

  if (!orders || orders.length === 0) {
    return res.status(404).json({ message: 'No pending orders found' });
  }

  res.status(200).json({
    orders,
    pageCount,
  });
});

const searchFailedOrders = asyncHandler(async (req, res) => {
  const query = req.query.Query;
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;

  const matchCriteria = {
    $or: [
      { deliveryStatus: { $regex: query, $options: "i" } },
      { 'orderItems.name': { $regex: query, $options: "i" } },
    ],
    isPaid: false,
  };

  const ordersPipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        $and: [
          { isPaid: false },
          {
            $or: [
              { 'user.name': { $regex: query, $options: 'i' } },
              matchCriteria.$or[0],
              matchCriteria.$or[1],
            ],
          },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: pageSize * (page - 1) },
    { $limit: pageSize },
  ];

  const countPipeline = [
    ...ordersPipeline.slice(0, -2),
    { $count: 'totalOrders' },
  ];

  const [orders, countResult] = await Promise.all([
    Order.aggregate(ordersPipeline).exec(),
    Order.aggregate(countPipeline).exec(),
  ]);

  const count = countResult.length > 0 ? countResult[0].totalOrders : 0;
  const pageCount = Math.ceil(count / pageSize);

  if (!orders || orders.length === 0) {
    return res.status(404).json({ message: 'No failed orders found' });
  }

  res.status(200).json({
    orders,
    pageCount,
  });
});

const getWayBillNumberByOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.query.orderId })

  res.status(200).send({ order, wayBill: order.wayBill || "" })
})


const failOrderAndRevertInventory = async (orderId, reason = 'Payment timeout') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order || order.paymentStatus !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    for (const item of order.orderItems) {
      const qty = item.qty || item.quantity || 0;

      await Inventory.updateOne(
        { product: item.product },
        { $inc: { quantity: qty } },
        { session }
      );
    }

    order.paymentStatus = 'failed';
    order.isPaid = false;
    order.failureReason = reason;

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const TEN_MINUTES = 10 * 60 * 1000;

cron.schedule('*/10 * * * *', async () => {
  console.log('Running cron: Auto-fail pending orders');

  const expiryTime = new Date(Date.now() - TEN_MINUTES);

  const pendingOrders = await Order.find({
    paymentStatus: 'pending',
    paymentMethod: 'PREPAID',
    createdAt: { $lte: expiryTime }
  }).select('_id');

  for (const order of pendingOrders) {
    try {
      await failOrderAndRevertInventory(order._id, 'Payment timeout');
      console.log(`Order ${order._id} auto-failed`);
    } catch (err) {
      console.error(`Failed to auto-fail order ${order._id}`, err);
    }
  }
});

const schedulePickup = async (req, res) => {
  const { shipmentId } = req.query
  try {

    const token = await getShiprocketToken();

    const pickupDate = dayjs()
      .add(1, "day")
      .format("YYYY-MM-DD");

    // console.log('pickupDate', pickupDate)


    const pickupRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
      {
        shipment_id: [shipmentId],
        pickup_date: [pickupDate]
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );



    // console.log("Pickup Scheduled:", pickupRes.data);
    res.send({ data: pickupRes.data })
  } catch (err) {
    console.error(
      "Pickup scheduling failed:",
      err.response?.data || err.message
    );
    throw err;
  }
};

// This is for cron job update 
const updateOrdersTrackingStatus = asyncHandler(async (req, res) => {
  try {
    const token = await getShiprocketToken();

    const orders = await Order.find({
      deliveryStatus: { $nin: ["Delivered", "Cancelled"] },
      "shipment.awb": { $exists: true }
    });

    for (const order of orders) {
      try {
        // if (
        //   order.shipment.lastTrackedAt &&
        //   Date.now() - new Date(order.shipment.lastTrackedAt).getTime() < SIX_HOURS
        // ) {
        //   continue;
        // }

        const response = await axios.get(
          `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${order.shipment.awb}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // console.log("response", response)

        const trackingData = response.data.tracking_data;
        const currentStatus = trackingData?.shipment_track?.[0]?.current_status;

        if (trackingData) {
          order.shipment.liveTrackingData = trackingData;
          order.shipment.status = currentStatus;
          order.shipment.lastTrackedAt = new Date();
          order.deliveryStatus = mapStatus(currentStatus);

          await order.save();
        }
      } catch (err) {
        console.error("Error updating order:", err.message);
        // console.error("Error updating order:", {
        //   orderId: order._id,
        //   awb: order.shipment?.awb,
        //   status: err.response?.status,
        //   data: err.response?.data,
        //   message: err.message,
        // });
      }
    }

    console.log("✅ Tracking cron finished");
  } catch (err) {
    console.error("Cron failed:", err.message);
  }
})

module.exports = {
  payment,
  getOrderFilter,
  getPendingOrders,
  getMonthlySales,
  getSalesDateRange,
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderDeliveryStatus,
  getMyOrders,
  getOrders,
  updateOrderToUnPaid,
  getFailedOnlineOrders,
  updateOrderToPaidAdmin,
  searchOrders,
  deleteOrder,
  getPendingOrdersPaginated,
  searchPendingOrders,
  searchFailedOrders,
  getWayBillNumberByOrder,
  getOrdersForDownload,
  getPendingOrdersForDownload,
  getFailedOnlineOrdersForDownload,
  verifyOrder,
  createOrder,
  createBatchOrders,
  verifyMultipleOrders,
  verifyOrdersByAdmin,
  schedulePickup,
  updateOrdersTrackingStatus
};
