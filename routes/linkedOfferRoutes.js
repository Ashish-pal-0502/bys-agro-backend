const express = require('express')
const {
    createLinkedOffer,
    getLinkedOffers,
    getLinkedOfferById,
    updateLinkedOffer,
    deleteLinkedOffer,
    getLinkedOffersByProduct,
} = require('../controllers/linkedOfferController');
const { isAdmin } = require('../middleware/authMiddleware');
const router = express.Router()

router.post("/create-linked-offers", isAdmin, createLinkedOffer);
router.get("/get-linked-offers", isAdmin, getLinkedOffers);
router.get("/get-linked-offer-by-id", isAdmin, getLinkedOfferById);
router.post("/update-linked-offer", isAdmin, updateLinkedOffer);
router.delete("/delete-linked-offer", isAdmin, deleteLinkedOffer);

router.get("/get-linked-offers-by-product", getLinkedOffersByProduct);

module.exports = router