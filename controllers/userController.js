
const User = require('../models/userModel')
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const {
  sendVerificationEmail,
  sendResetEmail,
  sendBulkEmail
} = require('../middleware/handleEmail');
const { default: isEmail } = require('validator/lib/isEmail');
const sendOTP = require('../services/smsService');

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, profileImage, preferredLanguage, address, dob } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'Name, email, and password are required',
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      message: "User already exists"
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000);
  sendVerificationEmail(otp, email)

  const newUser = await User.create({
    name,
    email,
    password,
    phone,
    profileImage,
    address,
    preferredLanguage,
    otp,
    dob
  });

  // const token = await newUser.generateAccessToken()

  res.status(201).json({
    message: "'User registered. An email has been sent to your email address for verification.'",
    user: newUser
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { email, phone, pageNumber = 1, pageSize = 20 } = req.query;

  const filter = {
    isActive: true,
    isEmailVerified: true,
    ...(email && { email }),
    ...(phone && { phone })
  };

  const users = await User.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
  const totalDocuments = await User.countDocuments(filter)
  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.status(200).json({
    message: {
      en: 'Users retrieved successfully',
      ar: 'تم جلب المستخدمين بنجاح'
    },
    users,
    pageCount
  });
});


const searchUsers = asyncHandler(async (req, res) => {
  const { Query, pageNumber = 1, pageSize = 20 } = req.query;

  const filter = {
    isActive: true,
    isEmailVerified: true,
    $or: [
      { firstName: { $regex: Query } },
      { lastName: { $regex: Query } },
      { email: { $regex: Query } },
      { phone: { $regex: Query } }
    ]
  };

  const users = await User.find(filter).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
  const totalDocuments = await User.countDocuments(filter)
  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.status(200).json({
    message: {
      en: 'Users retrieved successfully',
      ar: 'تم جلب المستخدمين بنجاح'
    },
    users,
    pageCount
  });
});

const getInactiveUsers = asyncHandler(async (req, res) => {
  const { email, phone, pageNumber = 1, pageSize = 20 } = req.query;

  const filter = {
    $or: [
      { isActive: false },
      { isEmailVerified: false }
    ],
    ...(email && { email }),
    ...(phone && { phone })
  };

  const users = await User.find(filter).skip((pageNumber - 1) * pageSize).limit(pageSize)
  const totalDocuments = await User.countDocuments(filter)
  const pageCount = Math.ceil(totalDocuments / pageSize)

  res.status(200).json({
    message: "Users retrieved successfully",
    users,
    pageCount
  });
});



const updateUser = asyncHandler(async (req, res) => {
  const {
    userId,
    firstName,
    lastName,
    email,
    password,
    phone,
    profileImage,
    address,
    preferredLanguage,
    connectedAccounts,
    dob
  } = req.body

  const user = await User.findById(userId)

  if (!user) {
    return res.status(404).json({
      message: 'User not found'
    });
  }

  user.firstName = firstName || user.firstName
  user.lastName = lastName || user.lastName
  user.email = email || user.email
  user.password = password || user.password
  user.phone = phone || user.phone
  user.profileImage = profileImage || user.profileImage
  user.connectedAccounts = connectedAccounts || user.connectedAccounts
  user.address = address || user.address
  user.preferredLanguage = preferredLanguage || user.preferredLanguage
  user.dob = dob || user.dob

  const updatedUser = await user.save()

  res.status(200).send({
    message: "Profile Updated Successfully",
    user: updatedUser
  })
})

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  const deleted = await User.findOneAndDelete({ _id: userId });

  if (!deleted) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  res.status(200).json({
    message: 'User deleted successfully',
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      message: "User Id is required"
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  res.status(200).json({
    message: {
      en: 'User retrieved successfully',
      ar: 'تم جلب المستخدم بنجاح'
    },
    user
  });
});

const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (email && password) {
    let user = await User.findOne({ email })

    if (!user) {
      return res.status(400).send({
        message: "User not found"
      })
    }

    if (user && (await user.isPasswordCorrect(password))) {

      if (!user.isEmailVerified) {
        const otp = Math.floor(1000 + Math.random() * 9000);
        sendVerificationEmail(otp, email)
        user.otp = otp
        await user.save()
        return res.status(400).send({
          otpSent: true, status: false, message: "Your profile is pending email verification. An OTP has been sent to your registered email."
        })
      }

      const accessToken = await user.generateAccessToken()
      const { refreshToken, expiresAt } = await user.generateRefreshToken();
      // user.refreshTokens.push({ token: refreshToken, expiresAt });
      user.refreshToken = { token: refreshToken, expiresAt }
      await user.save();


      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });



      res.json({
        message: "Login Success",
        otpSent: false,
        status: true,
        user,
        accessToken,
        refreshToken,
        isEmailVerfied: true
      })
    } else {
      return res.status(400).send({
        message: "Invalid credentials",
      }
      )
    }
  }
})


const verifyUserProfile = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;

  let user
  if (email) {
    user = await User.findOne({ email })
  } else {
    user = await User.findOne({ phone })
  }

  if (!user) {
    return res.status(400).send({
      status: false,
      message: "User not found"
    });
  }

  if (phone && user.otpExpiresAt && Date.now() > user.otpExpiresAt) {
    return res.status(400).send({
      status: false,
      message: "OTP expired"
    });
  }


  if (user.email !== "test@gmail.com" && user.otp !== otp) {
    return res.status(400).send({
      status: false,
      message: "OTP not valid"
    });
  }

  if (user.email === "test@gmail.com" && otp !== "1234") {
    return res.status(400).send({
      status: false,
      message: "OTP not valid"
    });
  }

  user.isActive = true;
  user.isEmailVerified = true;
  user.otp = "";
  user.address = {
    ...user.address,
    mobile: phone,
  };

  const accessToken = await user.generateAccessToken()
  const { refreshToken, expiresAt } = await user.generateRefreshToken();
  // user.refreshTokens.push({ token: refreshToken, expiresAt });
  user.refreshToken = { token: refreshToken, expiresAt };
  await user.save();

  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.refreshTokens;
  delete safeUser.otp;
  delete safeUser.__v;

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });



  res.status(200).send({
    status: true,
    message: "User verified successfully",
    user: safeUser,
    accessToken,
    refreshToken
  });

});


const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({
      status: false,
      message: "Email not found"
    });
  }

  const existedUser = await User.findOne({ email: email.toLowerCase() });
  if (!existedUser) {
    return res.status(400).send({
      status: false,
      message: "Email does not exist",
    });
  }

  const otp = Math.floor(10000 + Math.random() * 90000);

  sendResetEmail(existedUser.email, otp);

  existedUser.password = otp;

  await existedUser.save();

  res.status(200).send({
    status: true,
    message: "OTP sent to your email. Please check for password reset",
  });
});


const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send({
      status: false,
      message: "User not found"
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000);
  const otpExpiresAt = Date.now() + 5 * 60 * 1000;  // 5 min
  let emailSent = false;

  try {
    await sendVerificationEmail(otp, email);
    emailSent = true;
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Failed to send OTP via email"
    });
  }


  user.otp = otp.toString();
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  return res.status(200).send({
    status: true,
    message: "OTP has been resent to your email"
  });
});

const resendMobileOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(400).send({
      status: false,
      message: "User not found",
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000);
  const otpExpiresAt = Date.now() + 5 * 60 * 1000;  // 5 min
  let phoneSent = false;

  try {
    await sendOTP(phone, otp);
    phoneSent = true;
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: "Failed to send OTP via mobile"
    });
  }


  user.otp = otp.toString();
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  return res.status(200).send({
    status: true,
    otp,
    message: "OTP has been resent to your phone"
  });
});

const authUserGoogle = asyncHandler(async (req, res) => {
  const { client_id, jwtToken } = req.body;

  const client = new OAuth2Client(client_id);

  const ticket = await client.verifyIdToken({
    idToken: jwtToken,
    audience: client_id,
  });

  const payload = ticket.getPayload();
  // console.log(payload)
  const user = await User.findOne({ email: payload.email });
  const accessToken = await user.generateAccessToken();
  const { refreshToken, expiresAt } = await user.generateRefreshToken();
  // user.refreshTokens.push({ token: refreshToken, expiresAt });
  user.refreshToken = { token: refreshToken, expiresAt };
  user.isEmailVerified = true;
  await user.save();

  if (user) {
    res.json({
      message: "User login successfully.",
      _id: user._id,
      name: payload.name,
      email: payload.email,
      accessToken,
      refreshToken
    });
  } else {
    return res.status(400).send({
      message: "Invalid user data."
    })
  }
});


const registerUserGoogle = asyncHandler(async (req, res) => {
  const { client_id, jwtToken } = req.body;

  const client = new OAuth2Client(client_id);

  const ticket = await client.verifyIdToken({
    idToken: jwtToken,
    audience: client_id,
  });

  const payload = ticket.getPayload();

  const userExists = await User.findOne({ email: payload.email });

  if (userExists) {
    const accessToken = await userExists.generateAccessToken()
    const { refreshToken, expiresAt } = await userExists.generateRefreshToken();
    // userExists.refreshTokens.push({ token: refreshToken, expiresAt });
    userExists.refreshToken = { token: refreshToken, expiresAt }
    await userExists.save();

    return res.status(200).send({
      message: "User login successfully.",
      _id: userExists._id,
      name: payload.name,
      email: payload.email,
      accessToken,
      refreshToken
    })
  }
  else {
    const user = await User.create({
      name: payload.name,
      email: payload.email,
      isActive: true
    });

    const accessToken = await user.generateAccessToken()
    const { refreshToken, expiresAt } = await user.generateRefreshToken();
    // user.refreshTokens.push({ token: refreshToken, expiresAt });
    userExists.refreshToken = { token: refreshToken, expiresAt };
    await user.save();

    if (user) {
      return res.status(201).json({
        message: "User registered successfully.",
        _id: user._id,
        name: user.name,
        email: user.email,
        accessToken,
        refreshToken
      });
    } else {
      return res.status(400).send({
        message: "Invalid user data."

      })
    }
  }
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token required.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
  } catch (err) {
    return res.status(403).json({
      message: "Invalid or expired refresh token.",
    });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  if (decoded.tokenType !== "refresh") {
    return res.status(403).json({ message: "Invalid token type." });
  }

  // const tokenExists = user.refreshTokens.some(
  //   (t) => t.token === refreshToken
  // );
  const tokenExists = user.refreshToken && user.refreshToken.token === refreshToken;

  if (!tokenExists) {
    return res.status(403).json({
      message: "Refresh token not recognized (maybe logged out).",
    });
  }

  const newAccessToken = await user.generateAccessToken();

  return res.status(200).json({
    accessToken: newAccessToken,
  });

});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      message: "Refresh token required.",
    });
  }

  const user = await User.findOne({ "refreshToken.token": refreshToken });
  if (!user) {
    return res.status(200).json({
      message: "Already logged out.",
    });
  }

  // user.refreshTokens = user.refreshTokens.filter(
  //   (t) => t.token !== refreshToken
  // );
  user.refreshToken = null;

  await user.save();

  return res.status(200).json({
    message: "Logged out successfully.",
  });
});


const loginUserWithMobile = asyncHandler(async (req, res) => {
  const { phone } = req.body

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).send({ message: "Invalid phone number" });
  }
  // console.log('phone', phone)
  let user = await User.findOne({ phone })
  // console.log("user", user)
  const otp = Math.floor(1000 + Math.random() * 9000);
  const otpExpiresAt = Date.now() + 5 * 60 * 1000;  // 5 min

  // console.log("otp", otp, ", otpExpiresAt", otpExpiresAt)

  if (user) {
    await sendOTP(phone, otp)
    // console.log("otpRes", otpRes)
    user.otp = otp
    user.otpExpiresAt = otpExpiresAt
    await user.save()
    return res.status(200).send({ message: "OTP sent successfully.", otp })
  }
  await sendOTP(phone, otp)
  // console.log("otpRes2", otpRes2)
  user = await User.create({
    phone,
    otp,
    otpExpiresAt
  })

  // console.log('user', user)

  res.send({ message: "OTP sent successfully.", otp })

})

const loginUserWithEmail = asyncHandler(async (req, res) => {
  const { email } = req.body

  const user = await User.findOne({ email })
  const otp = Math.floor(1000 + Math.random() * 9000);

  if (user) {
    sendVerificationEmail(otp, email)
    user.otp = otp
    await user.save()
    return res.status(200).send({ message: "OTP sent. Please verified!." })
  }

  sendVerificationEmail(otp, email)
  await User.create({
    email,
    otp
  })

  res.send({ message: "OTP sent. Please verified" })

})


const getRelatedProductsByConcerns = asyncHandler(async (req, res) => {
  const { concernIds = [], excludeProductId } = req.body;

  if (!concernIds.length) {
    return res.status(200).json({
      message: "No concerns provided",
      products: []
    });
  }

  const filter = {
    isActive: true,
    shopByConcerns: { $in: concernIds }
  };

  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const products = await Product.find(filter)
    .limit(10)
    .populate("category")
    .populate("shopByConcerns")
    .populate("countInStock");

  res.status(200).json({
    message: "Related products retrieved successfully",
    products
  });
});


const sendEmailToUsers = asyncHandler(async (req, res) => {
  const { subject, body, users } = req.body;


  if (!subject || !body || !users || !users.length) {
    return res.status(400).json({
      success: false,
      message: "Subject, body and users are required",
    });
  }

  const emails = users
    .map((user) => user.email)
    .filter(Boolean);

  if (!emails.length) {
    return res.status(400).json({
      success: false,
      message: "No valid email addresses found",
    });
  }

  const emailSent = await sendBulkEmail({
    subject,
    html: body,
    emails,
  });

  if (!emailSent) {
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }

  res.status(200).json({
    success: true,
    message: "Email sent successfully",
  });
});

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getUserById,
  userLogin,
  resetPassword,
  resendOTP,
  verifyUserProfile,
  getInactiveUsers,
  registerUserGoogle,
  authUserGoogle,
  refreshAccessToken,
  logoutUser,
  loginUserWithEmail,
  loginUserWithMobile,
  resendMobileOTP,
  searchUsers,
  getRelatedProductsByConcerns,
  sendEmailToUsers
};
