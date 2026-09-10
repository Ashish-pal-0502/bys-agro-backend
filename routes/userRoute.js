const express = require('express')
const {
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
  sendEmailToUsers
 } = require('../controllers/userController')
const {
   isUser,
   isAdmin,
 } = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/config')
const router = express.Router()

router.post('/register', authLimiter, createUser)
router.post('/update', isUser, updateUser)
router.post('/auth-user', authLimiter, userLogin)
router.get('/get-users', isAdmin, getUsers)
router.get('/get-user-by-id', isUser, getUserById)
router.post('/resend-otp', authLimiter, resendOTP)
router.post('/reset-password', authLimiter, resetPassword)
router.delete('/delete', isAdmin, deleteUser)
router.get('/inactive', isAdmin, getInactiveUsers)
router.post('/verify', authLimiter, verifyUserProfile)
router.post('/register-user-google', registerUserGoogle)
router.post('/auth-user-google', authUserGoogle)
router.post('/refresh-tokens', refreshAccessToken)
router.post('/logout', logoutUser)
router.post('/login-with-email', authLimiter, loginUserWithEmail)
router.post('/login-with-mobile', authLimiter, loginUserWithMobile)
router.post('/resend-mobile-otp', authLimiter, resendMobileOTP)
router.get('/search-users', isAdmin, searchUsers)
router.post("/email/send", isAdmin, sendEmailToUsers);

module.exports = router
