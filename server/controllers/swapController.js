const supabase = require('../services/supabase');
const razorpayService = require('../services/razorpay');
const { generateMeetupQR } = require('../utils/qrGenerator');

const DEPOSIT_PERCENTAGE = 0.15;

const getSwapOpportunities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, size, target_listing_id } = req.query;

    if (target_listing_id) {
      const { data: target } = await supabase
        .from('listings').select('*').eq('id', target_listing_id).single();

      if (!target) return res.status(404).json({ error: 'Target listing not found' });

      const { data: myListings } = await supabase
        .from('listings').select('*')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .contains('available_for', ['swap']);

      return res.json({ target, my_listings: myListings || [] });
    }

    let query = supabase
      .from('listings')
      .select(`*, users!seller_id(id, name, avatar_url, trust_score, verified)`)
      .eq('status', 'active')
      .contains('available_for', ['swap'])
      .neq('seller_id', userId);

    if (category) query = query.eq('category', category);
    if (size)     query = query.eq('size', size);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(40);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

const proposeSwap = async (req, res, next) => {
  try {
    const { listing_id_a, listing_id_b } = req.body;
    const userId = req.user.id;

    const [{ data: listingA }, { data: listingB }] = await Promise.all([
      supabase.from('listings').select('*').eq('id', listing_id_a).single(),
      supabase.from('listings').select('*').eq('id', listing_id_b).single(),
    ]);

    if (!listingA || !listingB) return res.status(404).json({ error: 'One or both listings not found' });
    if (listingA.seller_id !== userId) return res.status(403).json({ error: 'Listing A must be yours' });
    if (listingB.seller_id === userId) return res.status(400).json({ error: 'Cannot swap with yourself' });
    if (!listingA.available_for?.includes('swap')) return res.status(400).json({ error: 'Your listing is not available for swap' });
    if (!listingB.available_for?.includes('swap')) return res.status(400).json({ error: 'Target listing is not available for swap' });
    if (listingA.status !== 'active' || listingB.status !== 'active') {
      return res.status(400).json({ error: 'One or both listings are not active' });
    }

    const value_a = listingA.price;
    const value_b = listingB.price;
    const gap = parseFloat(Math.abs(value_a - value_b).toFixed(2));
    const gap_payer = value_a < value_b ? userId : listingB.seller_id;
    const deposit_a = parseFloat((value_a * DEPOSIT_PERCENTAGE).toFixed(2));
    const deposit_b = parseFloat((value_b * DEPOSIT_PERCENTAGE).toFixed(2));

    const { data: swap, error } = await supabase
      .from('swaps')
      .insert({
        listing_id_a, listing_id_b,
        user_a: userId, user_b: listingB.seller_id,
        value_a, value_b,
        gap_payment: gap, gap_payer,
        deposit_a, deposit_b,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('notifications').insert({
      user_id: listingB.seller_id,
      type: 'swap_matched',
      title: 'Swap Proposal Received!',
      content: `Someone wants to swap their item with your "${listingB.title}"`,
      metadata: { swap_id: swap.id, listing_id: listingB.id },
    });

    res.status(201).json({
      swap,
      summary: {
        your_item: listingA.title,
        their_item: listingB.title,
        your_value: value_a,
        their_value: value_b,
        gap_payment: gap,
        gap_payer: gap_payer === userId ? 'you' : 'them',
        your_deposit: deposit_a,
        their_deposit: deposit_b,
        total_you_pay: gap_payer === userId ? gap + deposit_a : deposit_a,
      },
    });
  } catch (err) { next(err); }
};

const getMySwaps = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        listing_a:listings!listing_id_a(id, title, images, price, category, status),
        listing_b:listings!listing_id_b(id, title, images, price, category, status),
        user_a_info:users!user_a(id, name, avatar_url, trust_score),
        user_b_info:users!user_b(id, name, avatar_url, trust_score)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

const getSwapById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        listing_a:listings!listing_id_a(*),
        listing_b:listings!listing_id_b(*),
        user_a_info:users!user_a(id, name, avatar_url, trust_score, verified),
        user_b_info:users!user_b(id, name, avatar_url, trust_score, verified),
        transactions(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Swap not found' });
    if (data.user_a !== userId && data.user_b !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(data);
  } catch (err) { next(err); }
};

const confirmSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.user_b !== userId) return res.status(403).json({ error: 'Only the receiving party can confirm' });
    if (swap.status !== 'pending') return res.status(400).json({ error: `Swap is already ${swap.status}` });

    const { data: updated } = await supabase
      .from('swaps').update({ status: 'matched' }).eq('id', id).select().single();

    await supabase.from('notifications').insert({
      user_id: swap.user_a,
      type: 'swap_matched',
      title: 'Swap Accepted! Pay to proceed.',
      content: 'The other party accepted your swap. Pay deposit (+ gap if applicable) to hold the swap.',
      metadata: { swap_id: id },
    });

    res.json(updated);
  } catch (err) { next(err); }
};

const acceptSwapPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'matched') return res.status(400).json({ error: 'Swap must be confirmed first' });

    if (!razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const { data: updated } = await supabase
      .from('swaps').update({ status: 'escrow_held' }).eq('id', id).select().single();

    await supabase.from('listings').update({ status: 'reserved' })
      .in('id', [swap.listing_id_a, swap.listing_id_b]);

    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        buyer_id: swap.user_a,
        seller_id: swap.user_b,
        listing_id: swap.listing_id_b,
        type: 'swap',
        status: 'escrow_held',
        amount: swap.gap_payment + swap.deposit_a,
        escrow_status: 'held',
        delivery_type: 'meetup',
      })
      .select()
      .single();

    await supabase.from('swaps').update({ transaction_id: txn.id }).eq('id', id);

    const qrHash = generateMeetupQR(swap.listing_id_a, txn.id);
    await supabase.from('meetups').insert({
      transaction_id: txn.id,
      scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      qr_code: qrHash,
    });

    res.json({ swap: updated, transaction: txn, voucher_user_id: userId });
  } catch (err) { next(err); }
};

const cancelSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.user_a !== userId && swap.user_b !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (!['pending', 'matched'].includes(swap.status)) {
      return res.status(400).json({ error: 'Cannot cancel at this stage' });
    }

    await supabase.from('swaps').update({ status: 'cancelled' }).eq('id', id);
    await supabase.from('listings').update({ status: 'active' })
      .in('id', [swap.listing_id_a, swap.listing_id_b]);

    res.json({ message: 'Swap cancelled' });
  } catch (err) { next(err); }
};

module.exports = {
  getSwapOpportunities, proposeSwap, getMySwaps, getSwapById,
  confirmSwap, cancelSwap, acceptSwapPayment,
};
