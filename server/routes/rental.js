const express = require('express');
const router = express.Router();

// Placeholder — occasion rental flow implemented in the Rental module.
router.get('/', (req, res) => res.json({ module: 'rental', status: 'not_implemented' }));

module.exports = router;
