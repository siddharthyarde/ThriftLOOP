const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getMyPhotos,
  uploadPhoto,
  deletePhoto,
} = require('../controllers/userPhotoController');

router.get('/',       authGuard, getMyPhotos);
router.post('/',      authGuard, uploadPhoto);
router.delete('/:id', authGuard, deletePhoto);

module.exports = router;
