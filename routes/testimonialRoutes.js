const express = require("express")
const router = express.Router()
const {isAdmin} = require("../middleware/authMiddleware")
const {
  createTestimonial,
  updateTestimonial,
  getAllTestimonials,
  deleteTestimonial,
	 getActiveTestimonials,
} = require('../controllers/testimonialController');

// Public routes
router.get("/get-active-testimonials", getActiveTestimonials)

// isAdmin routes
router.post('/create', isAdmin, createTestimonial);
router.post('/update', isAdmin, updateTestimonial);
router.get('/get-all', isAdmin, getAllTestimonials);
router.delete('/delete', isAdmin, deleteTestimonial);

module.exports = router;