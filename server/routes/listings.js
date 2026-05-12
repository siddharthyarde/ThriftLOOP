const express = require('express');
const router = express.Router();

// Placeholder — full CRUD, search & filter implemented in DOC 4 (Listings module).
router.get('/', (req, res) => res.json({ module: 'listings', status: 'not_implemented' }));

module.exports = router;
