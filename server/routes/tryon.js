const express = require('express');
const router = express.Router();

// Placeholder — API4AI virtual try-on implemented in the Try-On module.
router.get('/', (req, res) => res.json({ module: 'tryon', status: 'not_implemented' }));

module.exports = router;
