# DOC 5 — BUY/SELL FLOW + RAZORPAY ESCROW + QR MEETUP + GRACE TIMER
### AI-Powered Thrift Marketplace
> Part 5 of 8 | Covers: Razorpay sandbox integration, escrow state machine, QR code meetup, 15-min grace timer, no-show flows, Shiprocket delivery integration, order tracking

---

## 1. OVERVIEW

The transaction flow is the heartbeat of the platform. Money never goes directly to sellers — it goes into escrow and releases only on confirmed delivery or meetup scan.

```
Buy → Razorpay payment → escrow_held
  ├── MEETUP: QR generated → buyer scans → escrow released
  └── DELIVERY: Shiprocket order → delivered → auto-release
→ 24hr return window → dispute or complete
```

---

## 2. BACKEND — RAZORPAY SERVICE

### server/services/razorpay.js
```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order (sandbox)
 * amount in paise (multiply ₹ by 100)
 */
const createOrder = async (amountInRupees, currency = 'INR', notes = {}) => {
  const order = await razorpay.orders.create({
    amount:   Math.round(amountInRupees * 100),
    currency,
    receipt:  `thrift_${Date.now()}`,
    notes,
  });
  return order;
};

/**
 * Verify Razorpay payment signature
 */
const verifyPayment = (orderId, paymentId, signature) => {
  const crypto = require('crypto');
  const body   = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

module.exports = { createOrder, verifyPayment, razorpay };
```

---

## 3. BACKEND — SHIPROCKET SERVICE

### server/services/shiprocket.js
```javascript
const axios = require('axios');

let shiprocketToken = null;
let tokenExpiry     = null;

const authenticate = async () => {
  if (shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) {
    return shiprocketToken;
  }

  const { data } = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
    email:    process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  shiprocketToken = data.token;
  tokenExpiry     = Date.now() + 9 * 24 * 60 * 60 * 1000; // ~9 day token
  return shiprocketToken;
};

/**
 * Create a Shiprocket shipment order
 */
const createShipment = async ({
  orderId,
  buyerName,
  buyerEmail,
  buyerPhone,
  buyerAddress,
  buyerCity,
  buyerPincode,
  sellerName,
  sellerAddress,
  sellerCity,
  sellerPincode,
  itemName,
  itemWeight = 0.5,   // kg
  itemPrice,
}) => {
  const token = await authenticate();

  const { data } = await axios.post(
    'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
    {
      order_id:         orderId,
      order_date:       new Date().toISOString().split('T')[0],
      pickup_location:  'Primary',
      billing_customer_name: buyerName,
      billing_address:  buyerAddress,
      billing_city:     buyerCity,
      billing_pincode:  buyerPincode,
      billing_country_code: 'IN',
      billing_email:    buyerEmail,
      billing_phone:    buyerPhone,
      shipping_is_billing: true,
      order_items: [{
        name:      itemName,
        sku:       `THRIFT-${orderId}`,
        units:     1,
        selling_price: itemPrice,
        weight:    itemWeight,
      }],
      payment_method: 'Prepaid',
      sub_total:  itemPrice,
      length: 30, breadth: 20, height: 5, weight: itemWeight,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
};

/**
 * Track shipment by AWB number
 */
const trackShipment = async (awb) => {
  const token = await authenticate();
  const { data } = await axios.get(
    `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

module.exports = { createShipment, trackShipment, authenticate };
```

---

## 4. BACKEND — TRANSACTION ROUTES

### server/routes/transactions.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  createTransaction,
  createPaymentOrder,
  confirmPayment,
  getTransaction,
  getMyTransactions,
  chooseDeliveryType,
  confirmDelivery,
  cancelTransaction,
} = require('../controllers/transactionController');

router.get('/me',              authGuard, getMyTransactions);
router.get('/:id',             authGuard, getTransaction);
router.post('/',               authGuard, createTransaction);
router.post('/payment-order',  authGuard, createPaymentOrder);
router.post('/confirm-payment', authGuard, confirmPayment);
router.put('/:id/delivery-type', authGuard, chooseDeliveryType);
router.put('/:id/confirm-delivery', authGuard, confirmDelivery);
router.put('/:id/cancel',      authGuard, cancelTransaction);

module.exports = router;
```

---

## 5. BACKEND — TRANSACTION CONTROLLER

### server/controllers/transactionController.js
```javascript
const supabase    = require('../services/supabase');
const razorpayService = require('../services/razorpay');
const { generateMeetupQR } = require('../utils/qrGenerator');
const { recalculateTrustScore } = require('../utils/trustScore');
const { logSustainability }    = require('../utils/sustainability');

// ─── CREATE TRANSACTION (initiate buy) ───────────────────────
const createTransaction = async (req, res, next) => {
  try {
    const { listing_id, type = 'buy', delivery_type } = req.body;
    const buyer_id = req.user.id;

    // Validate listing
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ error: 'Listing is not available' });
    if (listing.seller_id === buyer_id) return res.status(400).json({ error: 'Cannot buy your own listing' });
    if (!listing.available_for?.includes(type)) {
      return res.status(400).json({ error: `Listing is not available for ${type}` });
    }

    // Mark listing as reserved
    await supabase.from('listings').update({ status: 'reserved', reserved_for: buyer_id })
      .eq('id', listing_id);

    // Create transaction record
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        buyer_id,
        seller_id:     listing.seller_id,
        listing_id,
        type,
        status:        'pending',
        amount:        listing.price,
        escrow_status: 'pending',
        delivery_type: delivery_type || 'meetup',
      })
      .select()
      .single();

    if (error) {
      // Unreserve listing on failure
      await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', listing_id);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ transaction, listing });
  } catch (err) {
    next(err);
  }
};

// ─── CREATE RAZORPAY PAYMENT ORDER ───────────────────────────
const createPaymentOrder = async (req, res, next) => {
  try {
    const { transaction_id } = req.body;

    const { data: txn } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .eq('buyer_id', req.user.id)
      .single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'pending') return res.status(400).json({ error: 'Payment already processed' });

    const order = await razorpayService.createOrder(txn.amount, 'INR', {
      transaction_id: txn.id,
      listing_id:     txn.listing_id,
    });

    // Store Razorpay order ID
    await supabase.from('transactions').update({ razorpay_order_id: order.id }).eq('id', transaction_id);

    res.json({
      order_id:   order.id,
      amount:     order.amount,
      currency:   order.currency,
      key_id:     process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
};

// ─── CONFIRM RAZORPAY PAYMENT ────────────────────────────────
const confirmPayment = async (req, res, next) => {
  try {
    const {
      transaction_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // Verify signature
    const valid = razorpayService.verifyPayment(
      razorpay_order_id, razorpay_payment_id, razorpay_signature
    );
    if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

    // Update transaction to escrow_held
    const { data: txn, error } = await supabase
      .from('transactions')
      .update({
        status:              'escrow_held',
        escrow_status:       'held',
        razorpay_payment_id,
      })
      .eq('id', transaction_id)
      .eq('buyer_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify seller
    await supabase.from('notifications').insert({
      user_id:  txn.seller_id,
      type:     'listing_sold',
      title:    'Your item has been purchased!',
      content:  'Payment is held in escrow. Choose meetup or delivery.',
      metadata: { transaction_id: txn.id, listing_id: txn.listing_id },
    });

    res.json({ transaction: txn });
  } catch (err) {
    next(err);
  }
};

// ─── CHOOSE DELIVERY TYPE (seller chooses after payment held) ─
const chooseDeliveryType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delivery_type, meetup_time, meetup_location } = req.body;

    const { data: txn } = await supabase
      .from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can set delivery type' });
    if (txn.status !== 'escrow_held') return res.status(400).json({ error: 'Payment not yet confirmed' });

    // Update transaction delivery type
    await supabase.from('transactions').update({ delivery_type }).eq('id', id);

    if (delivery_type === 'meetup') {
      // Generate QR and create meetup record
      const qrHash = generateMeetupQR(txn.listing_id, txn.id);

      const { data: meetup } = await supabase
        .from('meetups')
        .insert({
          transaction_id:  txn.id,
          scheduled_time:  meetup_time,
          location_note:   meetup_location || '',
          qr_code:         qrHash,
        })
        .select()
        .single();

      // Notify buyer
      await supabase.from('notifications').insert({
        user_id:  txn.buyer_id,
        type:     'meetup_reminder',
        title:    'Meetup Scheduled',
        content:  `Meet at ${meetup_location || 'agreed location'} on ${new Date(meetup_time).toLocaleString()}`,
        metadata: { transaction_id: txn.id, meetup_id: meetup.id },
      });

      return res.json({ delivery_type: 'meetup', meetup });
    }

    // Delivery path — seller creates Shiprocket order
    res.json({ delivery_type: 'delivery', message: 'Proceed to create shipment' });
  } catch (err) {
    next(err);
  }
};

// ─── CONFIRM DELIVERY (after Shiprocket delivers) ─────────────
const confirmDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: txn } = await supabase
      .from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.buyer_id !== req.user.id && txn.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not part of this transaction' });
    }

    const returnWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: updated } = await supabase
      .from('transactions')
      .update({
        status:            'completed',
        escrow_status:     'released',
        completed_at:      new Date().toISOString(),
        return_window_end: returnWindowEnd,
      })
      .eq('id', id)
      .select()
      .single();

    // Mark listing as sold
    await supabase.from('listings').update({ status: 'sold' }).eq('id', txn.listing_id);

    // Log sustainability impact
    const { data: listing } = await supabase.from('listings').select('category').eq('id', txn.listing_id).single();
    if (listing) await logSustainability(txn.id, listing.category);

    // Recalculate trust scores for both parties
    await recalculateTrustScore(txn.buyer_id);
    await recalculateTrustScore(txn.seller_id);

    // Notify both
    await supabase.from('notifications').insert([
      {
        user_id: txn.seller_id, type: 'escrow_released',
        title: 'Payment Released!', content: 'Escrow has been released to you.',
        metadata: { transaction_id: txn.id },
      },
      {
        user_id: txn.buyer_id, type: 'escrow_released',
        title: 'Transaction Complete', content: '24hr return window is open.',
        metadata: { transaction_id: txn.id },
      },
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ─── CANCEL TRANSACTION ───────────────────────────────────────
const cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: txn } = await supabase
      .from('transactions').select('*').eq('id', id).single();

    if (!txn) return res.status(404).json({ error: 'Not found' });
    if (txn.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only buyer can cancel' });
    if (!['pending', 'escrow_held'].includes(txn.status)) {
      return res.status(400).json({ error: 'Cannot cancel at this stage' });
    }

    await supabase.from('transactions').update({ status: 'cancelled', escrow_status: 'refunded' }).eq('id', id);
    await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', txn.listing_id);

    res.json({ message: 'Transaction cancelled, escrow refunded' });
  } catch (err) {
    next(err);
  }
};

// ─── GET TRANSACTION ──────────────────────────────────────────
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
  } catch (err) {
    next(err);
  }
};

// ─── GET MY TRANSACTIONS ──────────────────────────────────────
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
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransaction, createPaymentOrder, confirmPayment,
  getTransaction, getMyTransactions, chooseDeliveryType,
  confirmDelivery, cancelTransaction,
};
```

---

## 6. BACKEND — MEETUP ROUTES + GRACE TIMER

### server/routes/meetup.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getMeetup,
  confirmMeetup,
  fileNoShow,
  startGraceTimer,
} = require('../controllers/meetupController');

router.get('/:transactionId',     authGuard, getMeetup);
router.post('/confirm',           authGuard, confirmMeetup);    // buyer scans QR
router.post('/noshow',            authGuard, fileNoShow);
router.post('/start-grace',       authGuard, startGraceTimer);  // called at scheduled_time

module.exports = router;
```

### server/controllers/meetupController.js
```javascript
const supabase = require('../services/supabase');
const { verifyMeetupQR } = require('../utils/qrGenerator');
const { recalculateTrustScore } = require('../utils/trustScore');
const { logSustainability } = require('../utils/sustainability');

// ─── GET MEETUP ───────────────────────────────────────────────
const getMeetup = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const { data, error } = await supabase
      .from('meetups')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Meetup not found' });
    res.json(data);
  } catch (err) { next(err); }
};

// ─── START GRACE TIMER (called when scheduled_time is reached) ─
const startGraceTimer = async (req, res, next) => {
  try {
    const { transaction_id } = req.body;

    const { data: meetup } = await supabase
      .from('meetups')
      .select('*')
      .eq('transaction_id', transaction_id)
      .single();

    if (!meetup) return res.status(404).json({ error: 'Meetup not found' });
    if (meetup.grace_timer_start) return res.json({ message: 'Already started', meetup });

    const { data: updated } = await supabase
      .from('meetups')
      .update({
        status:            'active',
        grace_timer_start: new Date().toISOString(),
      })
      .eq('id', meetup.id)
      .select()
      .single();

    // Notify both parties
    const { data: txn } = await supabase.from('transactions').select('buyer_id,seller_id').eq('id', transaction_id).single();
    await supabase.from('notifications').insert([
      { user_id: txn.buyer_id, type: 'meetup_grace_start', title: '⏱ 15-minute window started', content: 'Scan the QR code when you meet the seller.', metadata: { transaction_id } },
      { user_id: txn.seller_id, type: 'meetup_grace_start', title: '⏱ 15-minute window started', content: 'Waiting for buyer to scan QR code.', metadata: { transaction_id } },
    ]);

    res.json(updated);
  } catch (err) { next(err); }
};

// ─── CONFIRM MEETUP (buyer scans QR) ─────────────────────────
const confirmMeetup = async (req, res, next) => {
  try {
    const { qr_hash, transaction_id } = req.body;

    // Verify QR
    const { data: meetup } = await supabase
      .from('meetups')
      .select('*')
      .eq('transaction_id', transaction_id)
      .single();

    if (!meetup) return res.status(404).json({ error: 'Meetup not found' });
    if (meetup.qr_used) return res.status(400).json({ error: 'QR already used' });
    if (!verifyMeetupQR(qr_hash, meetup.qr_code)) {
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    // Check grace period (15 min = 900,000 ms)
    if (meetup.grace_timer_start) {
      const elapsed = Date.now() - new Date(meetup.grace_timer_start).getTime();
      if (elapsed > 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Grace period has expired. File a no-show instead.' });
      }
    }

    // Mark meetup complete
    await supabase.from('meetups')
      .update({ status: 'completed', qr_used: true })
      .eq('id', meetup.id);

    // Release escrow
    const returnWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: txn } = await supabase
      .from('transactions')
      .update({
        status:            'completed',
        escrow_status:     'released',
        completed_at:      new Date().toISOString(),
        return_window_end: returnWindowEnd,
      })
      .eq('id', transaction_id)
      .select()
      .single();

    // Mark listing sold
    await supabase.from('listings').update({ status: 'sold' }).eq('id', txn.listing_id);

    // Log sustainability
    const { data: listing } = await supabase.from('listings').select('category').eq('id', txn.listing_id).single();
    if (listing) await logSustainability(txn.id, listing.category);

    // Recalculate trust
    await recalculateTrustScore(txn.buyer_id);
    await recalculateTrustScore(txn.seller_id);

    res.json({ success: true, message: 'Meetup confirmed! Escrow released.' });
  } catch (err) { next(err); }
};

// ─── FILE NO-SHOW ─────────────────────────────────────────────
const fileNoShow = async (req, res, next) => {
  try {
    const { transaction_id, filed_by_role } = req.body; // 'buyer' or 'seller'

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', transaction_id).single();
    const { data: meetup } = await supabase.from('meetups').select('*').eq('transaction_id', transaction_id).single();

    if (!txn || !meetup) return res.status(404).json({ error: 'Not found' });

    // Only transaction parties can file
    const isParty = txn.buyer_id === req.user.id || txn.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    // Check grace period has passed
    if (meetup.grace_timer_start) {
      const elapsed = Date.now() - new Date(meetup.grace_timer_start).getTime();
      if (elapsed < 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Grace period not yet expired (15 min)' });
      }
    }

    let meetupStatus, escrowAction, penalizedUserId;

    if (filed_by_role === 'buyer') {
      // Buyer says seller didn't show
      meetupStatus   = 'seller_noshow';
      escrowAction   = 'refunded';
      penalizedUserId = txn.seller_id;
    } else {
      // Seller says buyer didn't show
      meetupStatus   = 'buyer_noshow';
      escrowAction   = 'refunded';  // refund buyer (they came to meetup, seller didn't)
      penalizedUserId = txn.buyer_id;
    }

    // Update meetup
    await supabase.from('meetups').update({
      status: meetupStatus,
      noshow_filed_by: req.user.id,
    }).eq('id', meetup.id);

    // Refund escrow, reactivate listing
    await supabase.from('transactions').update({
      status:        'cancelled',
      escrow_status: escrowAction,
    }).eq('id', transaction_id);

    await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', txn.listing_id);

    // Penalize no-show user
    const { data: flaggedUser } = await supabase.from('users').select('trust_score').eq('id', penalizedUserId).single();
    const newScore = Math.max(0, (flaggedUser?.trust_score || 0) - 0.5);
    await supabase.from('users').update({ trust_score: newScore }).eq('id', penalizedUserId);

    res.json({ success: true, meetupStatus, message: 'No-show filed. Escrow refunded, listing reactivated.' });
  } catch (err) { next(err); }
};

module.exports = { getMeetup, confirmMeetup, fileNoShow, startGraceTimer };
```

---

## 7. BACKEND — DELIVERY ROUTES

### server/routes/delivery.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');
const shiprocket = require('../services/shiprocket');

// POST /api/delivery/create — seller creates shipment
router.post('/create', authGuard, async (req, res, next) => {
  try {
    const { transaction_id, buyer_details } = req.body;
    // buyer_details: { name, email, phone, address, city, pincode }

    const { data: txn } = await supabase.from('transactions').select(`
      *, listings(title, price, category)
    `).eq('id', transaction_id).single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can create shipment' });

    const { data: seller } = await supabase.from('users').select('name, locality').eq('id', req.user.id).single();

    const shipment = await shiprocket.createShipment({
      orderId:       `TXN-${txn.id.slice(0, 8)}`,
      buyerName:     buyer_details.name,
      buyerEmail:    buyer_details.email,
      buyerPhone:    buyer_details.phone,
      buyerAddress:  buyer_details.address,
      buyerCity:     buyer_details.city,
      buyerPincode:  buyer_details.pincode,
      sellerName:    seller.name,
      sellerAddress: seller.locality || 'Indore',
      sellerCity:    seller.locality || 'Indore',
      sellerPincode: '452001',
      itemName:      txn.listings?.title || 'Clothing Item',
      itemPrice:     txn.amount,
    });

    await supabase.from('transactions').update({
      status: 'in_transit',
      delivery_type: 'delivery',
    }).eq('id', transaction_id);

    res.json({ shipment });
  } catch (err) { next(err); }
});

// GET /api/delivery/track/:awb — track shipment
router.get('/track/:awb', authGuard, async (req, res, next) => {
  try {
    const tracking = await shiprocket.trackShipment(req.params.awb);
    res.json(tracking);
  } catch (err) { next(err); }
});

module.exports = router;
```

---

## 8. BACKEND — SUSTAINABILITY UTILITY

### server/utils/sustainability.js
```javascript
const supabase = require('../services/supabase');

const CO2_MAP = {
  tops:        { co2: 2.1,  water: 2700 },
  bottoms:     { co2: 3.8,  water: 7000 },
  dress:       { co2: 3.2,  water: 5000 },
  outerwear:   { co2: 5.5,  water: 4000 },
  footwear:    { co2: 2.8,  water: 1500 },
  accessories: { co2: 0.5,  water: 300  },
};

const logSustainability = async (transactionId, category) => {
  const impact = CO2_MAP[category] || CO2_MAP.tops;
  await supabase.from('sustainability_log').insert({
    transaction_id: transactionId,
    category,
    co2_saved_kg:   impact.co2,
    water_saved_l:  impact.water,
  });
};

const getUserImpact = async (userId) => {
  const { data: txns } = await supabase
    .from('transactions')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .eq('status', 'completed');

  if (!txns || txns.length === 0) return { co2_saved: 0, water_saved: 0, transactions: 0 };

  const ids = txns.map(t => t.id);
  const { data: logs } = await supabase
    .from('sustainability_log')
    .select('co2_saved_kg, water_saved_l')
    .in('transaction_id', ids);

  const co2_saved   = (logs || []).reduce((sum, l) => sum + l.co2_saved_kg, 0);
  const water_saved = (logs || []).reduce((sum, l) => sum + l.water_saved_l, 0);

  return {
    co2_saved:    parseFloat(co2_saved.toFixed(2)),
    water_saved:  Math.round(water_saved),
    transactions: txns.length,
  };
};

module.exports = { logSustainability, getUserImpact };
```

---

## 9. FRONTEND — ORDER TRACKING PAGE

### client/src/pages/OrderTracking.jsx
```jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import EscrowStatus from '../components/EscrowStatus';
import MeetupTimer from '../components/MeetupTimer';
import QRScanner from '../components/QRScanner';

const OrderTracking = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [txn, setTxn]           = useState(null);
  const [meetup, setMeetup]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showQR, setShowQR]     = useState(false);   // for buyer: show QR to scan
  const [showScanner, setShowScanner] = useState(false); // QR scanner (buyer)

  const isBuyer  = txn?.buyer_id  === user?.id;
  const isSeller = txn?.seller_id === user?.id;

  useEffect(() => {
    fetchTransaction();
    const interval = setInterval(fetchTransaction, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const { data } = await api.get(`/api/transactions/${id}`);
      setTxn(data);
      if (data.meetups?.[0]) setMeetup(data.meetups[0]);
    } catch {
      toast.error('Transaction not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScanned = async (hash) => {
    try {
      await api.post('/api/meetup/confirm', { qr_hash: hash, transaction_id: txn.id });
      toast.success('✅ Meetup confirmed! Escrow released.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'QR scan failed');
    }
  };

  const fileNoShow = async (role) => {
    try {
      await api.post('/api/meetup/noshow', { transaction_id: txn.id, filed_by_role: role });
      toast.success('No-show filed. Escrow refunded.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not file no-show');
    }
  };

  const confirmDelivery = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/confirm-delivery`);
      toast.success('Delivery confirmed! Transaction complete.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm delivery');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!txn)    return null;

  const listing = txn.listings;

  const STATUS_STEPS = ['pending', 'escrow_held', 'in_transit', 'completed'];
  const currentStep  = STATUS_STEPS.indexOf(txn.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Tracking</h1>
      <p className="text-gray-500 text-sm mb-6">Transaction #{txn.id.slice(0, 8).toUpperCase()}</p>

      {/* Listing Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 mb-6">
        <img src={listing?.images?.[0]} alt={listing?.title}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{listing?.title}</p>
          <p className="text-sm text-gray-500">₹{txn.amount?.toLocaleString()} · {txn.type} · {txn.delivery_type}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
          txn.status === 'completed'  ? 'bg-green-100 text-green-700' :
          txn.status === 'disputed'   ? 'bg-red-100 text-red-600' :
          txn.status === 'cancelled'  ? 'bg-gray-100 text-gray-500' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {txn.status.replace('_', ' ')}
        </span>
      </div>

      {/* Progress steps */}
      {!['cancelled','disputed','refunded'].includes(txn.status) && (
        <div className="flex items-center mb-6">
          {['Payment', 'Escrow Held', 'In Transit', 'Complete'].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i <= currentStep ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-green-500' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* Escrow Status */}
      <EscrowStatus status={txn.escrow_status} amount={txn.amount} />

      {/* ── MEETUP FLOW ── */}
      {txn.delivery_type === 'meetup' && meetup && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">📍 Meetup Details</h2>
          <p className="text-sm text-gray-600">
            <span className="font-medium">When:</span> {new Date(meetup.scheduled_time).toLocaleString()}
          </p>
          {meetup.location_note && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Where:</span> {meetup.location_note}
            </p>
          )}

          {/* Grace timer (only when active) */}
          {meetup.status === 'active' && meetup.grace_timer_start && (
            <MeetupTimer
              startTime={meetup.grace_timer_start}
              durationMinutes={15}
              onExpire={() => fetchTransaction()}
            />
          )}

          {/* QR Display for seller */}
          {isSeller && meetup.status !== 'completed' && !meetup.qr_used && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Show this QR to the buyer at the meetup:</p>
              <div className="flex justify-center">
                {/* QR displayed via QRCode library on frontend */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex items-center justify-center">
                  <QRCodeDisplay value={meetup.qr_code} />
                </div>
              </div>
            </div>
          )}

          {/* Scanner for buyer */}
          {isBuyer && meetup.status === 'active' && !meetup.qr_used && (
            <div className="mt-4">
              <button
                onClick={() => setShowScanner(true)}
                className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600"
              >
                📷 Scan Seller's QR Code
              </button>
            </div>
          )}

          {/* No-show buttons (after grace timer expires) */}
          {meetup.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 text-center">If the other party didn't show up:</p>
              <div className="flex gap-2">
                {isBuyer && (
                  <button onClick={() => fileNoShow('buyer')}
                    className="flex-1 border border-red-200 text-red-500 text-sm py-2 rounded-xl hover:bg-red-50">
                    Seller Didn't Show
                  </button>
                )}
                {isSeller && (
                  <button onClick={() => fileNoShow('seller')}
                    className="flex-1 border border-red-200 text-red-500 text-sm py-2 rounded-xl hover:bg-red-50">
                    Buyer Didn't Show
                  </button>
                )}
              </div>
            </div>
          )}

          {meetup.status === 'completed' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-green-700 font-medium text-sm">✅ Meetup completed! Escrow released.</p>
            </div>
          )}
        </div>
      )}

      {/* ── DELIVERY FLOW ── */}
      {txn.delivery_type === 'delivery' && txn.status === 'in_transit' && isBuyer && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">📦 Delivery</h2>
          <p className="text-sm text-gray-500 mb-4">Once you've received the item, confirm delivery to release escrow to the seller.</p>
          <button onClick={confirmDelivery}
            className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600">
            ✅ Confirm I Received the Item
          </button>
        </div>
      )}

      {/* Return window */}
      {txn.status === 'completed' && txn.return_window_end && new Date(txn.return_window_end) > new Date() && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-semibold text-amber-800 mb-1">⏰ 24hr Return Window Open</h3>
          <p className="text-sm text-amber-700">
            Dispute window closes: {new Date(txn.return_window_end).toLocaleString()}
          </p>
          <button
            onClick={() => navigate(`/dispute/${txn.id}`)}
            className="mt-3 text-sm border border-amber-400 text-amber-700 px-4 py-1.5 rounded-lg hover:bg-amber-100"
          >
            File a Dispute
          </button>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

// Simple QR display wrapper (uses qrcode.react)
const QRCodeDisplay = ({ value }) => {
  const [QRCode, setQRCode] = useState(null);
  useEffect(() => {
    import('qrcode.react').then(m => setQRCode(() => m.default || m.QRCodeSVG));
  }, []);
  if (!QRCode) return <div className="w-40 h-40 bg-gray-100 animate-pulse rounded" />;
  return <QRCode value={value} size={160} />;
};

export default OrderTracking;
```

---

## 10. FRONTEND — ESCROW STATUS COMPONENT

### client/src/components/EscrowStatus.jsx
```jsx
const ESCROW_STATES = {
  pending:          { label: 'Awaiting Payment',   color: 'bg-gray-100 text-gray-600',   icon: '⏳' },
  held:             { label: 'Escrow Held',         color: 'bg-yellow-100 text-yellow-700', icon: '🔒' },
  released:         { label: 'Escrow Released',     color: 'bg-green-100 text-green-700',  icon: '✅' },
  refunded:         { label: 'Refunded',            color: 'bg-blue-100 text-blue-700',    icon: '↩️' },
  partial_release:  { label: 'Partial Release',     color: 'bg-orange-100 text-orange-700',icon: '⚖️' },
};

const EscrowStatus = ({ status, amount }) => {
  const config = ESCROW_STATES[status] || ESCROW_STATES.pending;
  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${config.color}`}>
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className="font-semibold">{config.label}</p>
        {amount && <p className="text-sm opacity-80">₹{amount.toLocaleString()} {status === 'held' ? 'held safely' : ''}</p>}
      </div>
    </div>
  );
};

export default EscrowStatus;
```

---

## 11. FRONTEND — MEETUP TIMER COMPONENT

### client/src/components/MeetupTimer.jsx
```jsx
import { useState, useEffect } from 'react';

const MeetupTimer = ({ startTime, durationMinutes = 15, onExpire }) => {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const calc = () => {
      const start   = new Date(startTime).getTime();
      const end     = start + durationMinutes * 60 * 1000;
      const now     = Date.now();
      const left    = Math.max(0, end - now);
      setRemaining(left);
      if (left === 0 && onExpire) onExpire();
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  if (remaining === null) return null;

  const expired  = remaining === 0;
  const minutes  = Math.floor(remaining / 60000);
  const seconds  = Math.floor((remaining % 60000) / 1000);
  const pct      = ((durationMinutes * 60 * 1000 - remaining) / (durationMinutes * 60 * 1000)) * 100;

  return (
    <div className={`mt-4 rounded-xl p-4 ${expired ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`font-semibold text-sm ${expired ? 'text-red-700' : 'text-orange-700'}`}>
          {expired ? '⚠️ Grace Period Expired' : '⏱ Grace Period'}
        </p>
        {!expired && (
          <p className={`text-xl font-mono font-bold ${remaining < 5 * 60 * 1000 ? 'text-red-600' : 'text-orange-700'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        )}
      </div>
      {!expired && (
        <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${remaining < 5 * 60 * 1000 ? 'bg-red-500' : 'bg-orange-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className={`text-xs mt-2 ${expired ? 'text-red-600' : 'text-orange-600'}`}>
        {expired
          ? 'File a no-show if the other party did not arrive.'
          : 'Scan the QR code before the timer runs out.'}
      </p>
    </div>
  );
};

export default MeetupTimer;
```

---

## 12. FRONTEND — QR SCANNER COMPONENT

### client/src/components/QRScanner.jsx
```jsx
import { useEffect, useRef, useState } from 'react';

/**
 * Uses jsQR library (loaded from CDN) for QR scanning via camera.
 * In a real app, use a proper React QR library or the device camera API.
 * For this minor project demo, we allow manual QR hash entry as fallback.
 */
const QRScanner = ({ onScan, onClose }) => {
  const [manualHash, setManualHash] = useState('');
  const [error, setError]           = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualHash.trim()) return setError('Enter the QR code hash');
    onScan(manualHash.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Camera placeholder — in production, integrate react-qr-reader */}
        <div className="bg-gray-900 rounded-xl aspect-square flex items-center justify-center mb-4">
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">📷</p>
            <p className="text-sm">Camera preview</p>
            <p className="text-xs opacity-60">Point at seller's QR code</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-3">— or enter hash manually —</p>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            value={manualHash}
            onChange={e => setManualHash(e.target.value)}
            placeholder="Paste QR hash here (for demo)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-500 text-white font-semibold py-2.5 rounded-xl hover:bg-green-600"
          >
            Confirm Scan
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
```

---

## 13. FRONTEND — RAZORPAY CHECKOUT INTEGRATION

### client/src/hooks/useRazorpay.js
```javascript
import { useCallback } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

/**
 * useRazorpay hook
 * Usage: const { initiatePayment } = useRazorpay();
 *        await initiatePayment(transactionId, onSuccess);
 */
const useRazorpay = () => {
  const loadScript = () =>
    new Promise(resolve => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script   = document.createElement('script');
      script.id      = 'razorpay-script';
      script.src     = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const initiatePayment = useCallback(async (transactionId, onSuccess) => {
    const loaded = await loadScript();
    if (!loaded) return toast.error('Payment gateway failed to load');

    try {
      // Create Razorpay order
      const { data } = await api.post('/api/transactions/payment-order', { transaction_id: transactionId });

      const options = {
        key:      data.key_id,
        amount:   data.amount,
        currency: data.currency,
        name:     'Thrift Marketplace',
        description: 'Secure escrow payment',
        order_id: data.order_id,
        handler: async (response) => {
          try {
            // Verify on backend
            await api.post('/api/transactions/confirm-payment', {
              transaction_id:       transactionId,
              razorpay_order_id:    response.razorpay_order_id,
              razorpay_payment_id:  response.razorpay_payment_id,
              razorpay_signature:   response.razorpay_signature,
            });
            toast.success('Payment successful! Escrow held.');
            if (onSuccess) onSuccess();
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill:  { name: '', email: '', contact: '' },
        theme:    { color: '#22c55e' },
        modal: { ondismiss: () => toast('Payment cancelled') },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate payment');
    }
  }, []);

  return { initiatePayment };
};

export default useRazorpay;
```

---

## 14. API ENDPOINT SUMMARY — TRANSACTIONS & MEETUP MODULE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/transactions` | Yes | Initiate a transaction (buy) |
| GET | `/api/transactions/me` | Yes | My transactions (buyer/seller) |
| GET | `/api/transactions/:id` | Yes | Single transaction detail |
| POST | `/api/transactions/payment-order` | Yes | Create Razorpay order |
| POST | `/api/transactions/confirm-payment` | Yes | Verify Razorpay payment |
| PUT | `/api/transactions/:id/delivery-type` | Yes | Seller chooses meetup/delivery |
| PUT | `/api/transactions/:id/confirm-delivery` | Yes | Confirm item received |
| PUT | `/api/transactions/:id/cancel` | Yes | Cancel transaction |
| GET | `/api/meetup/:transactionId` | Yes | Get meetup details |
| POST | `/api/meetup/start-grace` | Yes | Start 15-min grace timer |
| POST | `/api/meetup/confirm` | Yes | Buyer scans QR → release escrow |
| POST | `/api/meetup/noshow` | Yes | File no-show |
| POST | `/api/delivery/create` | Yes | Create Shiprocket shipment |
| GET | `/api/delivery/track/:awb` | Yes | Track shipment |

---

## NEXT: DOC 6 — Real-time Chat + Smart Swap Engine
Supabase Realtime chat with typing indicators and read receipts, full swap engine with valuation gap payment, mutual confirmation flow, and swap-specific meetup handling.
