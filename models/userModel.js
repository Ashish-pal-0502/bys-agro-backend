const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false
    },
    lastName: {
      type: String,
      required: false
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Only enforce uniqueness if the field actually exists
    },
    password: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Only enforce uniqueness if the field actually exists
    },
    age: {
      type: Number,
      required: false
    },
    profileImage: {
      type: String,
      required: false,
    },
    dob: {
      type: Date,
      required: false,
    },
    accountType: {
      type: String,
      enum: ["regular", "premium", "business", "influencer"],
      required: true,
      default: "regular",
    },
    type: {
      type: String,
      enum: ["User"],
      default: "User",
      required: true,
    },
    preferredLanguage: { type: String, default: 'English' },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deleted: {
      default: Boolean,
    },
    address: {
      area: { type: String },
      state: { type: String },
      city: { type: String },
      landmark: { type: String },
      mobile: { type: String },
      email: { type: String },
      pincode: { type: String },
      country: { type: String }
    },
    // refreshTokens: [RefreshTokenSchema],
    refreshToken: RefreshTokenSchema,
  },
  {
    timestamps: true,
  }
);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  const isMatch = await bcrypt.compare(password, this.password);
  return isMatch;
};

const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

userSchema.methods.generateAccessToken = async function () {
  return await jwt.sign(
    { id: this._id, type: this.type, email: this.email, name: this.name, tokenType: 'access' },
    process.env.SECRET_KEY,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};


userSchema.methods.generateRefreshToken = async function () {

  const refreshToken = await jwt.sign(
    { id: this._id, type: this.type, tokenType: 'refresh' },
    process.env.SECRET_KEY,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { refreshToken, expiresAt }
};



const User = mongoose.model("User", userSchema);

module.exports = User;
