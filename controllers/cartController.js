const asyncHandler = require("express-async-handler");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const FlashSale = require('../models/flashModel')
const Inventory = require('../models/inventoryModel')
const User = require('../models/userModel')
const LinkedOffer = require('../models/linkedOfferModel')
// const attachFlashSaleToProducts = async (products) => {
//   const now = new Date();

// const flashSale = await FlashSale.findOne({
//   isActive: true,
//   startTime: { $lte: now },
//   endTime: { $gte: now }
// }).lean();

// console.log('flashSale', flashSale)

// const productsWithFlash = products.map(product => {
//   let isFlash = false;

//   if (flashSale) {
//     if (flashSale.scope === "ALL") {
//       isFlash = true;
//     } else if (flashSale.scope === "PRODUCTS") {
//       isFlash = flashSale.products.some(p => p.toString() === product._id.toString());
//     }
//   }

//   return {
//     ...product.toObject(),
//     isFlash,
//     flash: isFlash ? flashSale : null
//   };
// });

// return productsWithFlash

// };

const attachFlashSaleToProducts = async (products, userId = null) => {
  const now = new Date();

  const flashSale = await FlashSale.findOne({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now }
  }).lean();

  if (!flashSale) {
    return products.map(p => ({
      ...p.toObject(),
      isFlash: false,
      flash: null
    }));
  }

  let usedCount = 0;
  let isLimitExceeded = false;

  if (userId) {
    const usage = await FlashSaleUsage.findOne({
      user: userId,
      flashSale: flashSale._id
    }).lean();

    usedCount = usage?.usedCount || 0;
    isLimitExceeded = usedCount >= flashSale.perUserLimit;
  }

  return products.map(product => {
    let isFlash = false;

    if (!isLimitExceeded) {
      if (flashSale.scope === "ALL") {
        isFlash = true;
      } else if (flashSale.scope === "PRODUCTS") {
        isFlash = flashSale.products.some(
          p => p.toString() === product._id.toString()
        );
      }
    }

    return {
      ...product.toObject(),
      isFlash,
      flash: isFlash ? flashSale : null,

      ...(userId && {
        flashUsage: {
          used: usedCount,
          limit: flashSale.perUserLimit,
          remaining: Math.max(flashSale.perUserLimit - usedCount, 0)
        }
      })
    };
  });
};



const addToCart = asyncHandler(async (req, res) => {
  const { userId, item, type } = req.body;

  if (!userId || !item || !item.product || !item.qty) {
    return res.status(400).send({ message: "userId and item {product, qty} required" });
  }

  const productExists = await Product.findById(item.product);
  if (!productExists) {
    return res.status(404).send({ message: "Product not found" });
  }

  const existing = await Cart.findOne({ user: userId, product: item.product });

  const quantityChange = type === "decrement" ? -item.qty : item.qty;

  if (existing) {
    existing.quantity += quantityChange;

    if (existing.quantity <= 0) {
      await existing.deleteOne();
      return res.json({ message: "Item removed from cart" });
    }

    await existing.save();
    return res.json(existing);
  }

  if (quantityChange <= 0) {
    return res.status(400).send({ message: "Quantity must be greater than 0 for new items" });
  }

  const newItem = await Cart.create({
    user: userId,
    product: item.product,
    quantity: quantityChange,
  });

  res.json({
    message: "Cart Updated",
    item: newItem
  });
});


// const getUserCart = asyncHandler(async (req, res) => {
//   const { userId } = req.query;

//   if (!userId) {
//     return res.status(400).send({ message: "userId required" });
//   }



//   const cart = await Cart.find({ user: userId }).populate({
//     path: 'product',
//     model: 'Product',
//     populate:{
//       path:'countInStock'
//     }
//   });


//   res.json(cart);
// });



// const getUserCart = asyncHandler(async (req, res) => {
//   const { userId } = req.query;

//   if (!userId) {
//     return res.status(400).json({ message: "userId required" });
//   }

//   const cart = await Cart.find({ user: userId })
//     .populate({
//       path: "product",
//       model: "Product",
//       populate: {
//         path: "countInStock"
//       }
//     });

//   const validCart = cart.filter(item => item && item.product);

//   const products = validCart.map(item => item.product);

//   const productsWithFlash = await attachFlashSaleToProducts(products);

//   const cartWithFlash = validCart.map((item, index) => ({
//     ...item.toObject(),
//     product: productsWithFlash[index]
//   }));

//   res.json(cartWithFlash);
// });

const getUserCart = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId required" });
  }

  const cartItems = await Cart.find({ user: userId })
    .populate({
      path: "product",
      model: "Product",
      populate: {
        path: "countInStock"
      }
    })
    .populate("linkedVia.linkedOfferId", "discountValue discountType");

  const user = await User.findOne({ _id: userId })

  const validCart = [];
  const removedItems = [];

  for (const item of cartItems) {
    if (!item || !item.product) {
      await Cart.findByIdAndDelete(item?._id);
      continue;
    }

    const inventory = await Inventory.findOne({
      product: item.product._id
    });

    const availableQty = inventory?.quantity ?? 0;

    if (availableQty === 0) {
      await Cart.findByIdAndDelete(item._id);
      removedItems.push({
        productId: item.product._id,
        reason: "Out of stock"
      });
      continue;
    }

    if (item.quantity > availableQty) {
      item.quantity = availableQty;
      await item.save();
    }

    validCart.push(item);
  }

  const products = validCart.map(item => item.product);
  const productsWithFlash = await attachFlashSaleToProducts(products);

  const cartWithFlash = validCart.map((item, index) => ({
    ...item.toObject(),
    product: productsWithFlash[index]
  }));

  res.json({
    cart: cartWithFlash,
    removedItems,
    user
  });
});


const removeFromCart = asyncHandler(async (req, res) => {
  const { cartItemId } = req.query;

  const item = await Cart.findById(cartItemId);
  if (!item) {
    return res.status(404).send({ message: "Cart item not found" });
  }

  await Cart.deleteOne({ _id: cartItemId });
  res.json({ message: "Item removed" });
});

const clearCart = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send({ message: "userId required" });
  }

  await Cart.deleteMany({ user: userId });
  res.json({ message: "Cart cleared" });
});


const clearCartInternally = asyncHandler(async (userId) => {

  await Cart.deleteMany({ user: userId });
  return

});

const addLinkedItemToCart = asyncHandler(async (req, res) => {
  const { userId, linkedProductId, parentProductId, linkedOfferId, quantity = 1 } = req.body;
  
  const offer = await LinkedOffer.findOne({
    _id: linkedOfferId,
    parentProduct: parentProductId,
    linkedProduct: linkedProductId,
    isActive: true,
  });

  if (!offer) {
    return res.status(400).json({ message: "Linked offer is not valid or has expired." });
  }

  // Verify parent product is actually in this user's cart
  const parentInCart = await Cart.findOne({
    user: userId,
    product: parentProductId
  });

  if (!parentInCart) {
    return res.status(400).json({ message: "You're almost there! Add the required product to your cart to use this offer." });
  }

  // Check if this exact linked item (via this offer) already exists
  const existingLinkedItem = await Cart.findOne({
    user: userId,
    product: linkedProductId,
    "linkedVia.linkedOfferId": linkedOfferId
  });

  if (existingLinkedItem) {
    existingLinkedItem.quantity += quantity;
    await existingLinkedItem.save();
    return res.status(200).json({ message: "Cart updated", cartItem: existingLinkedItem });
  }

  // Create a new cart item WITH linkedVia set
  const cartItem = await Cart.create({
    user: userId,
    product: linkedProductId,
    quantity,
    linkedVia: {
      parentProductId,
      linkedOfferId
    }
  });

  return res.status(201).json({ message: "Cart updated", cartItem });
});

const applyLinkedDiscountsToCart = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const cartItems = await Cart.find({ user: userId }).populate("product", "name price discount");

  // let subtotal = 0;
  let totalMRP = 0;
  let totalComboDiscount = 0;
  let totalMRPDiscount = 0;

  for (const item of cartItems) {
    totalMRP += item.product.price * item.quantity;
    let finalPrice = item.product.price;
    totalMRPDiscount += item.product.price * (item.product.discount / 100) * item.quantity;

    if (item.linkedVia?.linkedOfferId) {
      const parentExists = cartItems.some(
        cartItem => cartItem.product._id.toString() === item.linkedVia.parentProductId?.toString()
      );
      
      if (!parentExists) {
        item.linkedVia = undefined;
        await item.save();
        continue;
      } else {
        const offer = await LinkedOffer.findById(item.linkedVia.linkedOfferId);
        const now = new Date();
        const isActive = offer && offer.isActive &&
          (!offer.startDate || offer.startDate <= now) &&
          (!offer.endDate || offer.endDate >= now);
        // revoking offer if inactive
        if (!isActive) {
          item.linkedVia = undefined;
          await item.save();
        } else {
          if (offer.discountType === "percentage") {
            const discount = finalPrice * (offer.discountValue / 100);
            finalPrice -= discount;
            totalComboDiscount += discount * item.quantity;
          }
          if (offer.discountType === "flat") {
            finalPrice -= offer.discountValue;
            totalComboDiscount += offer.discountValue * item.quantity;
          }
        }
      }
    }
    // subtotal += finalPrice * item.quantity;
  }

  const grandTotal = totalMRP - totalComboDiscount - totalMRPDiscount;

  return res.status(200).json({
    cart: cartItems,
    // subtotal,
    totalMRP,
    totalComboDiscount,
    totalMRPDiscount,
    grandTotal
  });
})

module.exports = {
  addToCart,
  getUserCart,
  removeFromCart,
  clearCart,
  clearCartInternally,
  addLinkedItemToCart,
  applyLinkedDiscountsToCart,
}