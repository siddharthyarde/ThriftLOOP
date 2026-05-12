const express = require('express');
const router = express.Router();

// Placeholder — dispute resolution implemented in the Dispute module.
router.get('/', (req, res) => res.json({ module: 'dispute', status: 'not_implemented' }));

module.exports = router;
