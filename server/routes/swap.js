const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getSwapOpportunities,
  proposeSwap,
  getMySwaps,
  getSwapById,
  confirmSwap,
  cancelSwap,
  acceptSwapPayment,
} = require('../controllers/swapController');

router.get('/opportunities', authGuard, getSwapOpportunities);
router.get('/me',            authGuard, getMySwaps);
router.get('/:id',           authGuard, getSwapById);
router.post('/',             authGuard, proposeSwap);
router.put('/:id/confirm',   authGuard, confirmSwap);
router.put('/:id/cancel',    authGuard, cancelSwap);
router.put('/:id/pay-gap',   authGuard, acceptSwapPayment);

module.exports = router;
