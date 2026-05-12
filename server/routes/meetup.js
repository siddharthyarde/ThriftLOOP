const express = require('express');
const router = express.Router();

// Placeholder — QR meetup escrow + grace timer implemented in the Meetup module.
router.get('/', (req, res) => res.json({ module: 'meetup', status: 'not_implemented' }));

module.exports = router;
