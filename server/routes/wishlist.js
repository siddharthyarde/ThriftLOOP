const express = require('express');
const router = express.Router();

// Placeholder — wishlist + notify-me implemented in the Wishlist module.
router.get('/', (req, res) => res.json({ module: 'wishlist', status: 'not_implemented' }));

module.exports = router;
