const supabase = require('../services/supabase');

// ─── GET MY PHOTOS ────────────────────────────────────────────
const getMyPhotos = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── UPLOAD PHOTO ─────────────────────────────────────────────
const uploadPhoto = async (req, res, next) => {
  try {
    const { imageBase64, mimeType, label } = req.body;

    if (!imageBase64) return res.status(400).json({ error: 'Image data required' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const fileName = `tryon/${req.user.id}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(fileName, buffer, {
        contentType: mimeType || 'image/jpeg',
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    // user-photos bucket is private — generate signed URL (valid 1 year for convenience)
    const { data: { signedUrl } } = await supabase.storage
      .from('user-photos')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60);

    const { data, error } = await supabase
      .from('user_photos')
      .insert({
        user_id: req.user.id,
        photo_url: signedUrl,
        label: label || 'My Photo',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE PHOTO ─────────────────────────────────────────────
const deletePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: photo } = await supabase
      .from('user_photos')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    await supabase.from('user_photos').delete().eq('id', id);

    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyPhotos, uploadPhoto, deletePhoto };
