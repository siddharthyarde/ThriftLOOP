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
    if (category)  query = query.eq('category', category);
    if (size)      query = query.eq('size', size);
    if (condition) query = query.eq('condition', condition);
    if (locality)  query = query.ilike('locality', `%${locality}%`);
    if (min_price) query = query.gte('price', parseFloat(min_price));
    if (max_price) query = query.lte('price', parseFloat(max_price));
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

// ─── AI CONDITION GRADE HELPER ────────────────────────────────
// In production, replace with actual image analysis API call.
const suggestConditionGrade = (userSelectedGrade, imageCount) => {
  const gradeMap = { A: 'A', B: 'B', C: 'C', D: 'D' };
  return gradeMap[userSelectedGrade] || userSelectedGrade;
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
        error: 'Minimum 3 images required: front view, back view, and defect close-up',
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
        error: 'rental_price_per_day and rental_deposit required for rental listings',
      });
    }

    // AI condition grade suggestion (simple heuristic; replace with real AI if desired)
    const condition_ai = suggestConditionGrade(condition, images.length);

    const { data, error } = await supabase
      .from('listings')
      .insert({
        seller_id:            req.user.id,
        title,
        description,
        category,
        size,
        condition,
        condition_ai,
        price: parseFloat(price),
        available_for:        modes,
        images,
        tags:                 tags || [],
        locality:             locality || req.profile?.locality,
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
      'title', 'description', 'price', 'available_for', 'images', 'tags', 'locality',
      'rental_price_per_day', 'rental_deposit', 'condition', 'size',
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

    // Sort by composite score (saves*0.6 + views*0.4)
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

    // Pull completed (sold) listings for same category + condition
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
