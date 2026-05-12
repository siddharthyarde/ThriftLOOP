const express = require('express');
const router = express.Router();

// Placeholder — conversations API; realtime handled client-side via Supabase Realtime.
router.get('/', (req, res) => res.json({ module: 'chat', status: 'not_implemented' }));

module.exports = router;
