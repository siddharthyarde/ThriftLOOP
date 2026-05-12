const express = require('express');
const router = express.Router();

// Placeholder — seller analytics dashboard implemented in the Analytics module.
router.get('/', (req, res) => res.json({ module: 'analytics', status: 'not_implemented' }));

module.exports = router;
