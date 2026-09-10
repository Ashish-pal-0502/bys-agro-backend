const express = require("express");
const { isAdmin } = require('../middleware/authMiddleware.js')
const {
  createBlog,
  getBlogs,
  deleteBlog,
  getBlogById,
  updateBlog,
  searchBlog,

} = require("../controllers/blogController");

const router = express.Router();

router.post("/create", isAdmin, createBlog);
router.post("/update", isAdmin, updateBlog);
router.get("/get-all-blogs", getBlogs);
router.delete("/delete", isAdmin, deleteBlog);
router.route("/blogbyid/:id").get(getBlogById);
router.route("/search-blog").get(isAdmin, searchBlog)

module.exports = router;
