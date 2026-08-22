const Product = require("../models/productModel");
const Inventory = require("../models/inventoryModel");
const RecentlyViewedProduct = require("../models/recentlyViewedProductModel");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const Order = require("../models/orderModel.js");
const FlashSale = require("../models/flashModel.js");
const mongoose = require("mongoose");

const attachRatingsToProducts = (products) => {
  return products.map((product) => {
    const reviews = product.reviews || [];
    const reviewsCount = reviews.length;

    const averageRating =
      reviewsCount > 0
        ? Number(
            (
              reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
            ).toFixed(1),
          )
        : 0;

    return {
      ...product,
      averageRating,
      reviewsCount,
    };
  });
};

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
    endTime: { $gte: now },
  }).lean();

  if (!flashSale) {
    return products.map((p) => ({
      ...p.toObject(),
      isFlash: false,
      flash: null,
    }));
  }

  let usedCount = 0;
  let isLimitExceeded = false;

  if (userId) {
    const usage = await FlashSaleUsage.findOne({
      user: userId,
      flashSale: flashSale._id,
    }).lean();

    usedCount = usage?.usedCount || 0;
    isLimitExceeded = usedCount >= flashSale.perUserLimit;
  }

  return products.map((product) => {
    let isFlash = false;

    if (!isLimitExceeded) {
      if (flashSale.scope === "ALL") {
        isFlash = true;
      } else if (flashSale.scope === "PRODUCTS") {
        isFlash = flashSale.products.some(
          (p) => p.toString() === product._id.toString(),
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
          remaining: Math.max(flashSale.perUserLimit - usedCount, 0),
        },
      }),
    };
  });
};

const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    description,
    variants,
    price,
    images,
    nutritionalInfo,
    productDetails,
    benefits,
    category,
    groupId,
    tags,
    length,
    width,
    height,
    isFeatured,
    isActive,
    metaTitle,
    metaDescription,
    metaKeywords,
    qty,
    shopByConcerns,
    discount,
    weight,
    packageWeight,
    ingredients,
    colorVariants,
    productCountInPackage,
    isCombo,
    sellingBadge,
    comboFlavours,
    journeyImage,
    faqs,
    teaBase,
    tasteProfile,
    caffeineLevel,
    cupsPerPack,
    brewingInstructions,
    servingSuggestion,
    bestTimeToDrink,
    productHighlights,
  } = req.body;

  // console.log('req.body', req.body)

  const product = await Product.create({
    name,
    slug,
    description,
    // ...(flora && { flora }),
    // ...(aroma && { aroma }),
    // ...(sweetness && { sweetness }),
    variants,
    price,
    images,
    nutritionalInfo,
    productDetails,
    benefits,
    length,
    width,
    height,
    category,
    features: tags,
    isFeatured,
    isActive,
    metaTitle,
    metaDescription,
    metaKeywords,
    groupId,
    shopByConcerns,
    discount,
    weight,
    packageWeight,
    ingredients,
    colorVariants,
    productCountInPackage,
    isCombo,
    sellingBadge,
    comboFlavours,
    journeyImage,
    faqs,
    teaBase,
    tasteProfile,
    caffeineLevel,
    cupsPerPack,
    brewingInstructions,
    servingSuggestion,
    bestTimeToDrink,
    productHighlights,
  });

  const inventory = await Inventory.create({
    product: product._id,
    quantity: qty || 0,
  });

  product.countInStock = inventory;
  await product.save();

  return res.status(201).json({
    message: "Product created successfully",
    product,
  });
});

// const getAllProduct = asyncHandler(async (req, res) => {
//   const {
//     search,
//     category,
//     isFeatured,
//     isActive,
//     pageNumber = 1,
//     pageSize = 20
//   } = req.query;

//   const filter = {
//     ...(isActive !== undefined && { isActive }),
//     ...(category && { category }),
//     ...(isFeatured !== undefined && { isFeatured }),
//     ...(search && { name: { $regex: search, $options: "i" } })
//   };

//   const products = await Product.find(filter)
//     .populate('category')
//     .populate('shopByConcerns')
//     .populate('countInStock')
//     .sort({ createdAt: -1 })
//     .skip((pageNumber - 1) * pageSize)
//     .limit(parseInt(pageSize));

//   const totalDocuments = await Product.countDocuments(filter);
//   const pageCount = Math.ceil(totalDocuments / pageSize);

//   res.status(200).json({
//     message: "Products retrieved successfully",
//     products,
//     pageCount
//   });
// });

const getAllProduct = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    isFeatured,
    isActive,
    shopByConcern,
    mostSelling,
    minPrice,
    maxPrice,
    pageNumber = 1,
    pageSize = 20,
  } = req.query;

  const filter = {
    isActive: true,
    ...(category && { category }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(shopByConcern && { shopByConcerns: shopByConcern }),
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  // console.log('req.query', req.query)

  if (minPrice || maxPrice) {
    filter.$or = [
      {
        price: {
          ...(minPrice && { $gte: Number(minPrice) }),
          ...(maxPrice && { $lte: Number(maxPrice) }),
        },
      },
      {
        "variants.price": {
          ...(minPrice && { $gte: Number(minPrice) }),
          ...(maxPrice && { $lte: Number(maxPrice) }),
        },
      },
    ];
  }

  if (mostSelling === "true") {
    const topSelling = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalSold: { $sum: "$orderItems.qty" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 50 },
    ]);

    const productIds = topSelling.map((p) => p._id);

    filter._id = { $in: productIds };
  }

  // -----------------------------
  // FETCH PRODUCTS
  // -----------------------------
  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  const productsWithFlash = await attachFlashSaleToProducts(products);

  res.status(200).json({
    message: "Products retrieved successfully",
    products: productsWithFlash,
    pageCount,
  });
});

const getAllProductForAdmin = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    isFeatured,
    isActive,
    pageNumber = 1,
    pageSize = 20,
  } = req.query;

  const filter = {
    isActive: true,
    ...(category && { category }),
    ...(isFeatured !== undefined && { isFeatured }),
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 });

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send(products);
});

// const getProducts = async (req, res) => {
//   try {
//     let { pageNumber = 1, search = "", filterType = "" } = req.query;
//     const limit = 10;
//     const skip = (pageNumber - 1) * limit;

//     let filter = {};
//     let sort = {};

//     // 1️⃣ SEARCH
//     if (search) {
//       filter.name = { $regex: search, $options: "i" };
//     }

//     // 2️⃣ FILTER SWITCH
//     switch (filterType) {
//       case "priceHighToLow":
//         sort = { price: -1 };
//         break;

//       case "priceLowToHigh":
//         sort = { price: 1 };
//         break;

//       case "quantityHighToLow":
//       case "quantityLowToHigh": {
//         let invSort = filterType === "quantityHighToLow" ? -1 : 1;

//         const inventoryList = await Inventory.find().sort({ quantity: invSort });

//         const sortedProductIds = inventoryList.map(i => i.product);

//         const products = await Product.find({
//           _id: { $in: sortedProductIds },
//           ...filter,
//         }).populate('category')

//         const orderedProducts = sortedProductIds
//           .map(id => products.find(p => p._id.toString() === id.toString()))
//           .filter(Boolean);

//         const pageProducts = orderedProducts.slice(skip, skip + limit);

//         return res.status(200).json({
//           products: pageProducts,
//           pageCount: Math.ceil(orderedProducts.length / limit),
//         });
//       }

//       // 4️⃣ HIGHEST SELLING SORT
//       case "highestSellingHighToLow":
//       case "highestSellingLowToHigh": {
//         let sellSort = filterType === "highestSellingHighToLow" ? -1 : 1;

//         const soldData = await Order.aggregate([
//           { $unwind: "$orderItems" },
//           {
//             $group: {
//               _id: "$orderItems.product",
//               totalSold: { $sum: "$orderItems.qty" },
//             },
//           },
//           { $sort: { totalSold: sellSort } },
//         ]);

//         const sortedIds = soldData.map(s => s._id);

//         const products = await Product.find({
//           _id: { $in: sortedIds },
//           ...filter
//         }).populate('category')

//         const orderedProducts = sortedIds
//           .map(id => products.find(p => p._id.toString() === id.toString()))
//           .filter(Boolean);

//         const pageProducts = orderedProducts.slice(skip, skip + limit);

//         return res.status(200).json({
//           products: pageProducts,
//           pageCount: Math.ceil(orderedProducts.length / limit),
//         });
//       }

//       default:
//         break;
//     }

//     // 5️⃣ NORMAL PRODUCT FETCH (no special sorting)
//     const products = await Product.find(filter)
//       .sort(sort)
//       .skip(skip)
//       .limit(limit);

//     const totalCount = await Product.countDocuments(filter);

//     return res.status(200).json({
//       products,
//       pageCount: Math.ceil(totalCount / limit),
//     });
//   } catch (error) {
//     console.error("Product fetch error:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const getProducts = async (req, res) => {
  try {
    let { pageNumber = 1, search = "", filterType = "" } = req.query;

    pageNumber = Number(pageNumber);
    const limit = 10;
    const skip = (pageNumber - 1) * limit;

    let filter = { isActive: true };
    let sort = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    switch (filterType) {
      case "priceHighToLow":
        sort = { price: -1 };
        break;

      case "priceLowToHigh":
        sort = { price: 1 };
        break;

      case "quantityHighToLow":
      case "quantityLowToHigh": {
        const invSort = filterType === "quantityHighToLow" ? -1 : 1;

        const inventoryList = await Inventory.find().sort({
          quantity: invSort,
        });

        const sortedProductIds = inventoryList.map((i) => i.product);

        const products = await Product.find({
          _id: { $in: sortedProductIds },
          ...filter,
        }).populate("category countInStock");

        const orderedProducts = sortedProductIds
          .map((id) => products.find((p) => p._id.toString() === id.toString()))
          .filter(Boolean);

        const pageProducts = orderedProducts.slice(skip, skip + limit);

        return res.status(200).json({
          products: pageProducts,
          pageCount: Math.ceil(orderedProducts.length / limit),
        });
      }

      case "highestSellingHighToLow":
      case "highestSellingLowToHigh": {
        const sellSort = filterType === "highestSellingHighToLow" ? -1 : 1;

        const soldData = await Order.aggregate([
          { $unwind: "$orderItems" },
          {
            $group: {
              _id: "$orderItems.product",
              totalSold: { $sum: "$orderItems.qty" },
            },
          },
          { $sort: { totalSold: sellSort } },
        ]);

        const sortedIds = soldData.map((s) => s._id);

        const products = await Product.find({
          _id: { $in: sortedIds },
          ...filter,
        }).populate("category");

        const orderedProducts = sortedIds
          .map((id) => products.find((p) => p._id.toString() === id.toString()))
          .filter(Boolean);

        const pageProducts = orderedProducts.slice(skip, skip + limit);

        return res.status(200).json({
          products: pageProducts,
          pageCount: Math.ceil(orderedProducts.length / limit),
        });
      }

      default:
        break;
    }

    const products = await Product.find(filter)
      .populate("category countInStock")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCount = await Product.countDocuments(filter);

    return res.status(200).json({
      products,
      pageCount: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { category, pageNumber, pageSize = 20 } = req.query;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const products = await Product.find({ category })
      .populate("category countInStock")
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    const totalDocuments = await Product.countDocuments({ category });
    const pageCount = Math.ceil(totalDocuments / pageSize);

    return res.status(200).json({
      products,
      pageCount,
      total: totalDocuments,
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getInactiveProducts = async (req, res) => {
  try {
    let { pageNumber = 1, search = "", filterType = "" } = req.query;

    pageNumber = Number(pageNumber);
    const limit = 10;
    const skip = (pageNumber - 1) * limit;

    let filter = {
      isActive: false,
    };
    let sort = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    switch (filterType) {
      case "priceHighToLow":
        sort = { price: -1 };
        break;

      case "priceLowToHigh":
        sort = { price: 1 };
        break;

      case "quantityHighToLow":
      case "quantityLowToHigh": {
        const invSort = filterType === "quantityHighToLow" ? -1 : 1;

        const inventoryList = await Inventory.find().sort({
          quantity: invSort,
        });

        const sortedProductIds = inventoryList.map((i) => i.product);

        const products = await Product.find({
          _id: { $in: sortedProductIds },
          ...filter,
        }).populate("category countInStock");

        const orderedProducts = sortedProductIds
          .map((id) => products.find((p) => p._id.toString() === id.toString()))
          .filter(Boolean);

        const pageProducts = orderedProducts.slice(skip, skip + limit);

        return res.status(200).json({
          products: pageProducts,
          pageCount: Math.ceil(orderedProducts.length / limit),
        });
      }

      case "highestSellingHighToLow":
      case "highestSellingLowToHigh": {
        const sellSort = filterType === "highestSellingHighToLow" ? -1 : 1;

        const soldData = await Order.aggregate([
          { $unwind: "$orderItems" },
          {
            $group: {
              _id: "$orderItems.product",
              totalSold: { $sum: "$orderItems.qty" },
            },
          },
          { $sort: { totalSold: sellSort } },
        ]);

        const sortedIds = soldData.map((s) => s._id);

        const products = await Product.find({
          _id: { $in: sortedIds },
          ...filter,
        }).populate("category");

        const orderedProducts = sortedIds
          .map((id) => products.find((p) => p._id.toString() === id.toString()))
          .filter(Boolean);

        const pageProducts = orderedProducts.slice(skip, skip + limit);

        return res.status(200).json({
          products: pageProducts,
          pageCount: Math.ceil(orderedProducts.length / limit),
        });
      }

      default:
        break;
    }

    const products = await Product.find(filter)
      .populate("category countInStock")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalCount = await Product.countDocuments(filter);

    return res.status(200).json({
      products,
      pageCount: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.isActive = false;
  await product.save();

  return res.status(200).json({
    message: "Product disabled successfully",
  });
});

const activeProduct = asyncHandler(async (req, res) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.isActive = true;
  await product.save();

  return res.status(200).json({
    message: "Product activated",
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.query;

  const product = await Product.findById(productId)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const [productWithFlash] = await attachFlashSaleToProducts([product]);

  return res.status(200).json({
    message: "Product retrieved successfully",
    product: productWithFlash,
  });
});

const getProductByVisualId = asyncHandler(async (req, res) => {
  const { visualId } = req.query;

  const product = await Product.findOne({ visualId })
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const [productWithFlash] = await attachFlashSaleToProducts([product]);

  return res.status(200).json({
    message: "Product retrieved successfully",
    product: productWithFlash,
  });
});

const searchProducts = asyncHandler(async (req, res) => {
  const { search, pageNumber = 1, pageSize = 20 } = req.query;

  // const filter = search
  //   ? { name: { $regex: search, $options: "i" } }
  //   : {};

  const filter = {
    isActive: true,
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  const productsWithFlash = await attachFlashSaleToProducts(products);

  res.status(200).json({
    message: "Search results fetched successfully",
    products: productsWithFlash,
    pageCount,
  });
});

const getProductInventory = asyncHandler(async (req, res) => {
  const { productId } = req.query;

  const inventory = await Inventory.findOne({ product: productId });

  return res.status(200).json({
    message: "Inventory fetched successfully",
    qty: inventory ? inventory.qty : 0,
  });
});

const toggleBestSellerProducts = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.isBestSeller = !product.isBestSeller;
  await product.save();

  res.status(200).json({
    message: "Best seller status toggled",
    isBestSeller: product.isBestSeller,
  });
});

const toggleNewArrivalProducts = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  product.isNewArrival = !product.isNewArrival;
  await product.save();

  res.status(200).json({
    message: "New arrival status toggled",
    isNewArrival: product.isNewArrival,
  });
});

const getBestSeller = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20, search } = req.query;

  const filter = {
    isActive: true,
    isBestSeller: true,
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  return res.status(200).json({
    message: "Best seller products retrieved successfully",
    products,
    pageCount,
  });
});

const getNewArrival = asyncHandler(async (req, res) => {
  const { pageNumber = 1, category, pageSize = 20, search } = req.query;

  const filter = {
    isActive: true,
    isNewArrival: true,
    ...(category && { category }),
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);
  const productsWithFlash = await attachFlashSaleToProducts(products);

  return res.status(200).json({
    message: "New arrival products retrieved successfully",
    products: productsWithFlash,
    pageCount,
  });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { pageNumber = 1, category, pageSize = 20, search } = req.query;

  const filter = {
    isActive: true,
    isFeatured: true,
    ...(category && { category }),
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);
  const productsWithFlash = await attachFlashSaleToProducts(products);

  return res.status(200).json({
    message: "New arrival products retrieved successfully",
    products: productsWithFlash,
    pageCount,
  });
});

const addItemInRecentlyViewed = asyncHandler(async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).send({ message: "User and Product are required" });
  }

  const existingItem = await RecentlyViewedProduct.findOne({
    user: userId,
    product: productId,
  });

  if (existingItem) {
    await RecentlyViewedProduct.findOneAndUpdate(
      { _id: existingItem._id },
      { $set: { viewAt: Date.now() } },
    );
  } else {
    await RecentlyViewedProduct.create({
      user: userId,
      product: productId,
    });

    const recentlyViewedItems = await RecentlyViewedProduct.find({
      user: userId,
    }).sort({ viewAt: -1 });
    if (recentlyViewedItems.length > 20) {
      const itemsToRemove = recentlyViewedItems.slice(20);
      const idsToRemove = itemsToRemove.map((item) => item._id);

      await RecentlyViewedProduct.deleteMany({ _id: { $in: idsToRemove } });
    }
  }

  res.status(200).send({
    message: "Product successfully added to recently viewed items",
  });
});

const getRecentlyViewedItems = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  const recentlyViewedItems = await RecentlyViewedProduct.find({
    user: userId,
  })
    .populate({
      path: "product",
      populate: [
        {
          path: "category",
        },
        {
          path: "countInStock",
        },
        {
          path: "shopByConcerns",
        },
      ],
    })
    .sort({
      viewAt: -1,
    });

  res.status(200).send({ recentlyViewedItems });
});

const deleteProductImage = asyncHandler(async (req, res) => {
  const { productId, imageURL } = req.query;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!product.images || product.images.length <= 1) {
    return res
      .status(400)
      .json({ message: "Product must have at least one image" });
  }

  product.images = product.images.filter((img) => img !== imageURL);
  await product.save();

  const fileName = imageURL.split("//")[1].split("/")[1];

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
  });

  await s3.send(command);

  return res.status(200).json({
    message: "Image deleted successfully",
    product,
  });
});

const searchBestSellerProducts = asyncHandler(async (req, res) => {
  const { search, pageNumber = 1, pageSize = 20 } = req.query;

  const filter = {
    isActive: true,
    isBestSeller: true,
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  const productsWithFlash = await attachFlashSaleToProducts(products);

  res.status(200).json({
    message: "Best seller search results fetched successfully",
    products: productsWithFlash,
    pageCount,
  });
});

const searchNewArrivalProducts = asyncHandler(async (req, res) => {
  const { search, pageNumber = 1, pageSize = 20 } = req.query;

  const filter = {
    isActive: true,
    isNewArrival: true,
    ...(search && { name: { $regex: search, $options: "i" } }),
  };

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(parseInt(pageSize));

  const totalDocuments = await Product.countDocuments(filter);
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).json({
    message: "New arrival search results fetched successfully",
    products,
    pageCount,
  });
});

const getAllProductsByStockSorting = asyncHandler(async (req, res) => {
  const { sort = "asc", pageNumber = 1, pageSize = 20 } = req.query;

  const sortOrder = sort === "desc" ? -1 : 1; // asc = low → high, desc = high → low

  const products = await Product.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventory",
      },
    },
    {
      $addFields: {
        stock: { $ifNull: [{ $arrayElemAt: ["$inventory.qty", 0] }, 0] },
      },
    },
    { $sort: { stock: sortOrder } },
    { $skip: (pageNumber - 1) * pageSize },
    { $limit: parseInt(pageSize) },
  ]);

  const totalDocuments = await Product.countDocuments();
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).json({
    message: "Products sorted by stock successfully",
    products,
    pageCount,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const {
    productId,
    groupId,
    name,
    slug,
    description,

    price,
    category,
    features,
    benefits,
    ingredients,
    metaKeywords,
    variants,
    shopByConcerns,
    discount,
    weight,
    packageWeight,
    quantity,
    isFeatured,
    isBestSeller,
    isNewArrival,
    colorVariants,
    productCountInPackage,
    nutritionalInfo,
    productDetails,
    images,
    isCombo,
    sellingBadge,
    comboFlavours,
    journeyImage,
    length,
    width,
    height,
    faqs,
    teaBase,
    tasteProfile,
    caffeineLevel,
    cupsPerPack,
    brewingInstructions,
    servingSuggestion,
    bestTimeToDrink,
    productHighlights,
  } = req.body;

  let product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (name) product.name = name;
  if (slug) product.slug = slug;
  if (description) product.description = description;

  if (price) product.price = price;
  if (category) product.category = category;

  if (features) product.features = features;
  if (benefits) product.benefits = benefits;
  if (metaKeywords) product.metaKeywords = metaKeywords;
  if (groupId) product.groupId = groupId;
  if (discount) product.discount = discount;
  if (weight) product.weight = weight;
  if (packageWeight) product.packageWeight = packageWeight;
  if (ingredients) product.ingredients = ingredients;
  if (colorVariants) product.colorVariants = colorVariants;
  if (productCountInPackage)
    product.productCountInPackage = productCountInPackage;
  if (nutritionalInfo) product.nutritionalInfo = nutritionalInfo;
  if (productDetails) product.productDetails = productDetails;
  if (journeyImage) product.journeyImage = journeyImage;
  if (length) product.length = length;
  if (width) product.width = width;
  if (height) product.height = height;
  if (faqs) product.faqs = faqs;
  if (sellingBadge) product.sellingBadge = sellingBadge;
  if (teaBase) product.teaBase = teaBase;
  if (tasteProfile) product.tasteProfile = tasteProfile;
  if (caffeineLevel) product.caffeineLevel = caffeineLevel;
  if (cupsPerPack) product.cupsPerPack = cupsPerPack;
  if (brewingInstructions) product.brewingInstructions = brewingInstructions;
  if (servingSuggestion) product.servingSuggestion = servingSuggestion;
  if (bestTimeToDrink) product.bestTimeToDrink = bestTimeToDrink;
  if (productHighlights) product.productHighlights = productHighlights;

  product.isCombo = isCombo || product.isCombo;
  product.comboFlavours = comboFlavours || product.comboFlavours;

  product.isBestSeller = isBestSeller;
  product.isNewArrival = isNewArrival;
  product.isFeatured = isFeatured;
  product.images = images;

  if (variants && Array.isArray(variants)) {
    product.variants = variants;
  }

  if (shopByConcerns && Array.isArray(shopByConcerns)) {
    product.shopByConcerns = shopByConcerns;
  }

  if (quantity) {
    const qty = Number(quantity);
    await Inventory.findOneAndUpdate({ product: productId }, { quantity: qty });
  }

  await product.save();

  res.status(200).json({
    message: "Product updated successfully",
    product,
  });
});

const getProductsByShopByConcern = asyncHandler(async (req, res) => {
  const {
    concerns = [],
    pageNumber = 1,
    pageSize = 20,
    minPrice,
    maxPrice,
    mostSelling,
  } = req.query;

  const concernList = Array.isArray(concerns) ? concerns : [concerns];

  const filter = {
    shopByConcerns: { $in: concernList },
  };

  if (minPrice || maxPrice) {
    filter.$or = [
      {
        price: {
          ...(minPrice && { $gte: Number(minPrice) }),
          ...(maxPrice && { $lte: Number(maxPrice) }),
        },
      },
      {
        "variants.price": {
          ...(minPrice && { $gte: Number(minPrice) }),
          ...(maxPrice && { $lte: Number(maxPrice) }),
        },
      },
    ];
  }

  if (mostSelling === "true") {
    const topSelling = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalSold: { $sum: "$orderItems.qty" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 50 },
    ]);

    const bestIds = topSelling.map((p) => p._id);
    filter._id = { $in: bestIds };
  }

  const [products, totalDocuments] = await Promise.all([
    Product.find(filter)
      .populate("category")
      .populate("shopByConcerns")
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(parseInt(pageSize)),

    Product.countDocuments(filter),
  ]);

  const pageCount = Math.ceil(totalDocuments / pageSize);
  const productsWithFlash = await attachFlashSaleToProducts(products);

  res.status(200).json({
    products: productsWithFlash,
    pageCount,
  });
});

const getProductsByGroupId = asyncHandler(async (req, res) => {
  const { groupId } = req.query;

  const products = await Product.find({ groupId, isActive: true })
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock");

  if (!products || products.length === 0) {
    return res.send({ message: "No Products found" });
  }

  const productsWithFlash = await attachFlashSaleToProducts(products);
  const productsWithRatings = attachRatingsToProducts(productsWithFlash);

  res.send({ products: productsWithRatings });
});

const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment, userId, productId, image } = req.body;
  // console.log("image", image)

  const product = await Product.findById(productId);
  const user = await User.findById(userId);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === user._id.toString(),
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

    const review = {
      name: user.firstName + " " + user.lastName || "Anonymous",
      rating: Number(rating),
      comment,
      image,
      user: userId,
    };
    // console.log("review", review)

    product.reviews.push(review);

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added", review });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

const getRelatedProductsByConcerns = asyncHandler(async (req, res) => {
  const { concernIds, excludeProductId, category } = req.body;

  if (!concernIds && !concernIds.length) {
    return res.status(200).json({
      message: "No concerns provided",
      products: [],
    });
  }

  const filter = {
    isActive: true,
    ...(category && { category }),
    shopByConcerns: { $in: concernIds },
  };

  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const products = await Product.find(filter)
    .limit(10)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock");

  res.status(200).json({
    message: "Related products retrieved successfully",
    products,
  });
});

const getRelatedProductsByCategory = asyncHandler(async (req, res) => {
  const { category, excludeProductId } = req.body;

  if (!category) {
    return res.status(200).json({
      message: "No category provided",
      products: [],
    });
  }

  const filter = {
    isActive: true,
    category: category,
  };

  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const products = await Product.find(filter)
    .limit(10)
    .populate("category")
    .populate("countInStock");

  res.status(200).json({
    message: "Related products retrieved successfully",
    products,
  });
});

// const getProductReviews = asyncHandler(async (req, res) => {
//   const { productId, pageNumber = 1, pageSize = 20 } = req.query

//   const product = await Product.findById(productId).select("reviews")

//   if (!product) {
//     res.status(404)
//     throw new Error("Product not found")
//   }

//   const totalReviews = product.reviews.length

//   const startIndex = (pageNumber - 1) * pageSize
//   const endIndex = startIndex + pageSize

//   const paginatedReviews = product.reviews
//     .sort((a, b) => b.createdAt - a.createdAt)
//     .slice(startIndex, endIndex)

//   const pageCount = Math.ceil(totalReviews / pageSize)

//   res.status(200).json({
//     reviews: paginatedReviews,
//     pageNumber,
//     pageCount,
//     totalReviews,
//   })
// })

const getProductReviews = asyncHandler(async (req, res) => {
  const { productId, pageNumber = 1, pageSize = 20 } = req.query;

  const product = await Product.findById(productId).select("reviews");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = product.reviews || [];
  const reviewsCount = reviews.length;

  let starCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalRating = 0;

  reviews.forEach((review) => {
    const rating = review.rating;
    if (rating >= 1 && rating <= 5) {
      starCounts[rating]++;
      totalRating += rating;
    }
  });

  const averageRating =
    reviewsCount > 0 ? (totalRating / reviewsCount).toFixed(1) : 0;

  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedReviews = reviews
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(startIndex, endIndex);

  const pageCount = Math.ceil(reviewsCount / pageSize);

  res.status(200).json({
    reviews: paginatedReviews,
    pageNumber: Number(pageNumber),
    pageCount,
    totalReviews: reviewsCount,

    reviewsCount,
    averageRating: Number(averageRating),
    oneStarCount: starCounts[1],
    twoStarCount: starCounts[2],
    threeStarCount: starCounts[3],
    fourStarCount: starCounts[4],
    fiveStarCount: starCounts[5],
  });
});

const getProductReviewsByGroupId = asyncHandler(async (req, res) => {
  const { groupId, pageNumber = 1, pageSize = 20 } = req.query;

  const product = await Product.find({ groupId }).select("reviews");
  if (!product || product.length === 0) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = product.flatMap((p) => p.reviews || []);
  const reviewsCount = reviews.length;

  let starCounts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalRating = 0;

  reviews.forEach((review) => {
    const rating = review.rating;
    if (rating >= 1 && rating <= 5) {
      starCounts[rating]++;
      totalRating += rating;
    }
  });

  const averageRating =
    reviewsCount > 0 ? (totalRating / reviewsCount).toFixed(1) : 0;

  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedReviews = reviews
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(startIndex, endIndex);

  const pageCount = Math.ceil(reviewsCount / pageSize);

  res.status(200).json({
    reviews: paginatedReviews,
    pageNumber: Number(pageNumber),
    pageCount,
    totalReviews: reviewsCount,
    reviewsCount,
    averageRating: Number(averageRating),
    oneStarCount: starCounts[1],
    twoStarCount: starCounts[2],
    threeStarCount: starCounts[3],
    fourStarCount: starCounts[4],
    fiveStarCount: starCounts[5],
  });
});

const hasPurchasedProduct = asyncHandler(async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    res.status(400);
    throw new Error("userId and productId are required");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(productId)
  ) {
    res.status(400);
    throw new Error("Invalid userId or productId");
  }

  const orderExists = await Order.exists({
    user: userId,
    orderItems: {
      $elemMatch: {
        product: productId,
      },
    },
  });

  res.status(200).json({
    success: true,
    hasPurchased: Boolean(orderExists),
  });
});

module.exports = {
  createProduct,
  updateProduct,
  getAllProduct,
  deleteProduct,
  getProductById,
  getProductInventory,
  toggleBestSellerProducts,
  toggleNewArrivalProducts,
  getBestSeller,
  getNewArrival,
  addItemInRecentlyViewed,
  getRecentlyViewedItems,
  deleteProductImage,
  searchBestSellerProducts,
  searchNewArrivalProducts,
  getAllProductsByStockSorting,
  searchProducts,
  getProductsByShopByConcern,
  getProductsByGroupId,
  createProductReview,
  getProductByVisualId,
  getAllProductForAdmin,
  getProducts,
  getProductsByCategory,
  getRelatedProductsByConcerns,
  getProductReviews,
  getProductReviewsByGroupId,
  hasPurchasedProduct,
  getInactiveProducts,
  getFeaturedProducts,
  activeProduct,
  getRelatedProductsByCategory
};
