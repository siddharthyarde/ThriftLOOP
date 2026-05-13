# DOC 7 — VIRTUAL TRY-ON + RENTAL FLOW + DISPUTE RESOLUTION
### AI-Powered Thrift Marketplace
> Part 7 of 8 | Covers: API4AI virtual try-on with photo caching, rental booking/return/damage flow, dispute filing with evidence upload, size confidence feedback

---

## 1. OVERVIEW

### Virtual Try-On
- User opens listing → clicks "Try This On"
- Modal shows listing photo + user's saved photos (or upload new)
- Server checks cache (`tryon_results`) first → calls API4AI if not cached
- Result displayed → user can save or download
- Post try-on: "Does this fit?" feedback stored as `fit_feedback`

### Rental Flow
- Owner lists item with `rental_price_per_day` + `rental_deposit`
- Renter picks start/end dates → pays rent + deposit into escrow
- Item dispatched (meetup or delivery) → rental active
- On return date: owner reviews condition → deposit action triggered
- Admin handles disputes if damage is contested

### Dispute Resolution
- Filed within 24hr return window
- 3 types: `condition_mismatch`, `rental_damage`, `swap_misrepresentation`
- Evidence photos + timestamps uploaded
- Admin reviews side-by-side → makes decision → escrow action

---

## 2. BACKEND — VIRTUAL TRY-ON SERVICE

### server/services/api4ai.js
```javascript
const axios = require('axios');
const FormData = require('form-data');

/**
 * Call API4AI virtual try-on endpoint.
 * clothingImageUrl: public URL of the listing's clothing photo
 * userImageBase64:  base64 encoded user body photo
 * Returns result URL (hosted by API4AI) or throws
 */
const tryOn = async (clothingImageUrl, userImageBase64) => {
  const formData = new FormData();
  formData.append('url',    clothingImageUrl);

  // Convert base64 to buffer
  const buffer = Buffer.from(userImageBase64, 'base64');
  formData.append('image',  buffer, { filename: 'person.jpg', contentType: 'image/jpeg' });

  const response = await axios.post(
    process.env.API4AI_ENDPOINT || 'https://api4ai.cloud/fashion/virtual-tryon',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.API4AI_KEY}`,
      },
      timeout: 30000,
    }
  );

  // Extract result URL from API4AI response structure
  const result = response.data?.results?.[0];
  if (!result) throw new Error('Try-on API returned no result');

  return result.url || result.image_url || result.output_url;
};

module.exports = { tryOn };
```

---

## 3. BACKEND — TRY-ON ROUTES

### server/routes/tryon.js
```javascript
const express = require('express');
const router  = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  performTryOn,
  getTryOnHistory,
  submitFitFeedback,
  saveTryOnResult,
} = require('../controllers/tryonController');

router.post('/',              authGuard, performTryOn);
router.get('/history',        authGuard, getTryOnHistory);
router.put('/:id/feedback',   authGuard, submitFitFeedback);
router.put('/:id/save',       authGuard, saveTryOnResult);

module.exports = router;
```

---

## 4. BACKEND — TRY-ON CONTROLLER

### server/controllers/tryonController.js
```javascript
const supabase  = require('../services/supabase');
const api4ai    = require('../services/api4ai');

// ─── PERFORM TRY-ON ───────────────────────────────────────────
const performTryOn = async (req, res, next) => {
  try {
    const { listing_id, user_photo_url, user_photo_base64 } = req.body;
    const userId = req.user.id;

    if (!listing_id) return res.status(400).json({ error: 'listing_id required' });
    if (!user_photo_url && !user_photo_base64) {
      return res.status(400).json({ error: 'user_photo_url or user_photo_base64 required' });
    }

    // Fetch listing
    const { data: listing } = await supabase
      .from('listings')
      .select('id, images, title')
      .eq('id', listing_id)
      .single();

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.images?.[0]) return res.status(400).json({ error: 'Listing has no images' });

    // ── Check cache first ──────────────────────────────────────
    const photoKey = user_photo_url || 'uploaded';
    const { data: cached } = await supabase
      .from('tryon_results')
      .select('*')
      .eq('user_id', userId)
      .eq('listing_id', listing_id)
      .eq('user_photo_url', photoKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return res.json({
        result_url: cached.result_url,
        tryon_id:   cached.id,
        cached:     true,
        fit_feedback: cached.fit_feedback,
      });
    }

    // ── Upload user photo if base64 ────────────────────────────
    let resolvedPhotoUrl = user_photo_url;
    if (!user_photo_url && user_photo_base64) {
      const buffer   = Buffer.from(user_photo_base64, 'base64');
      const fileName = `tryon/${userId}/${Date.now()}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('user-photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg' });

      if (uploadErr) return res.status(500).json({ error: 'Photo upload failed' });

      const { data: { signedUrl } } = await supabase.storage
        .from('user-photos')
        .createSignedUrl(fileName, 365 * 24 * 60 * 60);

      resolvedPhotoUrl = signedUrl;

      // Save to user_photos for reuse
      await supabase.from('user_photos').insert({
        user_id:   userId,
        photo_url: resolvedPhotoUrl,
        label:     'Try-On Photo',
      });
    }

    // ── Call API4AI ────────────────────────────────────────────
    const clothingUrl   = listing.images[0];
    const userBase64    = user_photo_base64 || await fetchAsBase64(resolvedPhotoUrl);
    const resultUrl     = await api4ai.tryOn(clothingUrl, userBase64);

    // Upload result to Supabase Storage for persistence
    let persistedUrl = resultUrl;
    try {
      const resultBuffer = await fetchAsBuffer(resultUrl);
      const resultFile   = `tryon-results/${userId}/${Date.now()}.jpg`;
      await supabase.storage.from('tryon-results').upload(resultFile, resultBuffer, { contentType: 'image/jpeg' });
      const { data: { signedUrl: resUrl } } = await supabase.storage.from('tryon-results').createSignedUrl(resultFile, 365 * 24 * 60 * 60);
      persistedUrl = resUrl;
    } catch {
      // Fallback: use API4AI's URL directly (may expire)
    }

    // ── Save result to DB ──────────────────────────────────────
    const { data: tryonRecord, error } = await supabase
      .from('tryon_results')
      .insert({
        user_id:        userId,
        listing_id,
        user_photo_url: resolvedPhotoUrl,
        result_url:     persistedUrl,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      result_url:   persistedUrl,
      tryon_id:     tryonRecord.id,
      cached:       false,
      fit_feedback: null,
    });
  } catch (err) {
    if (err.response?.status === 402) {
      return res.status(402).json({ error: 'Try-on API credits exhausted. Please try later.' });
    }
    next(err);
  }
};

// ─── GET TRY-ON HISTORY ───────────────────────────────────────
const getTryOnHistory = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tryon_results')
      .select(`*, listings(id, title, images, price)`)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

// ─── SUBMIT FIT FEEDBACK ──────────────────────────────────────
const submitFitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fit_feedback } = req.body;
    const valid = ['fits_well', 'too_big', 'too_small'];

    if (!valid.includes(fit_feedback)) {
      return res.status(400).json({ error: `fit_feedback must be one of: ${valid.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('tryon_results')
      .update({ fit_feedback })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

// ─── SAVE TRY-ON RESULT ───────────────────────────────────────
const saveTryOnResult = async (req, res, next) => {
  try {
    // Result is already saved on creation; this endpoint just confirms it
    const { data } = await supabase
      .from('tryon_results')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!data) return res.status(404).json({ error: 'Try-on result not found' });
    res.json({ saved: true, result_url: data.result_url });
  } catch (err) { next(err); }
};

// ─── HELPERS ──────────────────────────────────────────────────
const fetchAsBase64 = async (url) => {
  const axios  = require('axios');
  const resp   = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data).toString('base64');
};

const fetchAsBuffer = async (url) => {
  const axios = require('axios');
  const resp  = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
};

module.exports = { performTryOn, getTryOnHistory, submitFitFeedback, saveTryOnResult };
```

---

## 5. FRONTEND — TRY-ON MODAL COMPONENT

### client/src/components/TryOnModal.jsx
```jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const FIT_OPTIONS = [
  { value: 'fits_well', label: '✅ Fits well', color: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'too_big',   label: '📦 Too big',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'too_small', label: '🫸 Too small', color: 'border-red-400 bg-red-50 text-red-600' },
];

const TryOnModal = ({ listing, onClose }) => {
  const { user } = useAuth();

  const [savedPhotos,  setSavedPhotos]  = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);  // { url, type: 'saved'|'upload' }
  const [uploadedBase64, setUploadedBase64] = useState(null);
  const [resultUrl,    setResultUrl]    = useState(null);
  const [tryonId,      setTryonId]      = useState(null);
  const [fitFeedback,  setFitFeedback]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [step,         setStep]         = useState('select'); // 'select' | 'result'
  const [cached,       setCached]       = useState(false);

  useEffect(() => {
    fetchSavedPhotos();
  }, []);

  const fetchSavedPhotos = async () => {
    const { data } = await api.get('/api/user-photos').catch(() => ({ data: [] }));
    setSavedPhotos(data || []);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setUploadedBase64(base64);
      setSelectedPhoto({ url: reader.result, type: 'upload' });
    };
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!selectedPhoto) return toast.error('Select a photo first');
    setLoading(true);
    try {
      const payload = {
        listing_id:       listing.id,
        user_photo_url:   selectedPhoto.type === 'saved' ? selectedPhoto.url : undefined,
        user_photo_base64: selectedPhoto.type === 'upload' ? uploadedBase64 : undefined,
      };
      const { data } = await api.post('/api/tryon', payload);
      setResultUrl(data.result_url);
      setTryonId(data.tryon_id);
      setCached(data.cached);
      setStep('result');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Try-on failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (value) => {
    setFitFeedback(value);
    await api.put(`/api/tryon/${tryonId}/feedback`, { fit_feedback: value }).catch(() => {});
  };

  const handleDownload = () => {
    const a   = document.createElement('a');
    a.href    = resultUrl;
    a.download = `tryon-${listing.id}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">👗 Virtual Try-On</h2>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="p-5">
          {step === 'select' && (
            <>
              {/* Listing preview */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 text-center">Clothing</p>
                  <img src={listing.images?.[0]} alt={listing.title}
                    className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                </div>
                <div className="flex items-center text-gray-300 text-2xl">+</div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 text-center">Your Photo</p>
                  {selectedPhoto ? (
                    <div className="relative">
                      <img src={selectedPhoto.url} alt="You"
                        className="w-full aspect-square object-cover rounded-xl border-2 border-green-400" />
                      <button
                        onClick={() => { setSelectedPhoto(null); setUploadedBase64(null); }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Saved photos */}
              {savedPhotos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Saved Photos</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {savedPhotos.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPhoto({ url: p.photo_url, type: 'saved' })}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                          selectedPhoto?.url === p.photo_url ? 'border-green-500' : 'border-transparent'
                        }`}
                      >
                        <img src={p.photo_url} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new */}
              <label className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-green-400 transition mb-5">
                <span className="text-xl">📷</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">Upload a new photo</p>
                  <p className="text-xs text-gray-400">Full body, front-facing works best</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>

              <button
                onClick={handleTryOn}
                disabled={!selectedPhoto || loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Generating (10–30s)…
                  </span>
                ) : '✨ Try This On'}
              </button>
            </>
          )}

          {step === 'result' && resultUrl && (
            <>
              {cached && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs text-blue-600 mb-3 text-center">
                  ⚡ Loaded from cache
                </div>
              )}

              {/* Side by side */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-xs text-gray-400 text-center mb-1">Original</p>
                  <img src={listing.images?.[0]} alt="Original" className="w-full aspect-square object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 text-center mb-1">Try-On Result</p>
                  <img src={resultUrl} alt="Try-On Result" className="w-full aspect-square object-cover rounded-xl border-2 border-green-400" />
                </div>
              </div>

              {/* Fit feedback */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">How does it look?</p>
                <div className="flex gap-2">
                  {FIT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleFeedback(opt.value)}
                      className={`flex-1 text-xs font-medium py-2 px-2 rounded-xl border-2 transition ${
                        fitFeedback === opt.value ? opt.color : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('select'); setResultUrl(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
                >
                  ← Try Different Photo
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm hover:bg-green-600 font-medium"
                >
                  ⬇ Download
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnModal;
```

---

## 6. BACKEND — RENTAL ROUTES

### server/routes/rental.js
```javascript
const express = require('express');
const router  = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  bookRental,
  createRentalPaymentOrder,
  confirmRentalPayment,
  getMyRentals,
  getRentalById,
  submitReturn,
  adminProcessReturn,
} = require('../controllers/rentalController');

router.post('/',              authGuard, bookRental);
router.post('/payment-order', authGuard, createRentalPaymentOrder);
router.post('/confirm-payment', authGuard, confirmRentalPayment);
router.get('/me',             authGuard, getMyRentals);
router.get('/:id',            authGuard, getRentalById);
router.put('/:id/return',     authGuard, submitReturn);
router.put('/:id/admin-process', authGuard, adminProcessReturn); // admin only

module.exports = router;
```

---

## 7. BACKEND — RENTAL CONTROLLER

### server/controllers/rentalController.js
```javascript
const supabase = require('../services/supabase');
const razorpayService = require('../services/razorpay');

// ─── BOOK RENTAL ──────────────────────────────────────────────
const bookRental = async (req, res, next) => {
  try {
    const { listing_id, start_date, end_date } = req.body;
    const renterId = req.user.id;

    // Validate listing
    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.available_for?.includes('rental')) return res.status(400).json({ error: 'Not available for rental' });
    if (listing.status !== 'active') return res.status(400).json({ error: 'Listing not available' });
    if (listing.seller_id === renterId) return res.status(400).json({ error: 'Cannot rent your own item' });

    const start = new Date(start_date);
    const end   = new Date(end_date);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid rental dates' });
    }

    const days       = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const rent_amount = parseFloat((listing.rental_price_per_day * days).toFixed(2));
    const deposit    = listing.rental_deposit;
    const total      = rent_amount + deposit;

    // Create transaction
    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        buyer_id:      renterId,
        seller_id:     listing.seller_id,
        listing_id,
        type:          'rental',
        status:        'pending',
        amount:        total,
        escrow_status: 'pending',
        delivery_type: 'meetup',
      })
      .select()
      .single();

    // Create rental record
    const { data: rental, error } = await supabase
      .from('rentals')
      .insert({
        transaction_id: txn.id,
        listing_id,
        renter_id:      renterId,
        owner_id:       listing.seller_id,
        start_date,
        end_date,
        rent_amount,
        deposit,
        status:         'booked',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({
      rental,
      transaction:  txn,
      breakdown: {
        days,
        rent_per_day:  listing.rental_price_per_day,
        rent_amount,
        deposit,
        total_due:     total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── CREATE RENTAL PAYMENT ORDER ─────────────────────────────
const createRentalPaymentOrder = async (req, res, next) => {
  try {
    const { rental_id } = req.body;

    const { data: rental } = await supabase
      .from('rentals')
      .select('*, transactions(*)')
      .eq('id', rental_id)
      .single();

    if (!rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.renter_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const total  = rental.rent_amount + rental.deposit;
    const order  = await razorpayService.createOrder(total, 'INR', { rental_id: rental.id });

    await supabase.from('transactions').update({ razorpay_order_id: order.id }).eq('id', rental.transaction_id);

    res.json({
      order_id:  order.id,
      amount:    order.amount,
      currency:  order.currency,
      key_id:    process.env.RAZORPAY_KEY_ID,
      breakdown: { rent: rental.rent_amount, deposit: rental.deposit },
    });
  } catch (err) { next(err); }
};

// ─── CONFIRM RENTAL PAYMENT ───────────────────────────────────
const confirmRentalPayment = async (req, res, next) => {
  try {
    const { rental_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const valid = razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

    const { data: rental } = await supabase.from('rentals').select('*').eq('id', rental_id).single();
    if (!rental) return res.status(404).json({ error: 'Not found' });

    await supabase.from('rentals').update({ status: 'active' }).eq('id', rental_id);
    await supabase.from('transactions').update({
      status: 'escrow_held', escrow_status: 'held', razorpay_payment_id,
    }).eq('id', rental.transaction_id);

    await supabase.from('listings').update({ status: 'rented' }).eq('id', rental.listing_id);

    // Notify owner
    await supabase.from('notifications').insert({
      user_id:  rental.owner_id,
      type:     'listing_sold',
      title:    'Your item has been rented!',
      content:  `Rental period: ${rental.start_date} → ${rental.end_date}. Deposit held in escrow.`,
      metadata: { rental_id, transaction_id: rental.transaction_id },
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};

// ─── GET MY RENTALS ───────────────────────────────────────────
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

// ─── GET RENTAL BY ID ─────────────────────────────────────────
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

// ─── SUBMIT RETURN (renter submits return photos) ─────────────
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

    // Notify owner to inspect and decide on deposit
    await supabase.from('notifications').insert({
      user_id:  rental.owner_id,
      type:     'rental_return_due',
      title:    'Item Return Submitted',
      content:  'Renter says they returned the item. Check condition and decide deposit.',
      metadata: { rental_id: id },
    });

    res.json(data);
  } catch (err) { next(err); }
};

// ─── ADMIN PROCESS RETURN (owner/admin decides deposit) ───────
const adminProcessReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { return_status, deposit_released, damage_deducted, admin_notes } = req.body;

    // Only owner or admin
    const { data: rental } = await supabase.from('rentals').select('*').eq('id', id).single();
    if (!rental) return res.status(404).json({ error: 'Not found' });

    const isOwner = rental.owner_id === req.user.id;
    const isAdmin = req.profile?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { data: updated } = await supabase
      .from('rentals')
      .update({
        return_status,
        deposit_released: parseFloat(deposit_released),
        damage_deducted:  parseFloat(damage_deducted || 0),
        status:           'completed',
      })
      .eq('id', id)
      .select()
      .single();

    // Update escrow based on deposit_released
    await supabase.from('transactions').update({
      status:        'completed',
      escrow_status: damage_deducted > 0 ? 'partial_release' : 'released',
      completed_at:  new Date().toISOString(),
    }).eq('id', rental.transaction_id);

    // Reactivate listing
    await supabase.from('listings').update({ status: 'active' }).eq('id', rental.listing_id);

    // Notify renter
    await supabase.from('notifications').insert({
      user_id:  rental.renter_id,
      type:     'escrow_released',
      title:    'Rental Complete',
      content:  damage_deducted > 0
        ? `₹${deposit_released} returned. ₹${damage_deducted} deducted for damage.`
        : 'Full deposit returned. Thank you!',
      metadata: { rental_id: id },
    });

    res.json(updated);
  } catch (err) { next(err); }
};

module.exports = { bookRental, createRentalPaymentOrder, confirmRentalPayment, getMyRentals, getRentalById, submitReturn, adminProcessReturn };
```

---

## 8. FRONTEND — RENTAL PAGE

### client/src/pages/RentalPage.jsx
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import useRazorpay from '../hooks/useRazorpay';

const RentalPage = () => {
  const { id: listingId } = useParams();
  const navigate          = useNavigate();
  const { user }          = useAuth();
  const { initiatePayment } = useRazorpay();

  const [listing, setListing]   = useState(null);
  const [dates, setDates]       = useState({ start: '', end: '' });
  const [rental, setRental]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [booking, setBooking]   = useState(false);

  useEffect(() => {
    api.get(`/api/listings/${listingId}`)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [listingId]);

  const calcBreakdown = () => {
    if (!dates.start || !dates.end || !listing) return null;
    const start = new Date(dates.start);
    const end   = new Date(dates.end);
    if (end <= start) return null;
    const days        = Math.ceil((end - start) / 86400000);
    const rent_amount = days * listing.rental_price_per_day;
    const deposit     = listing.rental_deposit;
    return { days, rent_amount, deposit, total: rent_amount + deposit };
  };

  const breakdown = calcBreakdown();

  const handleBook = async () => {
    if (!breakdown) return toast.error('Select valid dates');
    setBooking(true);
    try {
      const { data } = await api.post('/api/rental', {
        listing_id: listingId,
        start_date: dates.start,
        end_date:   dates.end,
      });
      setRental(data.rental);
      toast.success('Rental booked! Proceed to payment.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handlePayment = async () => {
    try {
      const { data: order } = await api.post('/api/rental/payment-order', { rental_id: rental.id });

      const loaded = await new Promise(res => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => res(true);
        document.body.appendChild(s);
      });

      const rzp = new window.Razorpay({
        key:      order.key_id,
        amount:   order.amount,
        currency: order.currency,
        name:     'Thrift Marketplace',
        description: 'Rental payment + deposit',
        order_id: order.order_id,
        handler: async (response) => {
          await api.post('/api/rental/confirm-payment', {
            rental_id:            rental.id,
            razorpay_order_id:    response.razorpay_order_id,
            razorpay_payment_id:  response.razorpay_payment_id,
            razorpay_signature:   response.razorpay_signature,
          });
          toast.success('Rental confirmed!');
          navigate('/');
        },
        theme: { color: '#22c55e' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!listing) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Rent This Item</h1>
      <p className="text-gray-500 text-sm mb-6">Deposit returned after condition check.</p>

      {/* Item card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-3 mb-6">
        <img src={listing.images?.[0]} alt={listing.title}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
        <div>
          <p className="font-semibold text-gray-900">{listing.title}</p>
          <p className="text-green-600 font-bold">₹{listing.rental_price_per_day}/day</p>
          <p className="text-xs text-gray-400 mt-1">Security deposit: ₹{listing.rental_deposit}</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 mb-6">
        <h2 className="font-semibold text-gray-800">Select Rental Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input type="date" min={today}
              value={dates.start}
              onChange={e => setDates({ ...dates, start: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input type="date" min={dates.start || today}
              value={dates.end}
              onChange={e => setDates({ ...dates, end: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{breakdown.days} days × ₹{listing.rental_price_per_day}</span>
              <span>₹{breakdown.rent_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Security deposit (refundable)</span>
              <span>₹{breakdown.deposit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
              <span>Total Due Now</span>
              <span className="text-green-600">₹{breakdown.total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      {!rental ? (
        <button
          onClick={handleBook}
          disabled={!breakdown || booking}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
        >
          {booking ? 'Booking…' : '📦 Book Rental'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-green-700 text-sm font-medium">✅ Booking confirmed! Pay to activate.</p>
          </div>
          <button
            onClick={handlePayment}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
          >
            💳 Pay ₹{breakdown?.total.toLocaleString()}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Payment is held in escrow. Deposit is released after the owner verifies the returned item.
      </p>
    </div>
  );
};

export default RentalPage;
```

---

## 9. BACKEND — DISPUTE ROUTES

### server/routes/dispute.js
```javascript
const express = require('express');
const router  = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  fileDIspute,
  getMyDisputes,
  getDisputeById,
  uploadEvidence,
  getAdminDisputes,
  resolveDispute,
} = require('../controllers/disputeController');

router.post('/',                  authGuard, fileDIspute);
router.get('/me',                 authGuard, getMyDisputes);
router.get('/:id',                authGuard, getDisputeById);
router.post('/:id/evidence',      authGuard, uploadEvidence);
router.get('/admin/all',          authGuard, getAdminDisputes);
router.put('/:id/resolve',        authGuard, resolveDispute);

module.exports = router;
```

---

## 10. BACKEND — DISPUTE CONTROLLER

### server/controllers/disputeController.js
```javascript
const supabase = require('../services/supabase');

// ─── FILE DISPUTE ─────────────────────────────────────────────
const fileDIspute = async (req, res, next) => {
  try {
    const { transaction_id, type, description, evidence_photos } = req.body;
    const userId = req.user.id;

    const { data: txn } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    const isParty = txn.buyer_id === userId || txn.seller_id === userId;
    if (!isParty) return res.status(403).json({ error: 'Not your transaction' });

    // Check return window (24hr)
    if (txn.return_window_end && new Date() > new Date(txn.return_window_end)) {
      return res.status(400).json({ error: 'Return window has expired (24hr limit)' });
    }

    // Check no existing open dispute
    const { data: existing } = await supabase
      .from('disputes')
      .select('id')
      .eq('transaction_id', transaction_id)
      .neq('status', 'resolved')
      .single();

    if (existing) return res.status(409).json({ error: 'A dispute already exists for this transaction' });

    const against = txn.buyer_id === userId ? txn.seller_id : txn.buyer_id;

    // Fetch listing original photo for comparison
    const { data: listing } = await supabase.from('listings').select('images, created_at').eq('id', txn.listing_id).single();

    const { data: dispute, error } = await supabase
      .from('disputes')
      .insert({
        transaction_id,
        type,
        filed_by:       userId,
        against,
        description,
        evidence_filer: evidence_photos || [],
        listing_photo:  listing?.images?.[0] || null,
        listing_photo_timestamp: listing?.created_at || null,
        complaint_photo_timestamp: new Date().toISOString(),
        status:         'open',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Update transaction status
    await supabase.from('transactions').update({ status: 'disputed' }).eq('id', transaction_id);

    // Notify admin and both parties
    await supabase.from('notifications').insert([
      {
        user_id: against, type: 'dispute_update',
        title: 'A dispute was filed against you',
        content: `Dispute type: ${type}. Upload your evidence within 48 hours.`,
        metadata: { dispute_id: dispute.id, transaction_id },
      },
    ]);

    res.status(201).json(dispute);
  } catch (err) { next(err); }
};

// ─── GET MY DISPUTES ──────────────────────────────────────────
const getMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('disputes')
      .select(`*, transactions(*, listings(id, title, images))`)
      .or(`filed_by.eq.${userId},against.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

// ─── GET DISPUTE BY ID ────────────────────────────────────────
const getDisputeById = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('disputes')
      .select(`*, transactions(*, listings(*))`)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });

    const isAdmin = req.profile?.role === 'admin';
    const isParty = data.filed_by === userId || data.against === userId;
    if (!isAdmin && !isParty) return res.status(403).json({ error: 'Forbidden' });

    res.json(data);
  } catch (err) { next(err); }
};

// ─── UPLOAD EVIDENCE ─────────────────────────────────────────
const uploadEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { evidence_photos } = req.body; // Array of already-uploaded Supabase Storage URLs
    const userId = req.user.id;

    const { data: dispute } = await supabase.from('disputes').select('*').eq('id', id).single();
    if (!dispute) return res.status(404).json({ error: 'Not found' });

    const isFiler   = dispute.filed_by === userId;
    const isDefense = dispute.against  === userId;
    if (!isFiler && !isDefense) return res.status(403).json({ error: 'Forbidden' });

    const update = isFiler
      ? { evidence_filer:   evidence_photos, status: 'under_review' }
      : { evidence_defense: evidence_photos, status: 'under_review' };

    const { data, error } = await supabase
      .from('disputes').update(update).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

// ─── GET ALL DISPUTES (admin) ─────────────────────────────────
const getAdminDisputes = async (req, res, next) => {
  try {
    if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { status } = req.query;

    let query = supabase
      .from('disputes')
      .select(`
        *,
        transactions(*, listings(id, title, images, price, category)),
        filer:users!filed_by(id, name, avatar_url, trust_score),
        defendant:users!against(id, name, avatar_url, trust_score)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

// ─── RESOLVE DISPUTE (admin) ──────────────────────────────────
const resolveDispute = async (req, res, next) => {
  try {
    if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { id } = req.params;
    const { admin_decision, admin_notes, refund_amount } = req.body;
    const validDecisions = ['buyer_wins', 'seller_wins', 'partial_refund', 'no_action'];

    if (!validDecisions.includes(admin_decision)) {
      return res.status(400).json({ error: `admin_decision must be one of: ${validDecisions.join(', ')}` });
    }

    const { data: dispute } = await supabase.from('disputes').select('*').eq('id', id).single();
    if (!dispute) return res.status(404).json({ error: 'Not found' });

    const { data: updated } = await supabase
      .from('disputes')
      .update({
        admin_decision,
        admin_notes,
        refund_amount: refund_amount ? parseFloat(refund_amount) : null,
        status:        'resolved',
        resolved_at:   new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    // Trigger escrow action based on decision
    let escrowStatus;
    if (admin_decision === 'buyer_wins') {
      escrowStatus = 'refunded';
    } else if (admin_decision === 'seller_wins') {
      escrowStatus = 'released';
    } else if (admin_decision === 'partial_refund') {
      escrowStatus = 'partial_release';
    } else {
      escrowStatus = 'released';
    }

    await supabase.from('transactions')
      .update({ status: 'completed', escrow_status: escrowStatus, completed_at: new Date().toISOString() })
      .eq('id', dispute.transaction_id);

    // Reactivate listing if buyer wins (item returns to seller)
    if (admin_decision === 'buyer_wins') {
      const { data: txn } = await supabase.from('transactions').select('listing_id').eq('id', dispute.transaction_id).single();
      if (txn) await supabase.from('listings').update({ status: 'active' }).eq('id', txn.listing_id);
    }

    // Notify both parties
    const decisionMsg = {
      buyer_wins:     'The dispute was resolved in the buyer\'s favor. Escrow refunded.',
      seller_wins:    'The dispute was resolved in the seller\'s favor. Escrow released.',
      partial_refund: `Partial refund of ₹${refund_amount} issued.`,
      no_action:      'The dispute was reviewed. No action was taken.',
    };

    await supabase.from('notifications').insert([
      { user_id: dispute.filed_by, type: 'dispute_update', title: 'Dispute Resolved', content: decisionMsg[admin_decision], metadata: { dispute_id: id } },
      { user_id: dispute.against,  type: 'dispute_update', title: 'Dispute Resolved', content: decisionMsg[admin_decision], metadata: { dispute_id: id } },
    ]);

    res.json(updated);
  } catch (err) { next(err); }
};

module.exports = { fileDIspute, getMyDisputes, getDisputeById, uploadEvidence, getAdminDisputes, resolveDispute };
```

---

## 11. FRONTEND — DISPUTE PANEL COMPONENT

### client/src/components/DisputePanel.jsx
```jsx
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DISPUTE_TYPES = [
  { value: 'condition_mismatch',      label: '📦 Condition Mismatch',       desc: 'Item condition doesn\'t match listing' },
  { value: 'rental_damage',           label: '💥 Rental Damage',            desc: 'Item was damaged during rental' },
  { value: 'swap_misrepresentation',  label: '🔄 Swap Misrepresentation',   desc: 'Swapped item is not as described' },
];

const DisputePanel = ({ transaction, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState({ type: '', description: '' });
  const [evidence, setEvidence]   = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEvidenceUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = [];
    for (const file of files.slice(0, 5)) {
      const reader = new FileReader();
      await new Promise(resolve => {
        reader.onload = async () => {
          try {
            const base64 = reader.result.split(',')[1];
            const { data } = await api.post('/api/uploads/listing-image', {
              imageBase64: base64,
              mimeType: file.type,
              index: urls.length,
            });
            urls.push(data.url);
          } catch { /* skip failed uploads */ }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setEvidence(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.type || !form.description) return toast.error('Fill all fields');
    setSubmitting(true);
    try {
      await api.post('/api/dispute', {
        transaction_id:  transaction.id,
        type:            form.type,
        description:     form.description,
        evidence_photos: evidence,
      });
      toast.success('Dispute filed. Admin will review within 24–48 hours.');
      onClose?.();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">⚠️ File a Dispute</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: type */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">What's the issue?</p>
            <div className="space-y-2">
              {DISPUTE_TYPES.map(t => (
                <label key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form.type === t.value ? 'border-red-400 bg-red-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input type="radio" name="type" value={t.value}
                    checked={form.type === t.value}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe the issue</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Be as specific as possible. What did you receive vs. what was listed?"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>

          {/* Evidence upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Upload Evidence Photos</p>
            <p className="text-xs text-gray-400 mb-2">Clear photos of the issue. Max 5 photos. Timestamps are automatically recorded.</p>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-red-300 transition">
              <span>📸</span>
              <span className="text-sm text-gray-500">{uploading ? 'Uploading…' : 'Upload photos'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleEvidenceUpload} />
            </label>
            {evidence.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {evidence.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Evidence ${i + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                    <button
                      onClick={() => setEvidence(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              ⚠️ Filing a false dispute may affect your trust score. Admin reviews all evidence before making a decision.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.type || !form.description || submitting}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
          >
            {submitting ? 'Filing…' : 'File Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputePanel;
```

---

## 12. API ENDPOINT SUMMARY — TRY-ON, RENTAL & DISPUTE MODULE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/tryon` | Yes | Perform virtual try-on (cached) |
| GET | `/api/tryon/history` | Yes | User's try-on history |
| PUT | `/api/tryon/:id/feedback` | Yes | Submit fit feedback |
| PUT | `/api/tryon/:id/save` | Yes | Mark try-on as saved |
| POST | `/api/rental` | Yes | Book a rental (creates txn + rental record) |
| POST | `/api/rental/payment-order` | Yes | Create Razorpay order for rental |
| POST | `/api/rental/confirm-payment` | Yes | Verify rental payment |
| GET | `/api/rental/me` | Yes | My rentals (as renter or owner) |
| GET | `/api/rental/:id` | Yes | Single rental detail |
| PUT | `/api/rental/:id/return` | Yes | Renter submits return photos |
| PUT | `/api/rental/:id/admin-process` | Yes (admin/owner) | Process return + deposit decision |
| POST | `/api/dispute` | Yes | File a dispute |
| GET | `/api/dispute/me` | Yes | My disputes |
| GET | `/api/dispute/:id` | Yes | Single dispute |
| POST | `/api/dispute/:id/evidence` | Yes | Upload evidence photos |
| GET | `/api/dispute/admin/all` | Yes (admin) | All disputes for admin review |
| PUT | `/api/dispute/:id/resolve` | Yes (admin) | Resolve dispute + trigger escrow |

---

## NEXT: DOC 8 — Admin Panel + Notifications + Sustainability + Final Assembly
Complete admin panel UI, notification center with Supabase Realtime, sustainability score component, Navbar with unread badge, final index.js assembly, deployment checklist, and environment variable reference.
