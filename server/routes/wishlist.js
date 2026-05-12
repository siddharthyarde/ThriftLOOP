const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

// GET /api/wishlist — get my wishlist
router.get('/', authGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        id, created_at,
        listings(*, users!seller_id(id, name, avatar_url, trust_score, verified))
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

// GET /api/wishlist/check/:listingId — check if a listing is in my wishlist
router.get('/check/:listingId', authGuard, async (req, res) => {
  try {
    const { data } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('listing_id', req.params.listingId)
      .single();

    res.json({ saved: !!data });
  } catch {
    res.json({ saved: false });
  }
});

// POST /api/wishlist/:listingId — add to wishlist
router.post('/:listingId', authGuard, async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const { data, error } = await supabase
      .from('wishlists')
      .insert({ user_id: req.user.id, listing_id: listingId })
      .select()
      .single();

    if (error?.code === '23505') return res.status(409).json({ error: 'Already in wishlist' });
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) { next(err); }
});

// DELETE /api/wishlist/:listingId — remove from wishlist
router.delete('/:listingId', authGuard, async (req, res, next) => {
  try {
    await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', req.user.id)
      .eq('listing_id', req.params.listingId);

    res.json({ message: 'Removed from wishlist' });
  } catch (err) { next(err); }
});

module.exports = router;
