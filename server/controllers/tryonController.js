const axios = require('axios');
const supabase = require('../services/supabase');
const api4ai = require('../services/api4ai');

const fetchAsBase64 = async (url) => {
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data).toString('base64');
};

const fetchAsBuffer = async (url) => {
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
};

const performTryOn = async (req, res, next) => {
  try {
    const { listing_id, user_photo_url, user_photo_base64 } = req.body;
    const userId = req.user.id;

    if (!listing_id) return res.status(400).json({ error: 'listing_id required' });
    if (!user_photo_url && !user_photo_base64) {
      return res.status(400).json({ error: 'user_photo_url or user_photo_base64 required' });
    }

    const { data: listing } = await supabase
      .from('listings').select('id, images, title').eq('id', listing_id).single();

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.images?.[0]) return res.status(400).json({ error: 'Listing has no images' });

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
        tryon_id: cached.id,
        cached: true,
        fit_feedback: cached.fit_feedback,
      });
    }

    let resolvedPhotoUrl = user_photo_url;
    if (!user_photo_url && user_photo_base64) {
      const buffer = Buffer.from(user_photo_base64, 'base64');
      const fileName = `tryon/${userId}/${Date.now()}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('user-photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg' });

      if (uploadErr) return res.status(500).json({ error: 'Photo upload failed' });

      const { data: { signedUrl } } = await supabase.storage
        .from('user-photos')
        .createSignedUrl(fileName, 365 * 24 * 60 * 60);

      resolvedPhotoUrl = signedUrl;

      await supabase.from('user_photos').insert({
        user_id: userId,
        photo_url: resolvedPhotoUrl,
        label: 'Try-On Photo',
      });
    }

    const clothingUrl = listing.images[0];
    const userBase64 = user_photo_base64 || await fetchAsBase64(resolvedPhotoUrl);
    const resultUrl = await api4ai.tryOn(clothingUrl, userBase64);

    let persistedUrl = resultUrl;
    try {
      const resultBuffer = await fetchAsBuffer(resultUrl);
      const resultFile = `tryon-results/${userId}/${Date.now()}.jpg`;
      await supabase.storage.from('tryon-results').upload(resultFile, resultBuffer, { contentType: 'image/jpeg' });
      const { data: { signedUrl: resUrl } } = await supabase.storage
        .from('tryon-results').createSignedUrl(resultFile, 365 * 24 * 60 * 60);
      persistedUrl = resUrl;
    } catch {}

    const { data: tryonRecord, error } = await supabase
      .from('tryon_results')
      .insert({
        user_id: userId,
        listing_id,
        user_photo_url: resolvedPhotoUrl,
        result_url: persistedUrl,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ result_url: persistedUrl, tryon_id: tryonRecord.id, cached: false, fit_feedback: null });
  } catch (err) {
    if (err.response?.status === 402) {
      return res.status(402).json({ error: 'Try-on API credits exhausted. Please try later.' });
    }
    next(err);
  }
};

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

const saveTryOnResult = async (req, res, next) => {
  try {
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

module.exports = { performTryOn, getTryOnHistory, submitFitFeedback, saveTryOnResult };
