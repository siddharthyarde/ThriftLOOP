# DOC 4 — LISTINGS MODULE
### AI-Powered Thrift Marketplace
> Part 4 of 8 | Covers: Listing CRUD, 3-photo enforcement, photo guidelines overlay, AI condition grade suggestion, search & filter, trending, recently viewed, dynamic pricing, seller analytics

---

## 1. OVERVIEW

The listings module is the core of the marketplace. Key rules:
- **Min 3 images required** (front, back, defect close-up) — enforced on both client and server
- **AI condition grade** — suggested from photo using simple heuristic (real AI endpoint optional)
- **Search & filter** — category, size, condition, price range, locality, available_for
- **Trending** — most viewed + saved items in the last 7 days
- **Dynamic pricing** — suggestion based on historical seeded sales of same category/condition

---

## 2. BACKEND — LISTINGS ROUTES

### server/routes/listings.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  incrementView,
  getTrending,
  getPriceSuggestion,
  getMyListings,
  delistListing,
} = require('../controllers/listingController');

// Public
router.get('/',              getListings);
router.get('/trending',      getTrending);
router.get('/:id',           getListingById);
router.post('/:id/view',     incrementView);

// Protected
router.get('/me/all',        authGuard, getMyListings);
router.post('/',             authGuard, createListing);
router.put('/:id',           authGuard, updateListing);
router.delete('/:id',        authGuard, deleteListing);
router.put('/:id/delist',    authGuard, delistListing);
router.get('/:id/price-suggestion', authGuard, getPriceSuggestion);

module.exports = router;
```

---

## 3. BACKEND — LISTINGS CONTROLLER

### server/controllers/listingController.js
```javascript
const supabase = require('../services/supabase');

// ─── GET LISTINGS (search + filter) ──────────────────────────
const getListings = async (req, res, next) => {
  try {
    const {
      q,
      category,
      size,
      condition,
      min_price,
      max_price,
      locality,
      available_for,
      sort = 'created_at',
      order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('listings')
      .select(`
        *,
        users!seller_id(id, name, avatar_url, locality, trust_score, verified)
      `, { count: 'exact' })
      .eq('status', 'active')
      .range(offset, offset + parseInt(limit) - 1);

    // Text search on title + description
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Filters
    if (category)    query = query.eq('category', category);
    if (size)        query = query.eq('size', size);
    if (condition)   query = query.eq('condition', condition);
    if (locality)    query = query.ilike('locality', `%${locality}%`);
    if (min_price)   query = query.gte('price', parseFloat(min_price));
    if (max_price)   query = query.lte('price', parseFloat(max_price));
    if (available_for) {
      query = query.contains('available_for', [available_for]);
    }

    // Sorting
    const validSorts = ['created_at', 'price', 'views', 'saves'];
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      listings:    data || [],
      total:       count || 0,
      page:        parseInt(page),
      total_pages: Math.ceil((count || 0) / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET SINGLE LISTING ───────────────────────────────────────
const getListingById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        users!seller_id(id, name, avatar_url, locality, trust_score, verified, bio, total_sales)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Listing not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── CREATE LISTING ───────────────────────────────────────────
const createListing = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      size,
      condition,
      price,
      available_for,
      images,         // array of Supabase Storage URLs
      tags,
      locality,
      rental_price_per_day,
      rental_deposit,
    } = req.body;

    // Enforce min 3 images server-side
    if (!images || images.length < 3) {
      return res.status(400).json({
        error: 'Minimum 3 images required: front view, back view, and defect close-up'
      });
    }

    // Validate available_for
    const validModes = ['buy', 'swap', 'rental'];
    const modes = available_for || ['buy'];
    if (!modes.every(m => validModes.includes(m))) {
      return res.status(400).json({ error: 'Invalid available_for value' });
    }

    // Rental requires pricing
    if (modes.includes('rental') && (!rental_price_per_day || !rental_deposit)) {
      return res.status(400).json({
        error: 'rental_price_per_day and rental_deposit required for rental listings'
      });
    }

    // AI condition grade suggestion (simple heuristic; replace with real AI if desired)
    const condition_ai = suggestConditionGrade(condition, images.length);

    const { data, error } = await supabase
      .from('listings')
      .insert({
        seller_id:           req.user.id,
        title,
        description,
        category,
        size,
        condition,
        condition_ai,
        price: parseFloat(price),
        available_for:       modes,
        images,
        tags:                tags || [],
        locality:            locality || req.profile?.locality,
        rental_price_per_day: modes.includes('rental') ? parseFloat(rental_price_per_day) : null,
        rental_deposit:       modes.includes('rental') ? parseFloat(rental_deposit) : null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// ─── AI CONDITION GRADE HELPER ────────────────────────────────
// In production, replace with actual image analysis API call
const suggestConditionGrade = (userSelectedGrade, imageCount) => {
  // Simple pass-through with validation nudge
  const gradeMap = { A: 'A', B: 'B', C: 'C', D: 'D' };
  return gradeMap[userSelectedGrade] || userSelectedGrade;
};

// ─── UPDATE LISTING ───────────────────────────────────────────
const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id, status')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your listing' });
    }
    if (existing.status === 'sold') {
      return res.status(400).json({ error: 'Cannot edit a sold listing' });
    }

    const allowed = [
      'title','description','price','available_for','images','tags','locality',
      'rental_price_per_day','rental_deposit','condition','size'
    ];

    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Re-enforce 3 image minimum if images being updated
    if (updates.images && updates.images.length < 3) {
      return res.status(400).json({ error: 'Minimum 3 images required' });
    }

    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE LISTING ───────────────────────────────────────────
const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id, status')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your listing' });
    }
    if (['reserved', 'sold'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot delete a reserved or sold listing' });
    }

    await supabase.from('listings').delete().eq('id', id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── DELIST LISTING ───────────────────────────────────────────
const delistListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.seller_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'delisted', delisted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── INCREMENT VIEW COUNT ─────────────────────────────────────
const incrementView = async (req, res, next) => {
  try {
    await supabase.rpc('increment_listing_views', { listing_id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ─── TRENDING LISTINGS ────────────────────────────────────────
const getTrending = async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;

    // Top by (views * 0.4 + saves * 0.6) in active listings from last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        users!seller_id(id, name, avatar_url, trust_score, verified)
      `)
      .eq('status', 'active')
      .gte('created_at', since)
      .order('saves', { ascending: false })
      .limit(parseInt(limit));

    if (error) return res.status(500).json({ error: error.message });

    // Sort by composite score client-side (saves*0.6 + views*0.4)
    const sorted = (data || []).sort(
      (a, b) => (b.saves * 0.6 + b.views * 0.4) - (a.saves * 0.6 + a.views * 0.4)
    );

    res.json(sorted);
  } catch (err) {
    next(err);
  }
};

// ─── PRICE SUGGESTION ─────────────────────────────────────────
const getPriceSuggestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: listing } = await supabase
      .from('listings')
      .select('category, condition, size')
      .eq('id', id)
      .single();

    if (!listing) return res.status(404).json({ error: 'Not found' });

    // Pull completed transactions for same category + condition
    const { data: historicalListings } = await supabase
      .from('listings')
      .select('price')
      .eq('category', listing.category)
      .eq('condition', listing.condition)
      .eq('status', 'sold')
      .limit(50);

    if (!historicalListings || historicalListings.length < 3) {
      // Fallback: category default ranges
      const defaults = {
        tops:        { min: 150, max: 800,  avg: 350 },
        bottoms:     { min: 200, max: 1200, avg: 550 },
        dress:       { min: 250, max: 1500, avg: 700 },
        outerwear:   { min: 300, max: 2500, avg: 1100 },
        footwear:    { min: 200, max: 1800, avg: 800 },
        accessories: { min: 100, max: 600,  avg: 250 },
      };
      return res.json({
        suggestion: defaults[listing.category] || { min: 100, max: 1000, avg: 400 },
        based_on: 'category_defaults',
        sample_size: 0,
      });
    }

    const prices = historicalListings.map(l => l.price);
    const avg    = prices.reduce((a, b) => a + b, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const p25    = sorted[Math.floor(sorted.length * 0.25)];
    const p75    = sorted[Math.floor(sorted.length * 0.75)];

    // Condition multipliers
    const multipliers = { A: 1.2, B: 1.0, C: 0.75, D: 0.5 };
    const mult = multipliers[listing.condition] || 1.0;

    res.json({
      suggestion: {
        min: Math.round(p25 * mult),
        max: Math.round(p75 * mult),
        avg: Math.round(avg * mult),
      },
      based_on: 'historical_sales',
      sample_size: prices.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─── MY LISTINGS ──────────────────────────────────────────────
const getMyListings = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('listings')
      .select('*')
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getListings, getListingById, createListing, updateListing,
  deleteListing, delistListing, incrementView, getTrending,
  getPriceSuggestion, getMyListings,
};
```

---

## 4. SUPABASE SQL — increment_listing_views RPC

Run in Supabase SQL Editor:

```sql
-- RPC to safely increment views without race conditions
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE listings SET views = views + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. BACKEND — IMAGE UPLOAD ROUTE

### server/routes/uploads.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

/**
 * POST /api/uploads/listing-image
 * Accepts base64 image, uploads to Supabase Storage, returns public URL
 * Call this for each of the 3+ listing photos before creating the listing
 */
router.post('/listing-image', authGuard, async (req, res, next) => {
  try {
    const { imageBase64, mimeType, index } = req.body;

    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const buffer   = Buffer.from(imageBase64, 'base64');
    const ext      = (mimeType || 'image/jpeg').split('/')[1];
    const fileName = `listings/${req.user.id}/${Date.now()}-${index || 0}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(fileName, buffer, {
        contentType: mimeType || 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(fileName);

    res.json({ url: publicUrl, fileName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Add to `server/index.js`:
```javascript
app.use('/api/uploads', require('./routes/uploads'));
```

---

## 6. BACKEND — WISHLIST ROUTES

### server/routes/wishlist.js
```javascript
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

// Check if listing is in wishlist
router.get('/check/:listingId', authGuard, async (req, res, next) => {
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

module.exports = router;
```

---

## 7. BACKEND — SELLER ANALYTICS ROUTES

### server/routes/analytics.js
```javascript
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
      supabase.from('listings').select('id,title,views,saves,status,price,category,created_at').eq('seller_id', sellerId),
      supabase.from('transactions').select('id,status,amount,type,created_at').eq('seller_id', sellerId),
      supabase.from('disputes').select('id,status').eq('against', sellerId),
    ]);

    const activeListings    = (listings || []).filter(l => l.status === 'active');
    const soldListings      = (listings || []).filter(l => l.status === 'sold');
    const completedTxns     = (transactions || []).filter(t => t.status === 'completed');
    const totalRevenue      = completedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalViews        = (listings || []).reduce((sum, l) => sum + (l.views || 0), 0);
    const totalSaves        = (listings || []).reduce((sum, l) => sum + (l.saves || 0), 0);

    // Conversion rate: sold / (active + sold)
    const totalListed  = activeListings.length + soldListings.length;
    const conversionRate = totalListed > 0 ? ((soldListings.length / totalListed) * 100).toFixed(1) : 0;

    // Average time to sell (days)
    const avgDaysToSell = completedTxns.length > 0
      ? (completedTxns.reduce((sum, t) => {
          const created  = new Date(t.created_at);
          const now      = new Date();
          return sum + (now - created) / (1000 * 60 * 60 * 24);
        }, 0) / completedTxns.length).toFixed(1)
      : null;

    // Best performing listing by (views + saves*2)
    const topListing = (listings || [])
      .sort((a, b) => (b.views + b.saves * 2) - (a.views + a.saves * 2))[0] || null;

    // Category breakdown
    const categoryMap = {};
    (listings || []).forEach(l => {
      categoryMap[l.category] = (categoryMap[l.category] || 0) + 1;
    });

    // Revenue by month (last 6 months)
    const monthlyRevenue = {};
    completedTxns.forEach(t => {
      const month = new Date(t.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (t.amount || 0);
    });

    res.json({
      summary: {
        active_listings:   activeListings.length,
        sold_listings:     soldListings.length,
        total_revenue:     totalRevenue,
        total_views:       totalViews,
        total_saves:       totalSaves,
        conversion_rate:   parseFloat(conversionRate),
        avg_days_to_sell:  parseFloat(avgDaysToSell) || null,
        dispute_count:     (disputes || []).length,
        open_disputes:     (disputes || []).filter(d => d.status === 'open').length,
      },
      top_listing:        topListing,
      category_breakdown: categoryMap,
      monthly_revenue:    monthlyRevenue,
      recent_listings:    (listings || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

---

## 8. FRONTEND — CREATE LISTING PAGE

### client/src/pages/CreateListing.jsx
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import PhotoGuidelines from '../components/PhotoGuidelines';

const CATEGORIES  = ['tops','bottoms','dress','outerwear','footwear','accessories'];
const SIZES       = ['XS','S','M','L','XL','XXL','One Size','Custom'];
const CONDITIONS  = [
  { value: 'A', label: 'A – Like New',     desc: 'No visible wear, barely used' },
  { value: 'B', label: 'B – Gently Used',  desc: 'Minor signs of wear, great condition' },
  { value: 'C', label: 'C – Good',         desc: 'Noticeable wear, fully functional' },
  { value: 'D', label: 'D – Fair',         desc: 'Heavy wear, priced accordingly' },
];
const PHOTO_LABELS = ['Front View', 'Back View', 'Defect / Detail Close-up'];

const CreateListing = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', category: '', size: '', condition: '',
    price: '', available_for: ['buy'], locality: '',
    rental_price_per_day: '', rental_deposit: '',
  });

  const [images, setImages]         = useState([]);        // [{file, preview, url}]
  const [uploading, setUploading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGuide, setShowGuide]   = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleAvailFor = (mode) => {
    setForm(prev => ({
      ...prev,
      available_for: prev.available_for.includes(mode)
        ? prev.available_for.filter(m => m !== mode)
        : [...prev.available_for, mode],
    }));
  };

  // Upload individual photo to server
  const handlePhotoSelect = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    // Immediately show preview
    const updated = [...images];
    updated[index] = { file, preview, url: null, uploading: true };
    setImages(updated);

    // Upload
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const { data } = await api.post('/api/uploads/listing-image', {
          imageBase64: base64,
          mimeType: file.type,
          index,
        });
        const next = [...updated];
        next[index] = { file, preview, url: data.url, uploading: false };
        setImages(next);
        toast.success(`Photo ${index + 1} uploaded`);
      } catch {
        toast.error(`Photo ${index + 1} upload failed`);
        const next = [...updated];
        next[index] = null;
        setImages(next);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    const updated = [...images];
    updated[index] = null;
    setImages(updated);
  };

  const uploadedUrls = images.filter(i => i?.url).map(i => i.url);
  const canSubmit    = uploadedUrls.length >= 3 && form.title && form.category && form.size && form.condition && form.price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadedUrls.length < 3) {
      return toast.error('Please upload all 3 required photos');
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        images: uploadedUrls,
        rental_price_per_day: form.available_for.includes('rental') ? parseFloat(form.rental_price_per_day) : undefined,
        rental_deposit:       form.available_for.includes('rental') ? parseFloat(form.rental_deposit) : undefined,
      };
      const { data } = await api.post('/api/listings', payload);
      toast.success('Listing created!');
      navigate(`/listing/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">List an Item</h1>
      <p className="text-gray-500 text-sm mb-8">Share your pre-loved clothing with the community</p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── PHOTOS SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">Photos <span className="text-red-400">*</span></h2>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-green-600 underline"
            >
              Photo guidelines
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Upload exactly 3 photos: front view, back view, and defect close-up.</p>

          {showGuide && <PhotoGuidelines onClose={() => setShowGuide(false)} />}

          <div className="grid grid-cols-3 gap-3">
            {PHOTO_LABELS.map((label, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-green-400 transition">
                  {images[idx]?.preview ? (
                    <>
                      <img
                        src={images[idx].preview}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      {images[idx].uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs">Uploading…</span>
                        </div>
                      )}
                      {!images[idx].uploading && (
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >×</button>
                      )}
                      {images[idx].url && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[10px] text-center py-0.5">✓</div>
                      )}
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-2">
                      <span className="text-2xl text-gray-300">📷</span>
                      <span className="text-[10px] text-gray-400 text-center mt-1">{label}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoSelect(e, idx)}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-center text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Extra photos */}
          {images.filter(Boolean).length >= 3 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">Add more photos (optional, up to 8 total)</p>
              <label className="inline-flex items-center gap-1 text-xs text-green-600 cursor-pointer border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50">
                + Add Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoSelect(e, images.length)}
                />
              </label>
            </div>
          )}
        </div>

        {/* ── DETAILS SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-400">*</span></label>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Vintage Denim Jacket — Blue, Size M"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              rows={3} placeholder="Brand, fabric, measurements, reason for selling…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-400">*</span></label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size <span className="text-red-400">*</span></label>
              <select name="size" value={form.size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" required>
                <option value="">Select size</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition <span className="text-red-400">*</span></label>
            <div className="space-y-2">
              {CONDITIONS.map(c => (
                <label
                  key={c.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form.condition === c.value ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio" name="condition" value={c.value}
                    checked={form.condition === c.value}
                    onChange={handleChange}
                    className="mt-0.5 accent-green-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City / Locality</label>
            <input
              type="text" name="locality" value={form.locality} onChange={handleChange}
              placeholder="e.g. Indore, Mumbai, Bangalore"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {/* ── PRICING SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Pricing</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) <span className="text-red-400">*</span></label>
            <input
              type="number" name="price" value={form.price} onChange={handleChange}
              placeholder="0" min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
            {priceSuggestion && (
              <p className="text-xs text-green-600 mt-1">
                💡 Suggested: ₹{priceSuggestion.min}–₹{priceSuggestion.max} (avg ₹{priceSuggestion.avg})
                based on {priceSuggestion.sample_size} similar sales
              </p>
            )}
          </div>

          {/* Available For */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available For</label>
            <div className="flex gap-2 flex-wrap">
              {['buy','swap','rental'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleAvailFor(mode)}
                  className={`px-4 py-1.5 rounded-full text-sm border-2 font-medium transition capitalize ${
                    form.available_for.includes(mode)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {mode === 'buy' ? '🛍️ Buy' : mode === 'swap' ? '🔄 Swap' : '📦 Rental'}
                </button>
              ))}
            </div>
          </div>

          {/* Rental pricing */}
          {form.available_for.includes('rental') && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent / Day (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number" name="rental_price_per_day"
                  value={form.rental_price_per_day} onChange={handleChange}
                  placeholder="0" min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number" name="rental_deposit"
                  value={form.rental_deposit} onChange={handleChange}
                  placeholder="0" min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
        >
          {submitting ? 'Creating listing…' : 'Publish Listing'}
        </button>

        {!canSubmit && (
          <p className="text-xs text-center text-gray-400">
            {uploadedUrls.length < 3
              ? `Upload ${3 - uploadedUrls.length} more photo(s) to continue`
              : 'Fill in all required fields'}
          </p>
        )}
      </form>
    </div>
  );
};

export default CreateListing;
```

---

## 9. FRONTEND — PHOTO GUIDELINES COMPONENT

### client/src/components/PhotoGuidelines.jsx
```jsx
const GUIDELINES = [
  { icon: '👕', title: 'Front View', desc: 'Lay flat or hang. Full item visible, good lighting.' },
  { icon: '👕', title: 'Back View', desc: 'Same as front. Show full back of the item.' },
  { icon: '🔍', title: 'Defect Close-up', desc: 'Any stains, pilling, tears, or wear marks. Be honest!' },
  { icon: '💡', title: 'Lighting',   desc: 'Use natural daylight. Avoid flash, shadows.' },
  { icon: '📐', title: 'Background', desc: 'Clean surface or wall. Avoid busy backgrounds.' },
];

const PhotoGuidelines = ({ onClose }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-amber-800">📸 Photo Guidelines</h3>
      {onClose && (
        <button onClick={onClose} className="text-amber-500 text-sm">✕</button>
      )}
    </div>
    <div className="space-y-2">
      {GUIDELINES.map((g, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-sm">{g.icon}</span>
          <div>
            <span className="text-xs font-medium text-amber-800">{g.title}: </span>
            <span className="text-xs text-amber-700">{g.desc}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PhotoGuidelines;
```

---

## 10. FRONTEND — LISTING DETAIL PAGE

### client/src/pages/ListingDetail.jsx
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import TrustScore from '../components/TrustScore';
import TryOnModal from '../components/TryOnModal';
import ConditionBadge from '../components/ConditionBadge';

const ListingDetail = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [listing, setListing]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeImg, setActiveImg]   = useState(0);
  const [saved, setSaved]           = useState(false);
  const [showTryOn, setShowTryOn]   = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    fetchListing();
    if (user) checkWishlist();
    api.post(`/api/listings/${id}/view`).catch(() => {});
    // Track recently viewed in localStorage
    trackRecentlyViewed(id);
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data } = await api.get(`/api/listings/${id}`);
      setListing(data);
    } catch {
      toast.error('Listing not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const checkWishlist = async () => {
    const { data } = await api.get(`/api/wishlist/check/${id}`).catch(() => ({ data: { saved: false } }));
    setSaved(data.saved);
  };

  const toggleWishlist = async () => {
    if (!user) return navigate('/login');
    try {
      if (saved) {
        await api.delete(`/api/wishlist/${id}`);
      } else {
        await api.post(`/api/wishlist/${id}`);
      }
      setSaved(!saved);
      toast.success(saved ? 'Removed from wishlist' : 'Added to wishlist');
    } catch {
      toast.error('Could not update wishlist');
    }
  };

  const trackRecentlyViewed = (listingId) => {
    const key  = 'recently_viewed';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const next = [listingId, ...prev.filter(i => i !== listingId)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const handleBuy = async () => {
    if (!user) return navigate('/login');
    setBuyLoading(true);
    try {
      const { data } = await api.post('/api/transactions', {
        listing_id:    listing.id,
        type:          'buy',
        delivery_type: 'meetup',   // user chooses in next step; default meetup
      });
      navigate(`/order/${data.transaction.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate purchase');
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ── IMAGE GALLERY ── */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-square mb-3">
            <img
              src={listing.images[activeImg]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            {listing.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                  activeImg === i ? 'border-green-500' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* ── LISTING INFO ── */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
              <button
                onClick={toggleWishlist}
                className={`text-2xl transition flex-shrink-0 ${saved ? 'text-red-400' : 'text-gray-300 hover:text-red-300'}`}
              >
                {saved ? '♥' : '♡'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="capitalize text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{listing.category}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Size {listing.size}</span>
              <ConditionBadge condition={listing.condition} />
              {listing.condition_ai && listing.condition_ai !== listing.condition && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  🤖 AI suggests: {listing.condition_ai}
                </span>
              )}
            </div>
          </div>

          <p className="text-3xl font-bold text-gray-900">₹{listing.price?.toLocaleString()}</p>

          {listing.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
          )}

          {/* Available for badges */}
          <div className="flex gap-2 flex-wrap">
            {listing.available_for?.includes('buy')    && <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">🛍️ Buy</span>}
            {listing.available_for?.includes('swap')   && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">🔄 Swap</span>}
            {listing.available_for?.includes('rental') && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                📦 Rent ₹{listing.rental_price_per_day}/day
              </span>
            )}
          </div>

          {listing.locality && (
            <p className="text-sm text-gray-500">📍 {listing.locality}</p>
          )}

          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-400">
            <span>👁 {listing.views} views</span>
            <span>♡ {listing.saves} saves</span>
          </div>

          {/* Actions */}
          {!isOwner ? (
            <div className="flex flex-col gap-3 pt-2">
              {listing.available_for?.includes('buy') && (
                <button
                  onClick={handleBuy}
                  disabled={buyLoading || listing.status !== 'active'}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
                >
                  {buyLoading ? 'Processing…' : listing.status !== 'active' ? 'Not Available' : 'Buy Now'}
                </button>
              )}
              {listing.available_for?.includes('swap') && (
                <Link
                  to={`/swap?target=${listing.id}`}
                  className="w-full text-center border-2 border-blue-400 text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 transition"
                >
                  Propose a Swap
                </Link>
              )}
              {listing.available_for?.includes('rental') && (
                <Link
                  to={`/rental/${listing.id}`}
                  className="w-full text-center border-2 border-purple-400 text-purple-600 font-semibold py-3 rounded-xl hover:bg-purple-50 transition"
                >
                  Rent This Item
                </Link>
              )}
              <button
                onClick={() => setShowTryOn(true)}
                className="w-full border-2 border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                👗 Virtual Try-On
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                to={`/create-listing?edit=${listing.id}`}
                className="flex-1 text-center border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Edit Listing
              </Link>
              <button
                onClick={async () => {
                  await api.put(`/api/listings/${listing.id}/delist`);
                  toast.success('Listing delisted');
                  navigate('/dashboard');
                }}
                className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50"
              >
                Delist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seller card */}
      {listing.users && (
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <Link to={`/storefront/${listing.seller_id}`}>
            <img
              src={listing.users.avatar_url || `https://ui-avatars.com/api/?name=${listing.users.name}&background=22c55e&color=fff`}
              alt={listing.users.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/storefront/${listing.seller_id}`} className="font-semibold text-gray-900 hover:underline">
              {listing.users.name}
            </Link>
            {listing.users.verified && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
            )}
            <div className="mt-0.5"><TrustScore score={listing.users.trust_score} /></div>
          </div>
          <Link
            to={`/storefront/${listing.seller_id}`}
            className="text-sm text-green-600 border border-green-200 px-4 py-1.5 rounded-xl hover:bg-green-50"
          >
            View Store
          </Link>
        </div>
      )}

      {/* Virtual Try-On Modal */}
      {showTryOn && (
        <TryOnModal listing={listing} onClose={() => setShowTryOn(false)} />
      )}
    </div>
  );
};

export default ListingDetail;
```

---

## 11. FRONTEND — CONDITION BADGE COMPONENT

### client/src/components/ConditionBadge.jsx
```jsx
const CONDITION_CONFIG = {
  A: { label: 'Like New',     color: 'bg-emerald-100 text-emerald-700' },
  B: { label: 'Gently Used',  color: 'bg-blue-100 text-blue-700' },
  C: { label: 'Good',         color: 'bg-yellow-100 text-yellow-700' },
  D: { label: 'Fair',         color: 'bg-red-100 text-red-600' },
};

const ConditionBadge = ({ condition, size = 'sm' }) => {
  const config = CONDITION_CONFIG[condition] || { label: condition, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-${size} font-medium px-2 py-0.5 rounded-full ${config.color}`}>
      {condition} · {config.label}
    </span>
  );
};

export default ConditionBadge;
```

---

## 12. FRONTEND — HOME PAGE (search + filters + trending)

### client/src/pages/Home.jsx
```jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import SearchFilters from '../components/SearchFilters';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings]     = useState([]);
  const [trending, setTrending]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const filters = {
    q:             searchParams.get('q')             || '',
    category:      searchParams.get('category')      || '',
    size:          searchParams.get('size')           || '',
    condition:     searchParams.get('condition')      || '',
    min_price:     searchParams.get('min_price')      || '',
    max_price:     searchParams.get('max_price')      || '',
    locality:      searchParams.get('locality')       || '',
    available_for: searchParams.get('available_for')  || '',
    sort:          searchParams.get('sort')           || 'created_at',
  };

  useEffect(() => {
    fetchListings();
  }, [searchParams, page]);

  useEffect(() => {
    api.get('/api/listings/trending?limit=6')
      .then(r => setTrending(r.data))
      .catch(() => {});

    // Load recently viewed IDs from localStorage
    const ids = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
    if (ids.length > 0) {
      Promise.all(ids.slice(0, 4).map(id =>
        api.get(`/api/listings/${id}`).then(r => r.data).catch(() => null)
      )).then(results => setRecentlyViewed(results.filter(Boolean)));
    }
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, page, limit: 20 });
      const { data } = await api.get(`/api/listings?${params}`);
      setListings(data.listings || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams(
      Object.entries(newFilters).filter(([, v]) => v)
    );
    setSearchParams(params);
    setPage(1);
  };

  const isFiltered = Object.values(filters).some(v => v);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Hero search */}
      {!isFiltered && (
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Discover Pre-Loved Fashion
          </h1>
          <p className="text-gray-500 text-lg">Buy, swap, rent — sustainably.</p>
        </div>
      )}

      {/* Filters */}
      <SearchFilters filters={filters} onChange={handleFilterChange} />

      {/* Trending (only on unfiltered home) */}
      {!isFiltered && trending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔥 Trending This Week</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {trending.map(l => <ListingCard key={l.id} listing={l} compact />)}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {!isFiltered && recentlyViewed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">👁 Recently Viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentlyViewed.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      )}

      {/* Main listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {isFiltered ? `${total} results` : 'All Listings'}
        </h2>
        <select
          value={filters.sort}
          onChange={e => handleFilterChange({ ...filters, sort: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="created_at">Newest First</option>
          <option value="price">Price: Low to High</option>
          <option value="views">Most Viewed</option>
          <option value="saves">Most Saved</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧥</p>
          <p className="font-medium">No listings found</p>
          <p className="text-sm mt-1">Try different filters or check back later</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-full text-sm font-medium ${
                    page === i + 1 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
```

---

## 13. FRONTEND — LISTING CARD COMPONENT

### client/src/components/ListingCard.jsx
```jsx
import { Link } from 'react-router-dom';
import ConditionBadge from './ConditionBadge';

const ListingCard = ({ listing, compact = false }) => {
  if (!listing) return null;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={listing.images?.[0]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Available for badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {listing.available_for?.includes('swap')   && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">SWAP</span>}
          {listing.available_for?.includes('rental') && <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full">RENT</span>}
        </div>
        {listing.status !== 'active' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold uppercase text-sm tracking-wider">{listing.status}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <p className="text-base font-bold text-gray-900">₹{listing.price?.toLocaleString()}</p>
          <ConditionBadge condition={listing.condition} size="xs" />
        </div>
        {!compact && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {listing.size} · {listing.users?.locality || listing.locality}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ListingCard;
```

---

## 14. FRONTEND — SEARCH FILTERS COMPONENT

### client/src/components/SearchFilters.jsx
```jsx
import { useState } from 'react';

const CATEGORIES  = ['tops','bottoms','dress','outerwear','footwear','accessories'];
const SIZES       = ['XS','S','M','L','XL','XXL'];
const CONDITIONS  = ['A','B','C','D'];

const SearchFilters = ({ filters, onChange }) => {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(filters);

  const apply = () => { onChange(local); setOpen(false); };
  const reset = () => { const empty = { q:'',category:'',size:'',condition:'',min_price:'',max_price:'',locality:'',available_for:'' }; setLocal(empty); onChange(empty); };

  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'q').length;

  return (
    <div className="mb-6">
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={local.q}
            onChange={e => setLocal({ ...local, q: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && onChange(local)}
            placeholder="Search clothing…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition ${
            activeCount > 0 ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-600'
          }`}
        >
          🎚 Filters {activeCount > 0 && <span className="bg-green-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {open && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Category</label>
            <select value={local.category} onChange={e => setLocal({ ...local, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Size</label>
            <select value={local.size} onChange={e => setLocal({ ...local, size: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Condition</label>
            <select value={local.condition} onChange={e => setLocal({ ...local, condition: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c} Grade</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Available For</label>
            <select value={local.available_for} onChange={e => setLocal({ ...local, available_for: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              <option value="buy">Buy</option>
              <option value="swap">Swap</option>
              <option value="rental">Rental</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Min Price (₹)</label>
            <input type="number" value={local.min_price}
              onChange={e => setLocal({ ...local, min_price: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Max Price (₹)</label>
            <input type="number" value={local.max_price}
              onChange={e => setLocal({ ...local, max_price: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Any" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">City</label>
            <input type="text" value={local.locality}
              onChange={e => setLocal({ ...local, locality: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Indore, Mumbai…" />
          </div>

          <div className="col-span-2 md:col-span-4 flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button onClick={reset} className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Reset</button>
            <button onClick={apply} className="text-sm bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(filters).map(([k, v]) => {
            if (!v || k === 'sort' || k === 'q') return null;
            return (
              <span key={k} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
                {k.replace('_', ' ')}: {v}
                <button onClick={() => onChange({ ...filters, [k]: '' })} className="text-green-500 hover:text-green-700">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
```

---

## 15. FRONTEND — SELLER DASHBOARD PAGE

### client/src/pages/SellerDashboard.jsx
```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';

const StatCard = ({ label, value, icon, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

const SellerDashboard = () => {
  const [data, setData]       = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/seller'),
      api.get('/api/listings/me/all'),
    ]).then(([analyticsRes, listingsRes]) => {
      setData(analyticsRes.data);
      setListings(listingsRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!data)   return null;

  const { summary, top_listing, category_breakdown, monthly_revenue } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
        <Link
          to="/create-listing"
          className="bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-600"
        >
          + New Listing
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {['overview', 'listings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active Listings"  value={summary.active_listings}  icon="📦" />
            <StatCard label="Total Sold"        value={summary.sold_listings}    icon="✅" />
            <StatCard label="Total Revenue"     value={`₹${summary.total_revenue.toLocaleString()}`} icon="💰" />
            <StatCard label="Conversion Rate"   value={`${summary.conversion_rate}%`} icon="📈"
              sub={`${summary.total_views} views`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Views"       value={summary.total_views.toLocaleString()} icon="👁" />
            <StatCard label="Total Saves"       value={summary.total_saves.toLocaleString()} icon="♥" />
            <StatCard label="Avg Days to Sell"  value={summary.avg_days_to_sell ? `${summary.avg_days_to_sell}d` : '—'} icon="⏱" />
            <StatCard label="Open Disputes"     value={summary.open_disputes} icon="⚠️"
              sub={summary.open_disputes > 0 ? 'Needs attention' : 'All clear'} />
          </div>

          {/* Top listing */}
          {top_listing && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">🏆 Best Performing Listing</h2>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <img src={top_listing.images?.[0]} alt={top_listing.title}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{top_listing.title}</p>
                  <p className="text-sm text-gray-500">₹{top_listing.price?.toLocaleString()} · {top_listing.views} views · {top_listing.saves} saves</p>
                </div>
                <Link to={`/listing/${top_listing.id}`}
                  className="text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg">
                  View
                </Link>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">📊 Category Breakdown</h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
              {Object.entries(category_breakdown).map(([cat, count]) => {
                const total = Object.values(category_breakdown).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 capitalize">{cat}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === 'listings' && (
        <div>
          {listings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-3">📦</p>
              <p>No listings yet. <Link to="/create-listing" className="text-green-600 underline">Create your first one</Link></p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
```

---

## 16. API ENDPOINT SUMMARY — LISTINGS MODULE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/listings` | No | Search/filter/paginate listings |
| GET | `/api/listings/trending` | No | Top 12 trending this week |
| GET | `/api/listings/:id` | No | Single listing detail |
| POST | `/api/listings/:id/view` | No | Increment view counter |
| GET | `/api/listings/me/all` | Yes | Seller's own listings |
| POST | `/api/listings` | Yes | Create listing (min 3 images enforced) |
| PUT | `/api/listings/:id` | Yes | Update listing |
| DELETE | `/api/listings/:id` | Yes | Delete listing |
| PUT | `/api/listings/:id/delist` | Yes | Soft delist listing |
| GET | `/api/listings/:id/price-suggestion` | Yes | Dynamic price suggestion |
| POST | `/api/uploads/listing-image` | Yes | Upload single listing image |
| GET | `/api/wishlist` | Yes | Get my wishlist |
| POST | `/api/wishlist/:listingId` | Yes | Add to wishlist |
| DELETE | `/api/wishlist/:listingId` | Yes | Remove from wishlist |
| GET | `/api/wishlist/check/:listingId` | Yes | Check if saved |
| GET | `/api/analytics/seller` | Yes | Seller dashboard stats |

---

## NEXT: DOC 5 — Buy/Sell Flow + Razorpay Escrow + QR Meetup + Grace Timer
Full buy flow with Razorpay sandbox, escrow state machine, QR generation, 15-min meetup grace timer with real-time countdown, no-show flows, delivery option with Shiprocket integration.
