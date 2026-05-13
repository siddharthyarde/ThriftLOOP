const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  performTryOn,
  getTryOnHistory,
  submitFitFeedback,
  saveTryOnResult,
} = require('../controllers/tryonController');

router.post('/',            authGuard, performTryOn);
router.get('/history',      authGuard, getTryOnHistory);
router.put('/:id/feedback', authGuard, submitFitFeedback);
router.put('/:id/save',     authGuard, saveTryOnResult);

module.exports = router;
