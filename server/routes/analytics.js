const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

// GET /api/analytics/seller — seller dashboard stats
router.get('/seller', authGuard, async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const [
      { data: listings },
      { data: transactions },
      { data: disputes },
    ] = await Promise.all([
      supabase.from('listings').select('id,title,images,views,saves,status,price,category,created_at').eq('seller_id', sellerId),
      supabase.from('transactions').select('id,status,amount,type,created_at').eq('seller_id', sellerId),
      supabase.from('disputes').select('id,status').eq('against', sellerId),
    ]);

    const activeListings = (listings || []).filter(l => l.status === 'active');
    const soldListings   = (listings || []).filter(l => l.status === 'sold');
    const completedTxns  = (transactions || []).filter(t => t.status === 'completed');
    const totalRevenue   = completedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalViews     = (listings || []).reduce((sum, l) => sum + (l.views || 0), 0);
    const totalSaves     = (listings || []).reduce((sum, l) => sum + (l.saves || 0), 0);

    // Conversion rate: sold / (active + sold)
    const totalListed    = activeListings.length + soldListings.length;
    const conversionRate = totalListed > 0 ? ((soldListings.length / totalListed) * 100).toFixed(1) : 0;

    // Average time to sell (days)
    const avgDaysToSell = completedTxns.length > 0
      ? (completedTxns.reduce((sum, t) => {
          const created = new Date(t.created_at);
          const now     = new Date();
          return sum + (now - created) / (1000 * 60 * 60 * 24);
        }, 0) / completedTxns.length).toFixed(1)
      : null;

    // Best performing listing by (views + saves*2)
    const topListing = (listings || [])
      .slice()
      .sort((a, b) => (b.views + b.saves * 2) - (a.views + a.saves * 2))[0] || null;

    // Category breakdown
    const categoryMap = {};
    (listings || []).forEach(l => {
      categoryMap[l.category] = (categoryMap[l.category] || 0) + 1;
    });

    // Revenue by month
    const monthlyRevenue = {};
    completedTxns.forEach(t => {
      const month = new Date(t.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (t.amount || 0);
    });

    res.json({
      summary: {
        active_listings: activeListings.length,
        sold_listings:   soldListings.length,
        total_revenue:   totalRevenue,
        total_views:     totalViews,
        total_saves:     totalSaves,
        conversion_rate: parseFloat(conversionRate),
        avg_days_to_sell: parseFloat(avgDaysToSell) || null,
        dispute_count:   (disputes || []).length,
        open_disputes:   (disputes || []).filter(d => d.status === 'open').length,
      },
      top_listing:        topListing,
      category_breakdown: categoryMap,
      monthly_revenue:    monthlyRevenue,
      recent_listings:    (listings || [])
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
