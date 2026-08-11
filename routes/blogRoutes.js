const express = require("express");
const { admin } = require('../middleware/authMiddleware.js')
const {
  createBlog,
  getBlogs,
  deleteBlog,
  getBlogById,
  updateBlog,
  searchBlog,

} = require("../controllers/blogController");

const router = express.Router();

router.post("/create", createBlog);
router.post("/update", updateBlog);
router.get("/get-all-blogs", getBlogs);
router.delete("/delete", deleteBlog);
router.route("/blogbyid/:id").get(getBlogById);
router.route("/search-blog").get(searchBlog)

module.exports = router;
