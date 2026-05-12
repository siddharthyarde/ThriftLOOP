# DOC 1 — PROJECT SETUP & ARCHITECTURE
### AI-Powered Thrift Marketplace
> Part 1 of 8 | Covers: folder init, Express setup, Supabase connection, middleware, env config, project architecture

---

## 1. PREREQUISITES

Install before starting:

```bash
node --version     # v18+ required
npm --version      # v9+ required
git --version
```

Install global tools:
```bash
npm install -g nodemon
```

---

## 2. PROJECT INITIALIZATION

### 2.1 Create root folder
```bash
mkdir thrift-marketplace
cd thrift-marketplace
git init
```

### 2.2 Create client (React frontend)
```bash
npx create-react-app client
cd client
npm install @supabase/supabase-js axios react-router-dom react-hot-toast qrcode.react
cd ..
```

### 2.3 Create server (Node.js backend)
```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv helmet morgan compression
npm install @supabase/supabase-js
npm install razorpay
npm install qrcode crypto
npm install axios form-data
npm install --save-dev nodemon
cd ..
```

### 2.4 Root .gitignore
```
node_modules/
.env
.env.local
build/
dist/
*.log
.DS_Store
```

---

## 3. FOLDER STRUCTURE (COMPLETE)

```
thrift-marketplace/
│
├── client/                          # React frontend
│   ├── public/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── ListingDetail.jsx
│       │   ├── CreateListing.jsx
│       │   ├── Profile.jsx
│       │   ├── Storefront.jsx
│       │   ├── SwapEngine.jsx
│       │   ├── RentalPage.jsx
│       │   ├── ChatPage.jsx
│       │   ├── OrderTracking.jsx
│       │   ├── AdminPanel.jsx
│       │   ├── StyleQuiz.jsx
│       │   └── SellerDashboard.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ListingCard.jsx
│       │   ├── SearchFilters.jsx
│       │   ├── TryOnModal.jsx
│       │   ├── ChatWindow.jsx
│       │   ├── QRScanner.jsx
│       │   ├── MeetupTimer.jsx
│       │   ├── EscrowStatus.jsx
│       │   ├── DisputePanel.jsx
│       │   ├── SwapCard.jsx
│       │   ├── ConditionBadge.jsx
│       │   ├── TrustScore.jsx
│       │   ├── PhotoGuidelines.jsx
│       │   └── SustainabilityScore.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useRealtime.js
│       │   ├── useListings.js
│       │   └── useNotifications.js
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── NotificationContext.jsx
│       ├── lib/
│       │   ├── supabaseClient.js
│       │   └── api.js
│       ├── utils/
│       │   └── constants.js
│       └── App.jsx
│
├── server/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── listings.js
│   │   ├── transactions.js
│   │   ├── swap.js
│   │   ├── rental.js
│   │   ├── meetup.js
│   │   ├── dispute.js
│   │   ├── tryon.js
│   │   ├── wishlist.js
│   │   ├── analytics.js
│   │   ├── delivery.js
│   │   ├── chat.js
│   │   └── admin.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── listingController.js
│   │   ├── transactionController.js
│   │   ├── swapController.js
│   │   ├── rentalController.js
│   │   ├── meetupController.js
│   │   ├── disputeController.js
│   │   ├── tryonController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authGuard.js
│   │   ├── adminGuard.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── supabase.js
│   │   ├── razorpay.js
│   │   ├── shiprocket.js
│   │   └── api4ai.js
│   ├── utils/
│   │   ├── qrGenerator.js
│   │   ├── trustScore.js
│   │   ├── sustainability.js
│   │   └── seedData.js
│   ├── .env
│   ├── package.json
│   └── index.js
│
├── CLAUDE.md
└── .gitignore
```

---

## 4. ENVIRONMENT VARIABLES

### server/.env
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Razorpay (sandbox)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Shiprocket
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=your_shiprocket_password

# API4AI Virtual Try-On
API4AI_ENDPOINT=https://api4ai.cloud/fashion/virtual-tryon
API4AI_KEY=your_api4ai_key

# App
FRONTEND_URL=http://localhost:3000
```

### client/.env
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

---

## 5. EXPRESS SERVER SETUP

### server/index.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // 10mb for base64 images
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/listings',     require('./routes/listings'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/swap',         require('./routes/swap'));
app.use('/api/rental',       require('./routes/rental'));
app.use('/api/meetup',       require('./routes/meetup'));
app.use('/api/dispute',      require('./routes/dispute'));
app.use('/api/tryon',        require('./routes/tryon'));
app.use('/api/wishlist',     require('./routes/wishlist'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/delivery',     require('./routes/delivery'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/admin',        require('./routes/admin'));

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Error handler (always last) ──────────────────────────────
app.use(require('./middleware/errorHandler'));

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### server/package.json scripts section
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "seed": "node utils/seedData.js"
  }
}
```

---

## 6. SUPABASE SERVICE CLIENT

```javascript
// server/services/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role = bypasses RLS for server ops
);

module.exports = supabase;
```

---

## 7. SUPABASE FRONTEND CLIENT

```javascript
// client/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;
```

---

## 8. AXIOS API WRAPPER (Frontend)

```javascript
// client/src/lib/api.js
import axios from 'axios';
import supabase from './supabaseClient';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 9. MIDDLEWARE

### server/middleware/authGuard.js
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request
    req.user = user;

    // Fetch full profile (role, trust_score, etc.)
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    req.profile = profile;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authGuard;
```

### server/middleware/adminGuard.js
```javascript
const authGuard = require('./authGuard');

const adminGuard = async (req, res, next) => {
  await authGuard(req, res, async () => {
    if (req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

module.exports = adminGuard;
```

### server/middleware/errorHandler.js
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

---

## 10. AUTH CONTEXT (Frontend)

```javascript
// client/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, fetchProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

## 11. REACT ROUTER SETUP

```javascript
// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Profile from './pages/Profile';
import Storefront from './pages/Storefront';
import SwapEngine from './pages/SwapEngine';
import RentalPage from './pages/RentalPage';
import ChatPage from './pages/ChatPage';
import OrderTracking from './pages/OrderTracking';
import AdminPanel from './pages/AdminPanel';
import StyleQuiz from './pages/StyleQuiz';
import SellerDashboard from './pages/SellerDashboard';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { profile } = useAuth();
  return profile?.role === 'admin' ? children : <Navigate to="/" />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/listing/:id"    element={<ListingDetail />} />
        <Route path="/storefront/:id" element={<Storefront />} />

        {/* Protected */}
        <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
        <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/swap"           element={<PrivateRoute><SwapEngine /></PrivateRoute>} />
        <Route path="/rental/:id"     element={<PrivateRoute><RentalPage /></PrivateRoute>} />
        <Route path="/chat/:id"       element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/order/:id"      element={<PrivateRoute><OrderTracking /></PrivateRoute>} />
        <Route path="/style-quiz"     element={<PrivateRoute><StyleQuiz /></PrivateRoute>} />
        <Route path="/dashboard"      element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"          element={<AdminRoute><AdminPanel /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
```

---

## 12. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React.js)                     │
│  Pages → Components → Hooks → Context                   │
│  lib/supabaseClient.js    lib/api.js (Axios)            │
└────────────────┬──────────────────┬─────────────────────┘
                 │  REST API calls  │  Direct Supabase
                 │                 │  (Auth + Realtime)
                 ▼                 ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│  SERVER (Node/Express)│   │        SUPABASE              │
│                       │   │  ┌─────────────────────┐    │
│  routes/              │   │  │  PostgreSQL DB       │    │
│  controllers/         │◄──┤  │  15 tables           │    │
│  middleware/          │   │  └─────────────────────┘    │
│  services/            │   │  ┌─────────────────────┐    │
│  utils/               │   │  │  Auth (JWT)          │    │
│                       │   │  └─────────────────────┘    │
└───────┬───────────────┘   │  ┌─────────────────────┐    │
        │                   │  │  Storage (images)    │    │
        │                   │  └─────────────────────┘    │
        │                   │  ┌─────────────────────┐    │
        │                   │  │  Realtime (chat)     │    │
        │                   │  └─────────────────────┘    │
        │                   └─────────────────────────────┘
        │
        ├──► Razorpay API (payment/escrow sandbox)
        ├──► Shiprocket API (delivery tracking)
        └──► API4AI (virtual try-on)
```

---

## 13. SUPABASE STORAGE BUCKETS

Create these buckets in Supabase dashboard → Storage:

| Bucket | Purpose | Public |
|---|---|---|
| `listing-images` | Clothing photos per listing | Yes |
| `user-avatars` | Profile pictures | Yes |
| `user-photos` | Try-on body photos | No (private) |
| `tryon-results` | Virtual try-on output images | No (private) |
| `dispute-evidence` | Dispute photo uploads | No (private) |

---

## 14. SUPABASE ROW LEVEL SECURITY (RLS) — KEY POLICIES

Enable RLS on all tables. Core policies:

```sql
-- Users can read all profiles
CREATE POLICY "Public profiles readable"
ON users FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users update own profile"
ON users FOR UPDATE USING (auth.uid() = id);

-- Listings are publicly readable
CREATE POLICY "Listings public read"
ON listings FOR SELECT USING (true);

-- Only seller can edit their listing
CREATE POLICY "Seller edits own listing"
ON listings FOR UPDATE USING (auth.uid() = seller_id);

-- Messages: only conversation participants can read
CREATE POLICY "Chat participants only"
ON messages FOR SELECT USING (
  auth.uid() IN (
    SELECT participant_a FROM conversations WHERE id = conversation_id
    UNION
    SELECT participant_b FROM conversations WHERE id = conversation_id
  )
);
```

---

## 15. QR GENERATOR UTILITY

```javascript
// server/utils/qrGenerator.js
const crypto = require('crypto');

/**
 * Generate a one-time QR hash for meetup escrow
 * Hash = SHA256 of listingId:transactionId:timestamp
 */
const generateMeetupQR = (listingId, transactionId) => {
  const payload = `${listingId}:${transactionId}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Verify QR hash matches stored hash for a meetup
 */
const verifyMeetupQR = (inputHash, storedHash) => {
  return inputHash === storedHash;
};

module.exports = { generateMeetupQR, verifyMeetupQR };
```

---

## 16. RUNNING THE PROJECT

### Development (run both simultaneously)
```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm start
```

### Seed database with dummy data
```bash
cd server
npm run seed
```

### Deploy
```
Frontend → Vercel (connect GitHub repo, set /client as root)
Backend  → Render or Railway (set /server as root, add env vars)
```

---

## NEXT: DOC 2 — Database Schema & Seed Data
All 15 table SQL migrations + full seed script generating 200 listings, 50 users, 80 transactions.
