const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  coreTitle: {
    type: String,
    required: true,
    trim: true,
  },
  sections: [
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      faqs: [
        {
          question: {
            type: String,
            required: true,
            trim: true,
          },
          answer: {
            type: String,
            required: true,
            trim: true,
          },
          steps: [
            {
              type: String
            },
          ],
          isActive: {
            type: Boolean,
            default: true,
          },
        },
      ],
    },
  ],
}, { timestamps: true });



faqSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const FAQ = mongoose.model('FAQ', faqSchema);

module.exports = FAQ;

