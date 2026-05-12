const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');
const { recalculateTrustScore } = require('../utils/trustScore');

// POST /api/vouches — vouch for a user
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { vouchee_id, note } = req.body;
    const voucher_id = req.user.id;

    if (voucher_id === vouchee_id) {
      return res.status(400).json({ error: 'Cannot vouch for yourself' });
    }

    // Check voucher has 3+ completed transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('id')
      .or(`buyer_id.eq.${voucher_id},seller_id.eq.${voucher_id}`)
      .eq('status', 'completed');

    if (!txns || txns.length < 3) {
      return res.status(403).json({
        error: 'You need at least 3 completed transactions to vouch for others',
      });
    }

    const { data, error } = await supabase
      .from('vouches')
      .insert({ voucher_id, vouchee_id, note })
      .select()
      .single();

    if (error?.code === '23505') {
      return res.status(409).json({ error: 'You have already vouched for this user' });
    }
    if (error) return res.status(500).json({ error: error.message });

    await recalculateTrustScore(vouchee_id);

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
