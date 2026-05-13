const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  bookRental,
  createRentalPaymentOrder,
  confirmRentalPayment,
  getMyRentals,
  getRentalById,
  submitReturn,
  adminProcessReturn,
} = require('../controllers/rentalController');

router.post('/',                 authGuard, bookRental);
router.post('/payment-order',    authGuard, createRentalPaymentOrder);
router.post('/confirm-payment',  authGuard, confirmRentalPayment);
router.get('/me',                authGuard, getMyRentals);
router.get('/:id',               authGuard, getRentalById);
router.put('/:id/return',        authGuard, submitReturn);
router.put('/:id/admin-process', authGuard, adminProcessReturn);

module.exports = router;
