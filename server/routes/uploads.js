const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

/**
 * POST /api/uploads/listing-image
 * Accepts a base64 image, uploads to Supabase Storage, returns the public URL.
 * Call this for each of the 3+ listing photos before creating the listing.
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

/**
 * POST /api/uploads/dispute-photo
 * Uploads a dispute evidence photo to Supabase Storage, returns the public URL.
 */
router.post('/dispute-photo', authGuard, async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const buffer   = Buffer.from(imageBase64, 'base64');
    const ext      = (mimeType || 'image/jpeg').split('/')[1];
    const fileName = `disputes/${req.user.id}/${Date.now()}.${ext}`;

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
