const express = require('express');
const router = express.Router();

// Placeholder — Smart Swap Engine implemented in the Swap module.
router.get('/', (req, res) => res.json({ module: 'swap', status: 'not_implemented' }));

module.exports = router;
