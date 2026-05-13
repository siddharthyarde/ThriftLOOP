const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

router.post('/', authGuard, async (req, res, next) => {
  try {
    const { listing_id, amount } = req.body;
    const buyerId = req.user.id;

    const { data: listing } = await supabase.from('listings').select('*').eq('id', listing_id).single();
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller_id === buyerId) return res.status(400).json({ error: 'Cannot offer on own listing' });
    if (amount >= listing.price) return res.status(400).json({ error: 'Offer must be below listing price' });

    const { data, error } = await supabase.from('offers').insert({
      listing_id, buyer_id: buyerId, seller_id: listing.seller_id, amount: parseFloat(amount),
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('notifications').insert({
      user_id: listing.seller_id,
      type: 'offer_received',
      title: 'New Offer Received!',
      content: `Someone offered ₹${amount} on "${listing.title}"`,
      metadata: { offer_id: data.id, listing_id },
    });

    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.get('/me', authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('offers')
      .select(`*, listings(id, title, images, price)`)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

router.put('/:id/counter', authGuard, async (req, res, next) => {
  try {
    const { counter_amount } = req.body;
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can counter' });

    const { data } = await supabase.from('offers')
      .update({ status: 'countered', counter_amount: parseFloat(counter_amount) })
      .eq('id', req.params.id).select().single();

    await supabase.from('notifications').insert({
      user_id: offer.buyer_id,
      type: 'offer_received',
      title: 'Counter-Offer Received',
      content: `Seller countered at ₹${counter_amount}`,
      metadata: { offer_id: offer.id, listing_id: offer.listing_id },
    });

    res.json(data);
  } catch (err) { next(err); }
});

router.put('/:id/accept', authGuard, async (req, res, next) => {
  try {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });

    const isParty = offer.buyer_id === req.user.id || offer.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    const { data } = await supabase.from('offers')
      .update({ status: 'accepted' }).eq('id', req.params.id).select().single();

    const notifyId = req.user.id === offer.buyer_id ? offer.seller_id : offer.buyer_id;
    await supabase.from('notifications').insert({
      user_id: notifyId,
      type: 'offer_accepted',
      title: 'Offer Accepted!',
      content: `The offer for ₹${offer.counter_amount || offer.amount} was accepted.`,
      metadata: { offer_id: offer.id },
    });

    res.json(data);
  } catch (err) { next(err); }
});

router.put('/:id/decline', authGuard, async (req, res, next) => {
  try {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });

    const isParty = offer.buyer_id === req.user.id || offer.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    const { data } = await supabase.from('offers')
      .update({ status: 'declined' }).eq('id', req.params.id).select().single();

    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
