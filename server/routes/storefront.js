const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// GET /api/storefront/:userId — public storefront
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [{ data: user }, { data: listings }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, avatar_url, locality, bio, trust_score, verified, total_sales, created_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('listings')
        .select('*')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: completedSales } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('seller_id', userId)
      .eq('status', 'completed');

    const { data: vouches } = await supabase
      .from('vouches')
      .select('voucher_id, users!voucher_id(name, avatar_url)')
      .eq('vouchee_id', userId)
      .limit(5);

    res.json({
      user,
      listings: listings || [],
      total_sales: completedSales?.length || 0,
      vouches: vouches || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
