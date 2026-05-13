const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  createTransaction,
  createPaymentOrder,
  confirmPayment,
  getTransaction,
  getMyTransactions,
  chooseDeliveryType,
  confirmDelivery,
  cancelTransaction,
} = require('../controllers/transactionController');

router.get('/me',                   authGuard, getMyTransactions);
router.get('/:id',                  authGuard, getTransaction);
router.post('/',                    authGuard, createTransaction);
router.post('/payment-order',       authGuard, createPaymentOrder);
router.post('/confirm-payment',     authGuard, confirmPayment);
router.put('/:id/delivery-type',    authGuard, chooseDeliveryType);
router.put('/:id/confirm-delivery', authGuard, confirmDelivery);
router.put('/:id/cancel',           authGuard, cancelTransaction);

module.exports = router;
