const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')
const User = require('../models/userModel.js')
const Admin = require('../models/adminModel.js')

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(403).json({
      status: false,
      message: "Token is required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.name === "TokenExpiredError" ? "Token expired." : "Invalid token."
    });
  }
});


const getUserProfileByToken = asyncHandler(async (req, res) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(403).json({
      status: false,
      message: "Token is required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const type = decoded?.type;
    const Model = type === "User" ? User : Admin;
    const user = await Model.findOne({ _id: decoded?.id });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found."
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.name === "TokenExpiredError" ? "Token expired." : "Invalid token."
    });
  }
});


const getAdminProfileByToken = asyncHandler(async (req, res) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(403).json({
      status: false,
      message: "Token is required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const admin = await Admin.findOne({ _id: decoded?.id });

    if (!admin) {
      return res.status(404).json({
        status: false,
        message: "Admin not found."
      });
    }

    return res.status(200).json({ admin });
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.name === "TokenExpiredError" ? "Token expired." : "Invalid token."
    });
  }
});


const isAdmin = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(403).json({
      status: false,
      message: "Token is required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (["Admin", "admin", "finance", "seo", "print"].includes(decoded.type)) {
      req.user = decoded;
      next();
    } else {
      return res.status(403).json({
        status: false,
        message: "Not an admin token."
      });
    }
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.name === "TokenExpiredError" ? "Token expired." : "Invalid token."
    });
  }
});


const isUser = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  
  if (!token) {
    return res.status(403).json({
      status: false,
      message: "Token is required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (decoded.type === "User" || decoded.type === "user") {
      req.user = decoded;
      next();
    } else {
      return res.status(403).json({
        status: false,
        message: "Not a valid user token."
      });
    }
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.name === "TokenExpiredError" ? "Token expired." : "Invalid token."
    });
  }
});


module.exports = {
  verifyToken,
  isAdmin,
  isUser,
  getUserProfileByToken,
  getAdminProfileByToken
};

