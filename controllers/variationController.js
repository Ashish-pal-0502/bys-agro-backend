const asyncHandler = require("express-async-handler");
const {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const SubCategory = require("../models/subCategoryModel");
const Banner = require("../models/carouselModel");
const Coupon = require("../models/couponModel");
const BottomBanner = require("../models/bottomBannerModel");
const MobileBanner = require("../models/mobileBannerModel.js")

const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};
const s3 = new S3Client(config);

// Ecom Category
const createCategory = asyncHandler(async (req, res) => {
  const { name, banner, image } = req.body;
  const id = name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
  const ecomCategory = Category.create({
    _id: id,
    name,
    banner,
    image,
  });
  if (ecomCategory) {
    res.status(201).json(ecomCategory);
  } else {
    res.status(404);
    throw new Error("Error");
  }
});
const updateCategory = asyncHandler(async (req, res) => {
  const { id, name, banner, image } = req.body;
  const ecomCategory = await Category.findById(id);
 
  if (ecomCategory) {
    ecomCategory.name = name;
    ecomCategory.banner = banner ? banner : ecomCategory.banner;
    ecomCategory.image = image ? image : ecomCategory.image;
    const updatedCategory = await ecomCategory.save();

    res.json(updatedCategory);
  } else {
    res.status(404);
    throw new Error("Category not found");
  }
});
const deleteCategory = asyncHandler(async (req, res) => {
  const subid = req.query.id;
  const sub = await Category.findById(subid);
  
  if(!sub) {
    return  res.status(400).send({ message: 'Category not found' })
  }

  const f1 = sub.image;
  
  if (f1) {
    const fileName = f1.split("//")[1].split("/")[1];

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
    });
    const response = await s3.send(command);
   
  }



  const products = await Product.find({ category: sub._id} )
 
  if(products.length > 0) {
    return res.status(400).send({status: false, message: "Delete all Products of this category first"})
  }
  const subcategories = await SubCategory.find({ category: sub._id })
 
  if(subcategories.length > 0) {
    return res.status(400).send({status: false, message: 'Delete SubCategories First'})
  }
 
  await Category.deleteOne({ _id: req.query.id });
  res.json("deleted");
});

const getAllCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json({ categories });
});

const getAllCategoryForAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.query.categoryId })

  res.send({ category })
})

const getAllCategoryPaginationApplied = asyncHandler(async (req, res) => {
  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 20

  const [categories, totalCategories ] = await Promise.all([
    Category.find({}).skip((pageNumber - 1) * pageSize).limit(pageSize),
    Category.countDocuments({})
  ])

  const pageCount = Math.ceil(totalCategories/pageSize)

  res.status(200).send({ categories, pageCount })
})

const getSubCategoryByCategory = asyncHandler(async (req, res) => {
  const catId = req.query.catId;

  const subcategory = await SubCategory.find({ category: catId });

  res.json(subcategory);
});

//Sub category

const createSubCategory = asyncHandler(async (req, res) => {
  const { name, category, image } = req.body;
  const id = name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
  const ecomCategory = SubCategory.create({
    _id: id,
    name,
    category,
    image,
  });
  if (ecomCategory) {
    res.status(201).json(ecomCategory);
  } else {
    res.status(404);
    throw new Error("Error");
  }
});
const updateSubCategory = asyncHandler(async (req, res) => {
  const { id, name, category, image } = req.body;
  const ecomCategory = await SubCategory.findById(id);
  if (ecomCategory) {
    ecomCategory.name = name;
    ecomCategory.category = category;
    ecomCategory.image = image ? image : ecomCategory.image;
    const updatedCategory = await ecomCategory.save();

    res.json(updatedCategory);
  } else {
    res.status(404);
    throw new Error("Category not found");
  }
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  const subid = req.query.id;
  const sub = await SubCategory.findById(subid);

  if(!sub) {
    return res.status(400).send({ message: 'SubCategory not found' })
  }

  const f1 = sub.image;

  if (f1) {
    const fileName = f1.split("//")[1].split("/")[1];

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
    });
    const response = await s3.send(command);
    
  }
  //   await Product.deleteMany({subcategory: req.query.id})

  const products = await Product.find({subcategory: sub._id})
  if(products.length > 0) {
    return res.status(400).send({status: false, message: "Delete all Products of this subcategory first"})
  }

  
  await SubCategory.deleteOne({ _id: req.query.id });
  res.json("deleted");
});

const getAllSubCategory = asyncHandler(async (req, res) => {
  const categories = await SubCategory.find({});
  res.json(categories);
});

const getAllSubCategoryPaginationApplied = asyncHandler(async(req, res) => {
  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const totalDocuments = await SubCategory.countDocuments({})

  const pageCount = Math.ceil(totalDocuments/pageSize)
  const subcategories = await SubCategory.find({}).skip((pageNumber - 1) * pageSize).limit(pageSize)
  return res.status(200).send({status: true, categories: subcategories, pageCount})
})



const createBanner = asyncHandler(async (req, res) => {
  const { image, product, category, concern } = req.body;
  // console.log('req.body', req.body)

  const banner = await Banner.create({
    image,
    category,
    product,
    concern
  });

  if (banner) {
    res.status(201).json(banner);
  } else {
    res.status(404);
    throw new Error("Error");
  }
});

const updateBanner = asyncHandler(async (req, res) => {
  const { id, image, product, category, concern } = req.body;
  // console.log('req.body', req.body)
  
  const banner = await Banner.findById(id)

  if(!banner) {
    return res.status(400).send({ message: "Banner not found" })
  }

  banner.image = image
  banner.product = product
  banner.category = category
  banner.concern = concern

  await banner.save()

  res.send({ message: "Banner updated" })

});

const updateMobileBanner = asyncHandler(async (req, res) => {
  const { id, image, product, category, concern } = req.body;
  // console.log('req.body', req.body)
  
  const banner = await MobileBanner.findById(id)

  if(!banner) {
    return res.status(400).send({ message: "Banner not found" })
  }

  banner.image = image
  banner.product = product
  banner.category = category
  banner.concern = concern

  await banner.save()

  res.send({ message: "Banner updated" })

});


const getBanner = asyncHandler(async (req, res) => {
  const banners = await Banner.find({}).populate('category product concern')

  if(!banners || banners.length === 0) {
    return res.status(400).send({ message: "No Banners found" })
  }

  res.status(200).send({ banners })
  
});

const getBannerPaginationApplied = asyncHandler(async (req, res) => {

  const { pageNumber = 1, pageSize = 20 } = req.query

  const [banners, totalDocuments ] = await Promise.all([ 
    Banner.find({}).sort({ createdAt: -1 }).skip((pageNumber  - 1) * pageSize).limit(pageSize),
    Banner.countDocuments({})
   ])
 
  const pageCount = Math.ceil(totalDocuments/pageSize)
  res.status(200).send({banners , pageCount})
})


const deleteBanner = asyncHandler(async (req, res) => {
  const subid = req.query.id;
  const sub = await Banner.findById(subid);

  const f1 = sub.image;
  const fileName = f1.split("//")[1].split("/")[1];
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
  });
  const response = await s3.send(command);
   
  await Banner.deleteOne({ _id: req.query.id });
  res.json({ message: "Banner Deleted" });
});

const searchCategory = asyncHandler(async (req, res) => {
  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 1
  const totalDocuments = await  Category.countDocuments({
    $or: [
      { name: { $regex: req.query.Query, $options: "i" } },
      { _id: req.query.Query }  
    ]
  })

  const pageCount = Math.ceil(totalDocuments/pageSize)

  const categories = await Category.find({
    $or: [
      { name: { $regex: req.query.Query, $options: "i" } },
      { _id: req.query.Query }  
    ]
  }).skip((pageNumber - 1) * pageSize).limit(pageSize)
  
  if (!categories || categories.length === 0) {
    return res.status(404).json({ message: "No categories found" });
  }
  
  res.status(200).json({categories, pageCount});
})

const searchSubCategory = asyncHandler(async (req, res) => {
  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 1
  const totalDocuments =  await SubCategory.countDocuments({
    $or: [
      { name: { $regex: req.query.Query, $options: "i" } },
      { _id: req.query.Query },
      { category: { $regex: req.query.Query, $options: "i" } }
    ]
  })

  const pageCount = Math.ceil(totalDocuments/pageSize)

  const subCategories = await SubCategory.find({
    $or: [
      { name: { $regex: req.query.Query, $options: "i" } },
      { _id: req.query.Query },
      { category: { $regex: req.query.Query, $options: "i" } }
    ]
  }).skip((pageNumber -1) * pageSize).limit(pageSize)
  
  if (!subCategories || subCategories.length === 0) {
    return res.status(404).json({ message: "No subcategories found" });
  }
  
  res.status(200).json({categories: subCategories, pageCount});
  
})




const searchCoupons = asyncHandler(async (req, res) => {
  
  const query = req.query.Query || "";
  const pageSize = 30;
  const page = Number(req.query.pageNumber) || 1;
  
  const matchCriteria = {
    $or: [
      { name: { $regex: query, $options: "i" } }
    ],
  };

  const count = await Coupon.countDocuments(matchCriteria);
  const pageCount = Math.ceil(count / pageSize);
 
  const coupons = await Coupon.find(matchCriteria)
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt: -1 });
   
  if (!coupons || coupons.length === 0) {
    return res.status(404).json({ message: "No coupons found" });
  }
 
  res.status(200).json({
    coupons,
    pageCount,
  });
});


const createBottomBanner = asyncHandler(async (req, res) => {
  const { title, image } = req.body

  if(!title || !image) {
    return res.status(400).send({ message: 'No Title or Image Found' })
  }

  await BottomBanner.create({
    title,
    image
  })

  res.status(200).send({ message: 'Bottom Banner created successfully' })
})

const updateBottomBanner = asyncHandler(async (req, res) => {
  const { id, title, image } = req.body

  const bottomBanner = await BottomBanner.findOne({ _id: id })

  if(!bottomBanner) {
    return res.status(400).send({ message: "Bottom Banner not found" })
  }

  bottomBanner.title = title
  bottomBanner.image = image

  await bottomBanner.save()

  res.send({ message: "Bottom Banner Update" })

})

const listBottomBanners = asyncHandler(async (req, res) => {

  const banners = await BottomBanner.find({})
  if(!banners) {
    return res.status(400).send({ message: 'Banner not found' })
  }
  res.status(200).send({ message: 'Bottom Banner created successfully', banners })
})

const deleteBottomBanner = asyncHandler(async (req, res) => {
    const { id } = req.query
    // console.log(req.query)
    const bottomBanner =  await BottomBanner.findOneAndDelete({ _id: id })
    if(!bottomBanner) {
      return res.status(400).send({ message: 'Banner not found' })
    }

    res.status(200).send({ banner: bottomBanner })
})


// const createMobileBanner = asyncHandler(async (req, res) => {
//   const { title, image } = req.body

//   if(!title || !image) {
//     return res.status(400).send({ message: 'No Title or Image Found' })
//   }

//   await MobileBanner.create({
//     title,
//     image
//   })

//   res.status(200).send({ message: 'Mobile Banner created successfully' })
// })

// const listMobileBanners = asyncHandler(async (req, res) => {

//   const banners = await MobileBanner.find({})
//   if(!banners) {
//     return res.status(400).send({ message: 'Banner not found' })
//   }
//   res.status(200).send({ message: 'Mobile Banner created successfully', banners })
// })

// const deleteMobileBanner = asyncHandler(async (req, res) => {
//     const { id } = req.query
    
//     const mobileBanner =  await MobileBanner.findOneAndDelete({ _id: id })
//     if(!mobileBanner) {
//       return res.status(400).send({ message: 'Banner not found' })
//     }

//     res.status(200).send({ banner: mobileBanner })
// })


const createMobileBanner = asyncHandler(async (req, res) => {
 const { image, product, category, concern } = req.body;
  // console.log('req.body', req.body)

  const banner = await MobileBanner.create({
    image,
    category,
    product,
    concern
  });

  if (banner) {
    res.status(201).json(banner);
  } else {
    res.status(404);
    throw new Error("Error");
  }
});

const getMobileBanner = asyncHandler(async (req, res) => {
  const s = await MobileBanner.find({});
  if (s) {
    res.json(s);
  } else {
    res.status(404);
    throw new Error("Error");
  }
});

const getMobileBannerPaginationApplied = asyncHandler(async (req, res) => {
  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const totalDocuments = await MobileBanner.countDocuments({})
  
  const pageCount = Math.ceil(totalDocuments/pageSize)
  const banner = await MobileBanner.find({}).populate('category product concern').skip((pageNumber  - 1) * pageSize).limit(pageSize)
  res.status(200).send({banner, pageCount})
})


const deleteMobileBanner = asyncHandler(async (req, res) => {
  // console.log('del')
  const subid = req.query.id;
  const sub = await MobileBanner.findById(subid);

  const f1 = sub.image;
  const fileName = f1.split("//")[1].split("/")[1];
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
  });
  const response = await s3.send(command);
   
  await MobileBanner.deleteOne({ _id: req.query.id });
  res.json("deleted");
});



module.exports = {
  createBanner,
  getBanner,
  deleteBanner,
  getAllCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
  getAllSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryByCategory,
  getAllCategoryPaginationApplied,
  getAllSubCategoryPaginationApplied,
  searchCategory,
  searchSubCategory,
  getBannerPaginationApplied,
  searchCoupons,
  createBottomBanner,
  listBottomBanners,
  deleteBottomBanner,
  createMobileBanner,
  getMobileBanner,
  getMobileBannerPaginationApplied,
  deleteMobileBanner,
  getAllCategoryForAdmin,
  updateBanner,
  updateBottomBanner,
  updateMobileBanner
};
