const asyncHandler = require("express-async-handler");
const Testimonial = require("../models/testimonialModel.js")

//Create Testimonial
const createTestimonial = asyncHandler( async (req, res) => {
	const {name, location, description, rating} = req.body;

	if(!name || !description || !location || !rating){
		return res.status(400).json({
			message: "All fields are required.", 
		})
	}

	const testimonial = await Testimonial.create({
		name, 
		location, 
		description, 
		rating: Number(rating),
	}); 

	res.status(201).json({
		message: "Testimonial created successfully.", 
		testimonial
	});
});

//Update Testimonial 
const updateTestimonial = asyncHandler( async (req, res) => {
const { testimonialId, name, location, description, rating, isActive } = req.body;

const testimonial = await Testimonial.findById(testimonialId); 
if(!testimonialId){
	return res.status(404).json({
		message: "Testimonial not found", 
	})

}
	testimonial.name = name || testimonial.name; 
	testimonial.location = location || testimonial.location; 
	testimonial.description = description || testimonial.description; 
	testimonial.rating = rating ? Number(rating) : testimonial.rating; 
	testimonial.isActive = isActive !== undefined ? isActive : testimonial.isActive;

	const updatedTestimonial = await testimonial.save()

	res.json({
		message: "Testimonial updated successfully.", 
		testimonial : updatedTestimonial
	})
})


//Get All Testimonials (with pagination)
const getAllTestimonials = asyncHandler( async (req, res) => {
	const pageNumber = Number(req.query.pageNumber) || 1; 
	const pageSize = Number(req.query.pageSize) || 20; 
	const searchQuery = req.query.query || ""; 

	const filter = {}; 

	if(searchQuery){
		const regex = new RegExp(searchQuery, "i"); 
		filter.$or = [
			{name: regex}, 
			{location: regex}, 
			{description: regex}
		]
	}

	const total = await Testimonial.countDocuments(filter)
	const pageCount = Math.ceil(total / pageSize); 

	const testimonials  = await Testimonial.find(filter).sort({createdAt: -1}).skip((pageNumber -1) * pageSize).limit(pageSize); 

	res.status(200).json({
		testimonials, 
		pageCount, 
		total
	})
})


//get Active testimonials 
const getActiveTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({ testimonials });
});



// Delete Testimonial
const deleteTestimonial = asyncHandler( async (req, res) => {
	const { testimonialId } = req.query;

	if(!testimonialId){
		return res.status(400).json({
			message: "Testimonial id is required.", 
		})
	}

	const testimonial = await Testimonial.findById(testimonialId)

	if(!testimonial){
		return res.status(404).json({
			message: "Testimonial not found", 
		})
	}

	await Testimonial.deleteOne({ _id: testimonialId})
	res.json({
		message: "Testimonial deleted successfully"
	})
})

module.exports = {
  createTestimonial,
  updateTestimonial,
  getAllTestimonials,
  getActiveTestimonials,
  deleteTestimonial,
};