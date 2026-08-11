const mongoose  = require("mongoose")

const testimonialSchema = mongoose.Schema({
	name: {
		type: String, 
		required: true, 
	},
	location : {
		type : String, 
		required: true, 
	},
	description: {
		type: String, 
		required: true, 
	},
	rating: {
		type: Number, 
		required: true, 
		min : 1, 
		max: 5, 
	},
	isActive: {
		type: Boolean, 
		default: true, 
	}
}, {
	timestamps: true,
}); 

module.exports = mongoose.model("Testimonial", testimonialSchema); 