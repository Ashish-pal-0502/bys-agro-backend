const { rateLimit } = require('express-rate-limit')

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10000,
	standardHeaders: 'draft-8',
	legacyHeaders: false, 
	ipv6Subnet: 56, 
})

const whitelist = ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3000', 
  "https://motherland-frontend-imw78eucv-tanmay-ss-projects.vercel.app", "https://motherland-frontend-tau.vercel.app",
  'http://192.168.31.106', 
  'https://192.168.31.106', 
  'http://192.168.31.106:5173', 
  'https://192.168.31.106:5173',
  'http://192.168.31.106:3000',   
  'https://192.168.31.106:3000',   
  'https://motherland-admin-panel-a16u.vercel.app',
  'http://motherland-admin-panel.s3-website.ap-south-1.amazonaws.com',
  'https://motherland-admin-panel.s3-website.ap-south-1.amazonaws.com',
  'https://bys-agro-frontend.onrender.com',


]

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by  CORS'))
    }
  },
  credentials: true
}

module.exports = {
    limiter,
    corsOptions
}