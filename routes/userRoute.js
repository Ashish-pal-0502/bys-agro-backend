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
 } = require('../middleware/authMiddleware')
const router = express.Router()

router.post('/register', createUser)
router.post('/update', isUser, updateUser)
router.post('/auth-user', userLogin)
router.get('/get-users', getUsers)
router.get('/get-user-by-id', getUserById)
router.post('/resend-otp', resendOTP)
router.post('/reset-password', resetPassword)
router.delete('/delete', deleteUser)
router.get('/inactive', getInactiveUsers)
router.post('/verify', verifyUserProfile)
router.post('/register-user-google', registerUserGoogle)
router.post('/auth-user-google', authUserGoogle)
router.post('/refresh-tokens', refreshAccessToken)
router.post('/logout', logoutUser)
router.post('/login-with-email', loginUserWithEmail)
router.post('/login-with-mobile', loginUserWithMobile)
router.post('/resend-mobile-otp', resendMobileOTP)
router.get('/search-users', searchUsers)
router.post("/email/send", sendEmailToUsers);

module.exports = router