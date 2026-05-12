const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadAvatar,
  deleteAccount,
} = require('../controllers/authController');

router.post('/register',  register);
router.post('/login',     login);
router.post('/logout',    authGuard, logout);
router.get('/me',         authGuard, getMe);
router.put('/profile',    authGuard, updateProfile);
router.post('/avatar',    authGuard, uploadAvatar);
router.delete('/account', authGuard, deleteAccount);

module.exports = router;
