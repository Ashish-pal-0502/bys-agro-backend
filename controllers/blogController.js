const asyncHandler = require("express-async-handler");
const Blog = require("../models/blogModel");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3KeyFromUrl = require("../utils/s3Key");
const escapeRegex = require("../utils/escapeRegex");

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const createBlog = asyncHandler(async (req, res) => {
  const { heading, content, user, image, mdesc, mtitle } = req.body;

  // const slug = heading
  //   .toLowerCase()
  //   .replace(/ /g, "-")
  //   .replace(/[^\w-]+/g, "");
  // Remove HTML tags from title
  const cleanTitle = heading
    .replace(/<[^>]*>/g, "")
    .trim();

  // Generate SEO-friendly slug
  const slug = cleanTitle
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const blog = await Blog.create({
    _id: slug,
    slug,
    heading,
    content,
    user,
    image,
    mdesc,
    mtitle,
  });

  if (blog) {
    res.status(201).json({
      blog,
    });
  } else {
    res.status(400);
    throw new Error("Blog not created");
  }
});

const updateBlog = asyncHandler(async (req, res) => {
  const { blogId, heading, content, user, image, mdesc, mtitle } = req.body;

  const blog = await Blog.findById(blogId);

  if (blog) {
    blog.heading = heading;
    blog.content = content;
    blog.user = user;
    blog.mdesc = mdesc;
    blog.mtitle = mtitle;
    blog.image = image ? image : blog.image;
    const updatedBlog = await blog.save();
    res.json(updatedBlog);
  } else {
    res.status(400);
    throw new Error("Blog not created");
  }
});

const getBlogs = asyncHandler(async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;

  const count = await Blog.countDocuments({});
  var pageCount = Math.floor(count / pageSize);
  if (count % pageSize !== 0) {
    pageCount = pageCount + 1;
  }

  const blogs = await Blog.find({})
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ _id: -1 });

  res.status(201).json({ blogs, pageCount });
});

const deleteBlog = asyncHandler(async (req, res) => {
  const BlogId = req.query.blogId;
  const blog = await Blog.findById(BlogId);

  if (blog) {
    const images = blog.image;

    for (let i = 0; i < images?.length; i++) {
      try {
        const key = s3KeyFromUrl(images[i]);
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET, Key: key }));
      } catch (err) {
        console.error("Failed to delete blog image from S3:", err);
      }
    }

    await blog.deleteOne({ _id: blog._id });
    // await blog.remove();
    res.json({ message: "Blog removed" });
  } else {
    res.status(404);
    throw new Error("Blog not found");
  }
});

const getBlogById = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (blog) {
    res.json(blog);
  } else {
    res.status(404);
    throw new Error("Blog not found");
  }
});

const searchBlog = asyncHandler(async (req, res) => {
  const query = escapeRegex(req.query.Query?.trim() || "")

  const pageNumber = Number(req.query.pageNumber) || 1
  const pageSize = Number(req.query.pageSize) || 1
  const totalDocuments = await Blog.countDocuments({})

  const pageCount = Math.ceil(totalDocuments / pageSize)
  const searchCriteria = {
    $or: [
      { name: { $regex: query, $options: "i" } },
      { user: { $regex: query, $options: "i" } },
      { heading: { $regex: query, $options: "i" } },
      { content: { $regex: query, $options: "i" } },
      { mtitle: { $regex: query, $options: "i" } },
      { mdesc: { $regex: query, $options: "i" } }
    ]
  }
  const blogs = await Blog.find(searchCriteria).skip((pageNumber - 1) * pageSize).limit(pageSize)

  res.status(200).send({ blogs, pageCount })

})

module.exports = {
  createBlog,
  getBlogs,
  deleteBlog,
  getBlogById,
  updateBlog,
  searchBlog
};
