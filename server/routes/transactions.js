const express = require('express');
const router = express.Router();

// Placeholder — buy/sell + Razorpay escrow implemented in the Transactions module.
router.get('/', (req, res) => res.json({ module: 'transactions', status: 'not_implemented' }));

module.exports = router;
