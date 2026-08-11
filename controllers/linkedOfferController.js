const asyncHandler = require("express-async-handler");
const LinkedOffer = require("../models/linkedOfferModel");

const createLinkedOffer = asyncHandler(async (req, res) => {
    const { parentProduct, linkedProduct, discountType, discountValue, priority, startDate, endDate, isActive } = req.body;

    // parent and linked cannot be the same
    if (parentProduct.toString() === linkedProduct.toString()) {
        return res.status(400).json({ message: "Parent and linked product cannot be the same." });
    }

    // Validate: no duplicate link
    const existing = await LinkedOffer.findOne({ parentProduct, linkedProduct });

    if (existing) {
        return res.status(409).json({ message: "A linked offer for this parent-linked combination already exists." });
    }

    const priorityConflict = await LinkedOffer.findOne({
        parentProduct,
        priority
    });

    if (priorityConflict) {
        return res.status(409).json({ message: "This parent product already has an offer with the same priority level." });
    }

    // Validate discount values
    if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) {
        return res.status(400).json({ message: "Percentage discount must be between 1 and 100." });
    }

    // // Validate date range
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        res.status(400);
        throw new Error("End date must be after start date.");
    }

    const offer = await LinkedOffer.create({
        parentProduct,
        linkedProduct,
        discountType,
        discountValue,
        priority,
        startDate,
        endDate,
        isActive
    });

    return res.status(201).json({ message: "Linked offer created successfully.", offer });
});


const getLinkedOffers = asyncHandler(async (req, res) => {
    const { parentProduct, pageNumber = 1, pageSize = 10 } = req.query;

    // if (!parentProduct) {
    //     res.status(400);
    //     throw new Error("Parent product is required.");
    // }
    const filter = {};
    if (parentProduct) filter.parentProduct = parentProduct;

    const offers = await LinkedOffer.find(filter)
        .populate("parentProduct", "name price weight")
        .populate("linkedProduct", "name price weight")
        .sort({ priority: 1, createdAt: -1 })
        .skip((parseInt(pageNumber) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize));

    const totalDocuments = await LinkedOffer.countDocuments(filter);
    const pageCount = Math.ceil(totalDocuments / pageSize);

    return res.status(200).json({
        offers,
        pageCount,
        total: totalDocuments,
        message: "Linked offers retrieved successfully."
    });
});

const getLinkedOfferById = asyncHandler(async (req, res) => {
    const { linkedOfferId } = req.query;

    const offer = await LinkedOffer.findById(linkedOfferId)
        .populate("parentProduct", "name price")
        .populate("linkedProduct", "name price");

    if (!offer) {
        res.status(404);
        throw new Error("Linked offer not found.");
    }

    return res.status(200).json({ offer });
});


const updateLinkedOffer = asyncHandler(async (req, res) => {
    const { linkedOfferId, discountType, discountValue, priority, isActive, startDate, endDate } = req.body;

    const offer = await LinkedOffer.findById(linkedOfferId);

    if (!offer) {
        res.status(404);
        throw new Error("Linked offer not found.");
    }

    // Resolve final values
    const resolvedType = discountType ?? offer.discountType;
    const resolvedValue = discountValue ?? offer.discountValue;

    if (resolvedType === "percentage" && (resolvedValue < 1 || resolvedValue > 99)) {
        res.status(400);
        throw new Error("Percentage discount must be between 1 and 99.");
    }

    // Resolve final dates
    const resolvedStart = startDate ?? offer.startDate;
    const resolvedEnd = endDate ?? offer.endDate;

    if (resolvedStart && resolvedEnd && new Date(resolvedEnd) <= new Date(resolvedStart)) {
        res.status(400);
        throw new Error("End date must be after start date.");
    }

    // Update only provided fields
    if (discountType !== undefined) offer.discountType = discountType;
    if (discountValue !== undefined) offer.discountValue = discountValue;
    if (priority !== undefined) offer.priority = priority;
    if (isActive !== undefined) offer.isActive = isActive;
    if (startDate !== undefined) offer.startDate = startDate;
    if (endDate !== undefined) offer.endDate = endDate;
    await offer.save();

    return res.status(200).json({ message: "Linked offer updated successfully.", offer });
});


const deleteLinkedOffer = asyncHandler(async (req, res) => {
    const { linkedOfferId } = req.query;

    const offer = await LinkedOffer.findByIdAndDelete(linkedOfferId);

    if (!offer) {
        res.status(404);
        throw new Error("Linked offer not found.");
    }

    return res.status(200).json({ message: "Linked offer deleted successfully." });
});

const getLinkedOffersByProduct = asyncHandler(async (req, res) => {
    const { productId } = req.query;

    const offers = await LinkedOffer.find({ parentProduct: productId })
        .populate("parentProduct", "name price")
        .populate("linkedProduct", "name price images weight")
        .sort({ priority: 1, createdAt: -1 })
        .limit(3)
        .lean();

    return res.status(200).json({ offers });
})

module.exports = {
    createLinkedOffer,
    getLinkedOffers,
    getLinkedOfferById,
    updateLinkedOffer,
    deleteLinkedOffer,
    getLinkedOffersByProduct,
};