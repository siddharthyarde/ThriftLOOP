const Razorpay = require('razorpay');
const crypto = require('crypto');

let _client = null;
const client = () => {
  if (_client) return _client;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  _client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return _client;
};

const createOrder = async (amountInRupees, currency = 'INR', notes = {}) =>
  client().orders.create({
    amount: Math.round(amountInRupees * 100),
    currency,
    receipt: `thrift_${Date.now()}`,
    notes,
  });

const verifyPayment = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

module.exports = { createOrder, verifyPayment, client };
