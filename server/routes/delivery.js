const express = require('express');
const router = express.Router();

// Placeholder — Shiprocket delivery integration implemented in the Delivery module.
router.get('/', (req, res) => res.json({ module: 'delivery', status: 'not_implemented' }));

module.exports = router;
