const path = require("path");
const express = require("express");
const multer = require("multer");
const asyncHandler = require('express-async-handler')
const { isAdmin } = require('../middleware/authMiddleware')
const s3KeyFromUrl = require('../utils/s3Key')
const router = express.Router();

const multerS3 = require("multer-s3");

const { S3Client } = require("@aws-sdk/client-s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};

const s3 = new S3Client(config);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const upload = multer({
  storage: multerS3({
    s3,

    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      cb(null, `${fileName}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 150,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/uploadMultiple",
  isAdmin,
  upload.array("image", 150),
  async (req, res) => {
    const result = req.files;
    let arr = [];
    result.forEach((single) => {
      arr.push(single.location);
    });

    res.send(arr);
  }
);

router.post(
  "/uploadSingleImage",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    if(!req.file) {
      return res.status(400).send({ message: "File not found" })
    }
    const result = req.file;

    res.send(`${result.location}`);
  }
);

router.delete("/deleteImage", isAdmin, asyncHandler(async (req, res) => {
  let image = req.query.image;
  image = Array.isArray(image) ? image : [image];

  try {
      for (const file of image) {
          const key = s3KeyFromUrl(file);

          const command = new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET,
              Key: key,
          });
          await s3.send(command);
      }
      res.status(200).send({ message: 'Deletion successful' });
  } catch (e) {
      console.error("S3 deletion failed:", e);
      res.status(400).send({ message: 'Deletion Failed' });
  }
}));



module.exports = router;
