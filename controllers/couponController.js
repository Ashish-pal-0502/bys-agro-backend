const asyncHandler = require("express-async-handler");
const Coupon = require("../models/couponModel.js");

const createCoupon = asyncHandler(async (req, res) => {
  const { name, type, discount, maxDiscount, flatDiscount, limit, usedBy } = req.body;

  if (!["Percentage", "Flat"].includes(type)) {
    return res.status(400).send({ message: "Invalid type" });
  }

  if (type === "Flat") {
    if (flatDiscount == null) {
      return res.status(400).send({ message: "Flat discount is required" });
    }

    if (flatDiscount < 0) {
      return res.status(400).send({ message: "Flat discount cannot be negative" });
    }
  }

  if (type === "Percentage") {
    if (discount == null) {
      return res.status(400).send({ message: "Discount is required" });
    }

    if (discount < 0 || discount > 100) {
      return res.status(400).send({ message: "Discount must be between 0 and 100" });
    }

    if (maxDiscount != null && maxDiscount < 0) {
      return res.status(400).send({ message: "Max discount cannot be negative" });
    }
  }

  const coupon = await Coupon.create({ name, type, discount, maxDiscount, flatDiscount, limit, usedBy });

  res.json({
    message: "Coupon created",
    coupon
  });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const {
    couponId,
    name,
    type,
    discount,
    maxDiscount,
    flatDiscount,
    limit,
    usedBy,
  } = req.body;
 
  const coupon = await Coupon.findById(couponId);
 
  if (!coupon) {
    return res.status(400).send({ message: "Coupon not found" });
  }
 
  // Update common fields
  if (name !== undefined) coupon.name = name;
  if (limit !== undefined) coupon.limit = limit;
  if (type !== undefined) coupon.type = type;
 
  // Handle type-based updates
  if (type === "Percentage") {
    coupon.discount = discount;
    coupon.maxDiscount = maxDiscount ?? undefined;
    coupon.flatDiscount = undefined;
  }
 
  if (type === "Flat") {
    coupon.flatDiscount = flatDiscount;
    coupon.discount = undefined;
    coupon.maxDiscount = undefined;
  }
 
  if (usedBy !== undefined) coupon.usedBy = usedBy;
 
  await coupon.save();
 
  res.json({
    message: "Coupon Updated Successfully",
    coupon,
  });
});



const getCouponById = asyncHandler(async (req, res) => {

  const coupon = await Coupon.findById(req.query.couponId)

  if (!coupon) {
    return res.status(400).send({ message: "Coupon not found" })
  }

  res.json({
    message: "Coupon found",
    coupon
  });

});

const getCoupon = asyncHandler(async (req, res) => {

  const coupons = await Coupon.find({})

  if (!coupons || coupons.length === 0) {
    return res.status(400).send({ message: "No Coupons found" })
  }

  res.json({ coupons });
});

const getCouponPaginationApplied = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  const [coupons, totalDocuments] = await Promise.all([
    Coupon.find({}).skip((pageNumber - 1) * pageSize).limit(pageSize),
    Coupon.countDocuments({})
  ])


  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.status(200).send({ coupons, pageCount })
})

const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.query
  // console.log("couponId", couponId)
  await Coupon.findOneAndDelete({ _id: couponId })

  res.json({ message: "Coupon Deleted" });
});


const couponUsed = asyncHandler(async (req, res) => {
  const { couponId, userId } = req.body;

  const coupon = await Coupon.findById(couponId);
  // console.log("coupon", coupon)
  let arr = [];
  if (coupon) {
    arr = coupon.usedBy;
    // console.log("arr", arr)
    arr.push({ user: userId });
    coupon.usedBy = arr;

    const updatedCoupon = await coupon.save();
    res.json(updatedCoupon);
  } else {
    res.status(404);
    throw new Error("coupon not found");
  }
});


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

const applyCoupon = asyncHandler(async (req, res) => {
  const { code, userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User not found" });
  }

  const coupon = await Coupon.findOne({ name: code });

  if (!coupon) {
    return res.status(400).json({ message: "Coupon not found" });
  }

  if (coupon.count >= coupon.limit) {
    return res.status(400).json({ message: "Coupon usage limit reached" });
  }

  const userUsed = coupon.usedBy.some(
    (u) => u.user.toString() === userId.toString()
  );

  if (userUsed) {
    return res.status(400).json({ message: "Coupon already used by this user" });
  }

  return res.status(200).json({
    message: "Coupon is valid and unused by user",
    promoCode: coupon,
  });
});

const getUsersWhoUsedCoupon = asyncHandler(async (req, res) => {
  const { couponId, pageNumber = 1, pageSize = 20 } = req.query;

  const coupon = await Coupon.findById(couponId)
    .select("usedBy")
    .populate("usedBy.user", "firstName lastName email phone");

  if (!coupon) {
    return res.status(400).json({ message: "Coupon not found" });
  }

  const totalDocuments = coupon.usedBy.length;

  const users = coupon.usedBy.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize
  );

  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({
    users,
    pageCount,
    pageSize,
    total: totalDocuments,
  });
});

module.exports = {
  createCoupon,
  getCouponById,
  getCoupon,
  deleteCoupon,
  couponUsed,
  updateCoupon,
  searchCoupons,
  getCouponPaginationApplied,
  applyCoupon,
  getUsersWhoUsedCoupon
};
