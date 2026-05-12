const supabase = require('../services/supabase');

// ─── REGISTER ────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { email, password, name, locality } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for minor project
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create public profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        locality: locality || null,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Profile creation failed' });
    }

    // Sign in to get session token
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return res.status(500).json({ error: 'Registration succeeded but login failed' });
    }

    res.status(201).json({
      user: profile,
      session: session.session,
    });
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      user: profile,
      session: data.session,
    });
  } catch (err) {
    next(err);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await supabase.auth.admin.signOut(req.user.id);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── GET ME ───────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select(`
        *,
        user_photos(id, photo_url, label, created_at),
        vouches!vouchee_id(count)
      `)
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json(profile);
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, locality, bio, style_prefs } = req.body;
    const allowedFields = {};

    if (name)        allowedFields.name        = name;
    if (locality)    allowedFields.locality    = locality;
    if (bio)         allowedFields.bio         = bio;
    if (style_prefs) allowedFields.style_prefs = style_prefs;

    const { data, error } = await supabase
      .from('users')
      .update(allowedFields)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── UPLOAD AVATAR ────────────────────────────────────────────
const uploadAvatar = async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) return res.status(400).json({ error: 'Image data required' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const fileName = `avatar-${req.user.id}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({ avatar_url: publicUrl, user: data });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE ACCOUNT ───────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  try {
    // Check no active transactions
    const { data: active } = await supabase
      .from('transactions')
      .select('id')
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .in('status', ['pending', 'escrow_held', 'in_transit'])
      .limit(1);

    if (active?.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete account with active transactions',
      });
    }

    await supabase.from('users').delete().eq('id', req.user.id);
    await supabase.auth.admin.deleteUser(req.user.id);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe, updateProfile, uploadAvatar, deleteAccount };
