# DOC 3 — AUTH & USER MODULE
### AI-Powered Thrift Marketplace
> Part 3 of 8 | Covers: Supabase Auth, registration/login, profile management, user photos (try-on), trust score, verified badge, seller storefronts, style quiz

---

## 1. OVERVIEW

Auth is handled entirely by **Supabase Auth** (JWT-based). The flow:

```
User registers → Supabase creates auth.users entry → 
Trigger creates matching public.users profile →
JWT returned → stored in Supabase session →
Every API call attaches JWT → authGuard.js verifies on server
```

No separate JWT library needed. Supabase handles token refresh automatically.

---

## 2. BACKEND — AUTH ROUTES

### server/routes/auth.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  uploadAvatar,
  deleteAccount,
} = require('../controllers/authController');

router.post('/register',        register);
router.post('/login',           login);
router.post('/logout',          authGuard, logout);
router.get('/me',               authGuard, getMe);
router.put('/profile',          authGuard, updateProfile);
router.post('/avatar',          authGuard, uploadAvatar);
router.delete('/account',       authGuard, deleteAccount);

module.exports = router;
```

---

## 3. BACKEND — AUTH CONTROLLER

### server/controllers/authController.js
```javascript
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
      email_confirm: true,         // auto-confirm for minor project
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create public profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id:       authData.user.id,
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
      user:    profile,
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

    // Fetch full profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      user:    profile,
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
      .in('status', ['pending','escrow_held','in_transit'])
      .limit(1);

    if (active?.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete account with active transactions'
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
```

---

## 4. BACKEND — USER PHOTO ROUTES (Try-On)

### server/routes/userPhotos.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getMyPhotos,
  uploadPhoto,
  deletePhoto,
} = require('../controllers/userPhotoController');

router.get('/',      authGuard, getMyPhotos);
router.post('/',     authGuard, uploadPhoto);
router.delete('/:id', authGuard, deletePhoto);

module.exports = router;
```

Add to server/index.js:
```javascript
app.use('/api/user-photos', require('./routes/userPhotos'));
```

### server/controllers/userPhotoController.js
```javascript
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
        user_id:   req.user.id,
        photo_url: signedUrl,
        label:     label || 'My Photo',
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

    // Verify ownership
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
```

---

## 5. BACKEND — TRUST SCORE CALCULATOR

### server/utils/trustScore.js
```javascript
const supabase = require('../services/supabase');

/**
 * Recalculate trust score for a user.
 * Called after every completed transaction, dispute resolution, or vouch.
 * 
 * Formula:
 *   base        = completed_transactions * 0.5   (max 25)
 *   dispute_pen = disputes_against * -2           (penalty)
 *   vouch_bonus = vouches_received * 1            (max 5)
 *   verified    = +1 if verified
 *   Final score clamped 0–5
 */
const recalculateTrustScore = async (userId) => {
  try {
    const [{ data: user }, { data: completedTxns }, { data: disputes }, { data: vouches }] =
      await Promise.all([
        supabase.from('users').select('verified').eq('id', userId).single(),
        supabase.from('transactions')
          .select('id', { count: 'exact' })
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .eq('status', 'completed'),
        supabase.from('disputes')
          .select('id', { count: 'exact' })
          .eq('against', userId)
          .eq('status', 'resolved'),
        supabase.from('vouches')
          .select('id', { count: 'exact' })
          .eq('vouchee_id', userId),
      ]);

    const completedCount = completedTxns?.length || 0;
    const disputeCount   = disputes?.length    || 0;
    const vouchCount     = vouches?.length      || 0;
    const isVerified     = user?.verified       || false;

    const base        = Math.min(completedCount * 0.5, 25);
    const disputePen  = disputeCount * 2;
    const vouchBonus  = Math.min(vouchCount, 5);
    const verifyBonus = isVerified ? 1 : 0;

    const raw   = base - disputePen + vouchBonus + verifyBonus;
    const score = Math.max(0, Math.min(5, parseFloat(raw.toFixed(2))));

    await supabase.from('users').update({ trust_score: score }).eq('id', userId);

    return score;
  } catch (err) {
    console.error('Trust score recalc error:', err.message);
  }
};

module.exports = { recalculateTrustScore };
```

---

## 6. BACKEND — STOREFRONT ROUTES

### server/routes/storefront.js
```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// GET /api/storefront/:userId — public storefront
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [{ data: user }, { data: listings }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, avatar_url, locality, bio, trust_score, verified, total_sales, created_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('listings')
        .select('*')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Stats
    const { data: completedSales } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('seller_id', userId)
      .eq('status', 'completed');

    const { data: vouches } = await supabase
      .from('vouches')
      .select('voucher_id, users!voucher_id(name, avatar_url)')
      .eq('vouchee_id', userId)
      .limit(5);

    res.json({
      user,
      listings:      listings || [],
      total_sales:   completedSales?.length || 0,
      vouches:       vouches || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Add to server/index.js:
```javascript
app.use('/api/storefront', require('./routes/storefront'));
```

---

## 7. BACKEND — VOUCH ROUTES

### server/routes/vouches.js
```javascript
const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');
const { recalculateTrustScore } = require('../utils/trustScore');

// POST /api/vouches — vouch for a user
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { vouchee_id, note } = req.body;
    const voucher_id = req.user.id;

    if (voucher_id === vouchee_id) {
      return res.status(400).json({ error: 'Cannot vouch for yourself' });
    }

    // Check voucher has 3+ completed transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('id')
      .or(`buyer_id.eq.${voucher_id},seller_id.eq.${voucher_id}`)
      .eq('status', 'completed');

    if (!txns || txns.length < 3) {
      return res.status(403).json({
        error: 'You need at least 3 completed transactions to vouch for others'
      });
    }

    const { data, error } = await supabase
      .from('vouches')
      .insert({ voucher_id, vouchee_id, note })
      .select()
      .single();

    if (error?.code === '23505') {
      return res.status(409).json({ error: 'You have already vouched for this user' });
    }
    if (error) return res.status(500).json({ error: error.message });

    // Recalculate trust score for vouchee
    await recalculateTrustScore(vouchee_id);

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Add to server/index.js:
```javascript
app.use('/api/vouches', require('./routes/vouches'));
```

---

## 8. FRONTEND — LOGIN PAGE

### client/src/pages/Login.jsx
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import supabase from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    form.email,
        password: form.password,
      });

      if (error) throw error;

      toast.success(`Welcome back!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your thrift account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

---

## 9. FRONTEND — REGISTER PAGE

### client/src/pages/Register.jsx
```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const LOCALITIES = ['Indore','Mumbai','Delhi','Pune','Bangalore','Hyderabad','Jaipur','Ahmedabad','Chennai','Kolkata'];

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', locality: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      // Session is handled by Supabase client automatically via cookie/localStorage
      toast.success('Account created! Welcome to Thrift.');
      navigate('/style-quiz');          // redirect to style quiz on first login
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-gray-500 text-sm mb-6">Join the thrift community</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" name="name" value={form.name} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Aarav Sharma" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" name="password" value={form.password} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Min 6 characters" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              name="locality" value={form.locality} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              <option value="">Select your city</option>
              {LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

---

## 10. FRONTEND — PROFILE PAGE

### client/src/pages/Profile.jsx
```jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import TrustScore from '../components/TrustScore';

const Profile = () => {
  const { profile, fetchProfile } = useAuth();
  const [form, setForm]       = useState({ name: '', locality: '', bio: '' });
  const [photos, setPhotos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('profile');   // 'profile' | 'photos'

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', locality: profile.locality || '', bio: profile.bio || '' });
    }
    fetchPhotos();
  }, [profile]);

  const fetchPhotos = async () => {
    const { data } = await api.get('/api/user-photos');
    setPhotos(data || []);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/auth/profile', form);
      await fetchProfile(profile.id);
      toast.success('Profile updated');
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await api.post('/api/user-photos', {
          imageBase64: base64,
          mimeType: file.type,
          label: 'My Photo',
        });
        await fetchPhotos();
        toast.success('Photo saved');
      } catch {
        toast.error('Photo upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/api/user-photos/${photoId}`);
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Photo removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <img
          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}&background=22c55e&color=fff`}
          alt={profile.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <TrustScore score={profile.trust_score} />
            {profile.verified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {['profile', 'photos'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {t === 'photos' ? 'Try-On Photos' : 'Profile'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text" value={form.locality}
              onChange={e => setForm({ ...form, locality: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              placeholder="Tell buyers about your style..."
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* Try-On Photos Tab */}
      {tab === 'photos' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Save your photos here to use for Virtual Try-On without re-uploading every time.
          </p>

          {/* Upload */}
          <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition mb-6">
            <span className="text-2xl">📷</span>
            <p className="text-sm text-gray-600 mt-2">Click to upload a new photo</p>
            <p className="text-xs text-gray-400 mt-1">Front-facing, full body works best</p>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
                <img
                  src={photo.photo_url} alt={photo.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="text-white text-xs bg-red-500 px-3 py-1 rounded-full"
                  >
                    Remove
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 text-xs text-white bg-black/40 text-center py-1">
                  {photo.label}
                </p>
              </div>
            ))}
          </div>

          {photos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No photos saved yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
```

---

## 11. FRONTEND — TRUST SCORE COMPONENT

### client/src/components/TrustScore.jsx
```jsx
const TrustScore = ({ score }) => {
  const filled = Math.round(score);
  const color =
    score >= 4   ? 'text-green-500' :
    score >= 2.5 ? 'text-yellow-500' :
                   'text-red-400';

  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= filled ? color : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{score?.toFixed(1)}</span>
    </div>
  );
};

export default TrustScore;
```

---

## 12. FRONTEND — SELLER STOREFRONT PAGE

### client/src/pages/Storefront.jsx
```jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import TrustScore from '../components/TrustScore';

const Storefront = () => {
  const { id } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/storefront/${id}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading...</div>;
  if (!data)   return <div className="text-center py-20 text-gray-400">User not found</div>;

  const { user, listings, total_sales, vouches } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Seller Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-4">
          <img
            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=22c55e&color=fff`}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              {user.verified && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  ✓ Verified
                </span>
              )}
            </div>
            <TrustScore score={user.trust_score} />
            {user.locality && (
              <p className="text-sm text-gray-500 mt-1">📍 {user.locality}</p>
            )}
            {user.bio && (
              <p className="text-sm text-gray-600 mt-2">{user.bio}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-center flex-shrink-0">
            <div>
              <p className="text-lg font-bold text-gray-900">{total_sales}</p>
              <p className="text-xs text-gray-500">Sales</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{listings.length}</p>
              <p className="text-xs text-gray-500">Listed</p>
            </div>
          </div>
        </div>

        {/* Vouches */}
        {vouches.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Vouched by</p>
            <div className="flex gap-2">
              {vouches.map(v => (
                <Link key={v.voucher_id} to={`/storefront/${v.voucher_id}`}>
                  <img
                    src={v.users?.avatar_url || `https://ui-avatars.com/api/?name=${v.users?.name}&size=32&background=e5e7eb&color=374151`}
                    alt={v.users?.name}
                    title={v.users?.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white ring-1 ring-gray-200"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Listings Grid */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Active Listings ({listings.length})
      </h2>
      {listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No active listings</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Storefront;
```

---

## 13. FRONTEND — STYLE QUIZ PAGE

### client/src/pages/StyleQuiz.jsx
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const QUESTIONS = [
  {
    id: 'categories',
    question: 'What do you shop for most?',
    multi: true,
    options: [
      { label: 'Tops & Shirts',  value: 'tops',        emoji: '👕' },
      { label: 'Bottoms',        value: 'bottoms',      emoji: '👖' },
      { label: 'Dresses',        value: 'dress',        emoji: '👗' },
      { label: 'Outerwear',      value: 'outerwear',    emoji: '🧥' },
      { label: 'Footwear',       value: 'footwear',     emoji: '👟' },
      { label: 'Accessories',    value: 'accessories',  emoji: '👜' },
    ],
  },
  {
    id: 'sizes',
    question: 'Your usual sizes?',
    multi: true,
    options: ['XS','S','M','L','XL','XXL'].map(s => ({ label: s, value: s, emoji: '' })),
  },
  {
    id: 'styles',
    question: 'Your vibe?',
    multi: true,
    options: [
      { label: 'Casual',      value: 'casual',    emoji: '😊' },
      { label: 'Ethnic',      value: 'ethnic',    emoji: '🌸' },
      { label: 'Western',     value: 'western',   emoji: '🤠' },
      { label: 'Formal',      value: 'formal',    emoji: '💼' },
      { label: 'Streetwear',  value: 'streetwear',emoji: '🏙️' },
      { label: 'Vintage',     value: 'vintage',   emoji: '🕰️' },
    ],
  },
];

const StyleQuiz = () => {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuth();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({ categories: [], sizes: [], styles: [] });
  const [saving, setSaving]   = useState(false);

  const current = QUESTIONS[step];

  const toggle = (value) => {
    const key = current.id;
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const next = async () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setSaving(true);
      try {
        await api.put('/api/auth/profile', { style_prefs: answers });
        await fetchProfile(profile.id);
        toast.success('Style preferences saved!');
        navigate('/');
      } catch {
        toast.error('Could not save preferences');
      } finally {
        setSaving(false);
      }
    }
  };

  const selected = answers[current.id];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-green-500' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">{current.question}</h2>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {current.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                selected.includes(opt.value)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-100 text-gray-700 hover:border-gray-200'
              }`}
            >
              {opt.emoji && <span>{opt.emoji}</span>}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            onClick={next}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : step < QUESTIONS.length - 1 ? 'Next →' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleQuiz;
```

---

## 14. FRONTEND — useAuth HOOK

### client/src/hooks/useAuth.js
```javascript
// Re-export from context for convenience
export { useAuth } from '../context/AuthContext';
```

---

## 15. API ENDPOINT SUMMARY — AUTH & USER MODULE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get session |
| POST | `/api/auth/logout` | Yes | Invalidate session |
| GET | `/api/auth/me` | Yes | Get own full profile |
| PUT | `/api/auth/profile` | Yes | Update profile fields |
| POST | `/api/auth/avatar` | Yes | Upload avatar image |
| DELETE | `/api/auth/account` | Yes | Delete account |
| GET | `/api/user-photos` | Yes | Get saved try-on photos |
| POST | `/api/user-photos` | Yes | Upload try-on photo |
| DELETE | `/api/user-photos/:id` | Yes | Delete try-on photo |
| GET | `/api/storefront/:userId` | No | Public seller storefront |
| POST | `/api/vouches` | Yes | Vouch for a user (3 txns gate) |

---

## NEXT: DOC 4 — Listings Module
Item CRUD, 3-photo enforcement, listing photo guidelines overlay, AI condition grade suggestion, search & filter with all parameters, trending algorithm, recently viewed, dynamic pricing engine integration.
