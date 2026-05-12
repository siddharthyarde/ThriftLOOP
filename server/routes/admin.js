const express = require('express');
const router = express.Router();
const adminGuard = require('../middleware/adminGuard');

// Placeholder — admin panel endpoints implemented in the Admin module.
router.get('/', adminGuard, (req, res) => res.json({ module: 'admin', status: 'not_implemented' }));

module.exports = router;
