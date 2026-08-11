const asyncHandler = require('express-async-handler')
const FlashSale = require('../models/flashModel')
const Product = require('../models/productModel')

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



const createFlashSale = asyncHandler(async (req, res) => {
  const {
    name,
    discountType,
    discountValue,
    startTime,
    endTime,
    perUserLimit = 1
  } = req.body;

  if (!name || !discountType || !discountValue || !startTime || !endTime) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  await FlashSale.updateMany(
    { isActive: true },
    { $set: { isActive: false } }
  );

  const flashSale = await FlashSale.create({
    name,
    discountType,
    discountValue,
    startTime,
    endTime,
    perUserLimit,
    isActive: true
  });

  res.status(201).json(flashSale);
});


const getFlashSales = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const [flashSales, totalDocuments] = await Promise.all([
    FlashSale.find({})
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(parseInt(pageSize)),
    FlashSale.countDocuments({})
  ]);

  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).json({ flashSales, pageCount });
});

const getFlashSaleProducts = asyncHandler(async (req, res) => {
  const {pageNumber = 1, pageSize = 20} = req.query

  const now = new Date()

  const flashSale = await FlashSale.findOne({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now }
  })

  if(!flashSale) {
     return res.status(400).send({ status: false, message: "Flash Sale not running" })
  }

  let query 
  if(flashSale.scope == 'ALL') {
    query = {}
  } else {
    query = { _id: {  $in: flashSale.products }  }
  }
  const products = await Product.find(query).skip((pageNumber - 1) * pageSize).limit(pageSize)
  const totalDocuments = await Product.countDocuments(query)
  const productsWithFlash = await attachFlashSaleToProducts(products);
  const pageCount = Math.ceil(totalDocuments/pageSize)

  res.send({ status: true, products: productsWithFlash, pageCount })
})


const getActiveFlashSale = asyncHandler(async (req, res) => {
  const now = new Date();

  const activeFlashSale = await FlashSale.findOne({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now }
  });

  if (!activeFlashSale) {
    return res.status(404).json({ message: "No active flash sale" });
  }

  res.status(200).json(activeFlashSale);
});


const deleteFlashSale = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) return res.status(400).json({ message: "Flash sale id is required" });

  const flashSale = await FlashSale.findOneAndDelete({ _id: id });

  if (!flashSale) {
    return res.status(404).json({ message: "Flash sale not found" });
  }

  res.status(200).json({ flashSale });
});


const updateFlashSale = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) return res.status(400).json({ message: "Flash sale id is required" });

  const flashSale = await FlashSale.findById(id);
  if (!flashSale) return res.status(404).json({ message: "Flash sale not found" });

  const { name, discountType, discountValue, startTime, endTime, perUserLimit, isActive, scope, products = [] } = req.body;
  if (name !== undefined) flashSale.name = name;
  if (discountType !== undefined) flashSale.discountType = discountType;
  if (discountValue !== undefined) flashSale.discountValue = discountValue;
  if (startTime !== undefined) flashSale.startTime = startTime;
  if (endTime !== undefined) flashSale.endTime = endTime;
  if (perUserLimit !== undefined) flashSale.perUserLimit = perUserLimit;
  if (isActive !== undefined) flashSale.isActive = isActive;
  if( scope ) flashSale.scope = scope
  if (products) flashSale.products = products

  await flashSale.save();

  res.status(200).json(flashSale);
});


const updateFlashSaleStatus = asyncHandler(async (req, res) => {
  const { id, isActive } = req.body;

  if (!id || typeof isActive !== "boolean") {
    res.status(400);
    throw new Error("Invalid request data");
  }

  // Ensure flash sale exists
  const flashSale = await FlashSale.findById(id);

  if (!flashSale) {
    res.status(404);
    throw new Error("Flash sale not found");
  }

  // If activating this flash sale → deactivate all others
  if (isActive === true) {
    await FlashSale.updateMany(
      { _id: { $ne: id } },
      { isActive: false }
    );
  }

  flashSale.isActive = isActive;
  await flashSale.save();

  res.status(200).json({
    success: true,
    message: isActive
      ? "Flash sale activated successfully"
      : "Flash sale deactivated successfully",
    flashSale,
  });
});

module.exports = {
    createFlashSale,
    getFlashSales,
    getActiveFlashSale,
    deleteFlashSale,
    updateFlashSale,
    getFlashSaleProducts,
    updateFlashSaleStatus
}