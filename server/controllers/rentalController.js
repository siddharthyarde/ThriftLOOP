const supabase = require('../services/supabase');
const razorpayService = require('../services/razorpay');

const bookRental = async (req, res, next) => {
  try {
    const { listing_id, start_date, end_date } = req.body;
    const renterId = req.user.id;

    const { data: listing } = await supabase.from('listings').select('*').eq('id', listing_id).single();
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.available_for?.includes('rental')) return res.status(400).json({ error: 'Not available for rental' });
    if (listing.status !== 'active') return res.status(400).json({ error: 'Listing not available' });
    if (listing.seller_id === renterId) return res.status(400).json({ error: 'Cannot rent your own item' });

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid rental dates' });
    }

    const days = Math.ceil((end - start) / 86400000);
    const rent_amount = parseFloat((listing.rental_price_per_day * days).toFixed(2));
    const deposit = listing.rental_deposit;
    const total = rent_amount + deposit;

    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        buyer_id: renterId,
        seller_id: listing.seller_id,
        listing_id,
        type: 'rental',
        status: 'pending',
        amount: total,
        escrow_status: 'pending',
        delivery_type: 'meetup',
      })
      .select()
      .single();

    const { data: rental, error } = await supabase
      .from('rentals')
      .insert({
        transaction_id: txn.id,
        listing_id,
        renter_id: renterId,
        owner_id: listing.seller_id,
        start_date, end_date,
        rent_amount, deposit,
        status: 'booked',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      rental, transaction: txn,
      breakdown: { days, rent_per_day: listing.rental_price_per_day, rent_amount, deposit, total_due: total },
    });
  } catch (err) { next(err); }
};

const createRentalPaymentOrder = async (req, res, next) => {
  try {
    const { rental_id } = req.body;

    const { data: rental } = await supabase
      .from('rentals').select('*, transactions(*)').eq('id', rental_id).single();

    if (!rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.renter_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const total = rental.rent_amount + rental.deposit;
    const order = await razorpayService.createOrder(total, 'INR', { rental_id: rental.id });

    await supabase.from('transactions').update({ razorpay_order_id: order.id }).eq('id', rental.transaction_id);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      breakdown: { rent: rental.rent_amount, deposit: rental.deposit },
    });
  } catch (err) { next(err); }
};

const confirmRentalPayment = async (req, res, next) => {
  try {
    const { rental_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const { data: rental } = await supabase.from('rentals').select('*').eq('id', rental_id).single();
    if (!rental) return res.status(404).json({ error: 'Not found' });

    await supabase.from('rentals').update({ status: 'active' }).eq('id', rental_id);
    await supabase.from('transactions').update({
      status: 'escrow_held', escrow_status: 'held', razorpay_payment_id,
    }).eq('id', rental.transaction_id);

    await supabase.from('listings').update({ status: 'rented' }).eq('id', rental.listing_id);

    await supabase.from('notifications').insert({
      user_id: rental.owner_id,
      type: 'listing_sold',
      title: 'Your item has been rented!',
      content: `Rental period: ${rental.start_date} → ${rental.end_date}. Deposit held in escrow.`,
      metadata: { rental_id, transaction_id: rental.transaction_id },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};

const getMyRentals = async (req, res, next) => {
  try {
    const { role = 'renter' } = req.query;
    const field = role === 'owner' ? 'owner_id' : 'renter_id';

    const { data, error } = await supabase
      .from('rentals')
      .select(`*, listings(id, title, images, price, category), transactions(status, escrow_status)`)
      .eq(field, req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

const getRentalById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rentals')
      .select(`*, listings(*), transactions(*), renter:users!renter_id(id, name, avatar_url), owner:users!owner_id(id, name, avatar_url)`)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });
    if (data.renter_id !== req.user.id && data.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(data);
  } catch (err) { next(err); }
};

const submitReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { return_photos } = req.body;

    const { data: rental } = await supabase.from('rentals').select('*').eq('id', id).single();
    if (!rental) return res.status(404).json({ error: 'Not found' });
    if (rental.renter_id !== req.user.id) return res.status(403).json({ error: 'Only renter can submit return' });

    const { data } = await supabase
      .from('rentals')
      .update({ return_status: 'pending', return_photos: return_photos || [], status: 'returned' })
      .eq('id', id)
      .select()
      .single();

    await supabase.from('notifications').insert({
      user_id: rental.owner_id,
      type: 'rental_return_due',
      title: 'Item Return Submitted',
      content: 'Renter says they returned the item. Check condition and decide deposit.',
      metadata: { rental_id: id },
    });

    res.json(data);
  } catch (err) { next(err); }
};

const adminProcessReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { return_status, deposit_released, damage_deducted, admin_notes } = req.body;

    const { data: rental } = await supabase.from('rentals').select('*').eq('id', id).single();
    if (!rental) return res.status(404).json({ error: 'Not found' });

    const isOwner = rental.owner_id === req.user.id;
    const isAdmin = req.profile?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const damage = parseFloat(damage_deducted || 0);

    const { data: updated } = await supabase
      .from('rentals')
      .update({
        return_status,
        deposit_released: parseFloat(deposit_released),
        damage_deducted: damage,
        status: 'completed',
      })
      .eq('id', id)
      .select()
      .single();

    await supabase.from('transactions').update({
      status: 'completed',
      escrow_status: damage > 0 ? 'partial_release' : 'released',
      completed_at: new Date().toISOString(),
    }).eq('id', rental.transaction_id);

    await supabase.from('listings').update({ status: 'active' }).eq('id', rental.listing_id);

    await supabase.from('notifications').insert({
      user_id: rental.renter_id,
      type: 'escrow_released',
      title: 'Rental Complete',
      content: damage > 0
        ? `₹${deposit_released} returned. ₹${damage} deducted for damage.`
        : 'Full deposit returned. Thank you!',
      metadata: { rental_id: id, admin_notes },
    });

    res.json(updated);
  } catch (err) { next(err); }
};

module.exports = {
  bookRental, createRentalPaymentOrder, confirmRentalPayment,
  getMyRentals, getRentalById, submitReturn, adminProcessReturn,
};
