const supabase = require('../services/supabase');
const razorpayService = require('../services/razorpay');
const { generateMeetupQR } = require('../utils/qrGenerator');
const { recalculateTrustScore } = require('../utils/trustScore');
const { logSustainability } = require('../utils/sustainability');

const createTransaction = async (req, res, next) => {
  try {
    const { listing_id, type = 'buy', delivery_type } = req.body;
    const buyer_id = req.user.id;

    const { data: listing, error: listingErr } = await supabase
      .from('listings').select('*').eq('id', listing_id).single();

    if (listingErr || !listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ error: 'Listing is not available' });
    if (listing.seller_id === buyer_id) return res.status(400).json({ error: 'Cannot buy your own listing' });
    if (!listing.available_for?.includes(type)) {
      return res.status(400).json({ error: `Listing is not available for ${type}` });
    }

    await supabase.from('listings')
      .update({ status: 'reserved', reserved_for: buyer_id })
      .eq('id', listing_id);

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        buyer_id,
        seller_id: listing.seller_id,
        listing_id,
        type,
        status: 'pending',
        amount: listing.price,
        escrow_status: 'pending',
        delivery_type: delivery_type || 'meetup',
      })
      .select()
      .single();

    if (error) {
      await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', listing_id);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ transaction, listing });
  } catch (err) { next(err); }
};

const createPaymentOrder = async (req, res, next) => {
  try {
    const { transaction_id } = req.body;

    const { data: txn } = await supabase
      .from('transactions').select('*')
      .eq('id', transaction_id).eq('buyer_id', req.user.id).single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'pending') return res.status(400).json({ error: 'Payment already processed' });

    const order = await razorpayService.createOrder(txn.amount, 'INR', {
      transaction_id: txn.id,
      listing_id: txn.listing_id,
    });

    await supabase.from('transactions').update({ razorpay_order_id: order.id }).eq('id', transaction_id);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
};

const confirmPayment = async (req, res, next) => {
  try {
    const { transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const { data: txn, error } = await supabase
      .from('transactions')
      .update({
        status: 'escrow_held',
        escrow_status: 'held',
        razorpay_payment_id,
      })
      .eq('id', transaction_id)
      .eq('buyer_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('notifications').insert({
      user_id: txn.seller_id,
      type: 'listing_sold',
      title: 'Your item has been purchased!',
      content: 'Payment is held in escrow. Choose meetup or delivery.',
      metadata: { transaction_id: txn.id, listing_id: txn.listing_id },
    });

    res.json({ transaction: txn });
  } catch (err) { next(err); }
};

const chooseDeliveryType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delivery_type, meetup_time, meetup_location } = req.body;

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can set delivery type' });
    if (txn.status !== 'escrow_held') return res.status(400).json({ error: 'Payment not yet confirmed' });

    await supabase.from('transactions').update({ delivery_type }).eq('id', id);

    if (delivery_type === 'meetup') {
      const qrHash = generateMeetupQR(txn.listing_id, txn.id);

      const { data: meetup } = await supabase
        .from('meetups')
        .insert({
          transaction_id: txn.id,
          scheduled_time: meetup_time,
          location_note: meetup_location || '',
          qr_code: qrHash,
        })
        .select()
        .single();

      await supabase.from('notifications').insert({
        user_id: txn.buyer_id,
        type: 'meetup_reminder',
        title: 'Meetup Scheduled',
        content: `Meet at ${meetup_location || 'agreed location'} on ${new Date(meetup_time).toLocaleString()}`,
        metadata: { transaction_id: txn.id, meetup_id: meetup.id },
      });

      return res.json({ delivery_type: 'meetup', meetup });
    }

    res.json({ delivery_type: 'delivery', message: 'Proceed to create shipment' });
  } catch (err) { next(err); }
};

const confirmDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.buyer_id !== req.user.id && txn.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this transaction' });
    }

    const returnWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: updated } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        escrow_status: 'released',
        completed_at: new Date().toISOString(),
        return_window_end: returnWindowEnd,
      })
      .eq('id', id)
      .select()
      .single();

    await supabase.from('listings').update({ status: 'sold' }).eq('id', txn.listing_id);

    const { data: listing } = await supabase.from('listings').select('category').eq('id', txn.listing_id).single();
    if (listing) await logSustainability(txn.id, listing.category);

    await recalculateTrustScore(txn.buyer_id);
    await recalculateTrustScore(txn.seller_id);

    await supabase.from('notifications').insert([
      { user_id: txn.seller_id, type: 'escrow_released', title: 'Payment Released!', content: 'Escrow has been released to you.', metadata: { transaction_id: txn.id } },
      { user_id: txn.buyer_id,  type: 'escrow_released', title: 'Transaction Complete', content: '24hr return window is open.', metadata: { transaction_id: txn.id } },
    ]);

    res.json(updated);
  } catch (err) { next(err); }
};

const cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only buyer can cancel' });
    if (!['pending', 'escrow_held'].includes(txn.status)) {
      return res.status(400).json({ error: 'Cannot cancel at this stage' });
    }

    await supabase.from('transactions').update({ status: 'cancelled', escrow_status: 'refunded' }).eq('id', id);
    await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', txn.listing_id);

    res.json({ message: 'Transaction cancelled, escrow refunded' });
  } catch (err) { next(err); }
};

const getTransaction = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        listings(*),
        meetups(*),
        disputes(id, status, type)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });
    if (data.buyer_id !== req.user.id && data.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(data);
  } catch (err) { next(err); }
};

const getMyTransactions = async (req, res, next) => {
  try {
    const { role = 'buyer' } = req.query;
    const field = role === 'seller' ? 'seller_id' : 'buyer_id';

    const { data, error } = await supabase
      .from('transactions')
      .select(`*, listings(id, title, images, price, category)`)
      .eq(field, req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

module.exports = {
  createTransaction, createPaymentOrder, confirmPayment,
  getTransaction, getMyTransactions, chooseDeliveryType,
  confirmDelivery, cancelTransaction,
};
