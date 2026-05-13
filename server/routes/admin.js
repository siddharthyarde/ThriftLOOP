const express = require('express');
const router = express.Router();
const adminGuard = require('../middleware/adminGuard');
const supabase = require('../services/supabase');
const { recalculateTrustScore } = require('../utils/trustScore');

router.get('/stats', adminGuard, async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: totalListings },
      { count: totalTransactions },
      { count: openDisputes },
      { count: activeRentals },
      { data: recentTxns },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('transactions').select('id, amount, type, status, created_at')
        .order('created_at', { ascending: false }).limit(10),
    ]);

    const { data: completedTxns } = await supabase
      .from('transactions').select('amount').eq('status', 'completed');
    const totalRevenue = (completedTxns || []).reduce((s, t) => s + (t.amount || 0), 0);

    const { data: sustData } = await supabase
      .from('sustainability_log').select('co2_saved_kg, water_saved_l');
    const totalCO2 = (sustData || []).reduce((s, l) => s + l.co2_saved_kg, 0);
    const totalWater = (sustData || []).reduce((s, l) => s + l.water_saved_l, 0);

    res.json({
      users: totalUsers,
      listings: totalListings,
      transactions: totalTransactions,
      open_disputes: openDisputes,
      active_rentals: activeRentals,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      sustainability: {
        co2_saved_kg: parseFloat(totalCO2.toFixed(2)),
        water_saved_l: Math.round(totalWater),
      },
      recent_transactions: recentTxns || [],
    });
  } catch (err) { next(err); }
});

router.get('/users', adminGuard, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data || [], total: count || 0 });
  } catch (err) { next(err); }
});

router.put('/users/:userId/trust-score', adminGuard, async (req, res, next) => {
  try {
    const { trust_score, verified } = req.body;
    const updates = {};
    if (trust_score !== undefined) updates.trust_score = parseFloat(trust_score);
    if (verified !== undefined) updates.verified = verified;

    const { data, error } = await supabase
      .from('users').update(updates).eq('id', req.params.userId).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/listings', adminGuard, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('listings')
      .select(`*, users!seller_id(id, name, email)`, { count: 'exact' })
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ listings: data || [], total: count || 0 });
  } catch (err) { next(err); }
});

router.put('/listings/:id/force-delist', adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'delisted', delisted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/noshow-flags', adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('meetups')
      .select(`*, transactions(id, amount, buyer_id, seller_id, listings(id, title, images))`)
      .in('status', ['buyer_noshow', 'seller_noshow', 'disputed'])
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/users/:userId/recalc-trust', adminGuard, async (req, res, next) => {
  try {
    const score = await recalculateTrustScore(req.params.userId);
    res.json({ trust_score: score });
  } catch (err) { next(err); }
});

module.exports = router;
