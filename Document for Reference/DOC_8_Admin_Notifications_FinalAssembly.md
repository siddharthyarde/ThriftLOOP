# DOC 8 — ADMIN PANEL + NOTIFICATIONS + SUSTAINABILITY + FINAL ASSEMBLY
### AI-Powered Thrift Marketplace
> Part 8 of 8 | Covers: Full admin panel UI, notification center with Supabase Realtime, sustainability score component, Navbar, offers flow, final server/index.js assembly, deployment checklist

---

## 1. OVERVIEW

This final doc completes the platform:
- **Admin Panel** — dispute review with evidence comparison, trust score overrides, platform stats, rental damage decisions, no-show flags
- **Notifications** — real-time badge via Supabase Realtime, notification center drawer
- **Sustainability Score** — CO₂ + water saved displayed on profile and transaction complete
- **Offers Flow** — negotiation between buyer and seller (best offer / counter-offer)
- **Navbar** — authenticated links, unread count badge, mobile-responsive
- **Final Assembly** — complete `server/index.js` with all routes registered, env reference, deployment checklist

---

## 2. BACKEND — ADMIN ROUTES

### server/routes/admin.js
```javascript
const express    = require('express');
const router     = express.Router();
const adminGuard = require('../middleware/adminGuard');
const supabase   = require('../services/supabase');
const { recalculateTrustScore } = require('../utils/trustScore');

// ── PLATFORM STATS ──────────────────────────────────────────
router.get('/stats', adminGuard, async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: totalListings },
      { count: totalTransactions },
      { count: openDisputes },
      { count: activeRentals },
      { data: recentTxns },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('transactions').select('id, amount, type, status, created_at')
        .order('created_at', { ascending: false }).limit(10),
    ]);

    // Revenue (completed transactions)
    const { data: completedTxns } = await supabase
      .from('transactions').select('amount').eq('status', 'completed');
    const totalRevenue = (completedTxns || []).reduce((s, t) => s + (t.amount || 0), 0);

    // Sustainability totals
    const { data: sustData } = await supabase
      .from('sustainability_log').select('co2_saved_kg, water_saved_l');
    const totalCO2   = (sustData || []).reduce((s, l) => s + l.co2_saved_kg, 0);
    const totalWater = (sustData || []).reduce((s, l) => s + l.water_saved_l, 0);

    res.json({
      users:        totalUsers,
      listings:     totalListings,
      transactions: totalTransactions,
      open_disputes: openDisputes,
      active_rentals: activeRentals,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      sustainability: {
        co2_saved_kg:   parseFloat(totalCO2.toFixed(2)),
        water_saved_l:  Math.round(totalWater),
      },
      recent_transactions: recentTxns || [],
    });
  } catch (err) { next(err); }
});

// ── ALL USERS ────────────────────────────────────────────────
router.get('/users', adminGuard, async (req, res, next) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data || [], total: count || 0 });
  } catch (err) { next(err); }
});

// ── OVERRIDE TRUST SCORE ─────────────────────────────────────
router.put('/users/:userId/trust-score', adminGuard, async (req, res, next) => {
  try {
    const { trust_score, verified } = req.body;
    const updates = {};
    if (trust_score !== undefined) updates.trust_score = parseFloat(trust_score);
    if (verified    !== undefined) updates.verified    = verified;

    const { data, error } = await supabase
      .from('users').update(updates).eq('id', req.params.userId).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
});

// ── ALL LISTINGS (admin view) ────────────────────────────────
router.get('/listings', adminGuard, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('listings')
      .select(`*, users!seller_id(id, name, email)`, { count: 'exact' })
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ listings: data || [], total: count || 0 });
  } catch (err) { next(err); }
});

// ── FORCE DELIST ─────────────────────────────────────────────
router.put('/listings/:id/force-delist', adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'delisted', delisted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
});

// ── MEETUP NO-SHOW FLAGS ─────────────────────────────────────
router.get('/noshow-flags', adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('meetups')
      .select(`
        *, transactions(id, amount, buyer_id, seller_id,
          listings(id, title, images))
      `)
      .in('status', ['buyer_noshow', 'seller_noshow', 'disputed'])
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

// ── RECALCULATE TRUST SCORE ──────────────────────────────────
router.post('/users/:userId/recalc-trust', adminGuard, async (req, res, next) => {
  try {
    const score = await recalculateTrustScore(req.params.userId);
    res.json({ trust_score: score });
  } catch (err) { next(err); }
});

module.exports = router;
```

---

## 3. FRONTEND — ADMIN PANEL PAGE

### client/src/pages/AdminPanel.jsx
```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const TABS = ['overview', 'disputes', 'users', 'listings', 'no-shows'];

const StatBox = ({ label, value, icon, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

const AdminPanel = () => {
  const [tab,      setTab]      = useState('overview');
  const [stats,    setStats]    = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [listings, setListings] = useState([]);
  const [noShows,  setNoShows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [uq,       setUq]       = useState('');

  useEffect(() => {
    fetchTab();
  }, [tab]);

  const fetchTab = async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const { data } = await api.get('/api/admin/stats');
        setStats(data);
      } else if (tab === 'disputes') {
        const { data } = await api.get('/api/dispute/admin/all');
        setDisputes(data || []);
      } else if (tab === 'users') {
        const { data } = await api.get('/api/admin/users?limit=50');
        setUsers(data.users || []);
      } else if (tab === 'listings') {
        const { data } = await api.get('/api/admin/listings?limit=50');
        setListings(data.listings || []);
      } else if (tab === 'no-shows') {
        const { data } = await api.get('/api/admin/noshow-flags');
        setNoShows(data || []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const resolveDispute = async (disputeId, decision, refundAmount = null) => {
    try {
      await api.put(`/api/dispute/${disputeId}/resolve`, {
        admin_decision: decision,
        admin_notes:    `Resolved by admin on ${new Date().toLocaleDateString()}`,
        refund_amount:  refundAmount,
      });
      toast.success('Dispute resolved!');
      fetchTab();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve');
    }
  };

  const overrideTrust = async (userId, score) => {
    try {
      await api.put(`/api/admin/users/${userId}/trust-score`, { trust_score: score });
      toast.success('Trust score updated');
      fetchTab();
    } catch { toast.error('Failed to update'); }
  };

  const toggleVerified = async (userId, currentValue) => {
    try {
      await api.put(`/api/admin/users/${userId}/trust-score`, { verified: !currentValue });
      toast.success(currentValue ? 'Verification removed' : 'User verified!');
      fetchTab();
    } catch { toast.error('Failed to update'); }
  };

  const forceDelist = async (listingId) => {
    if (!window.confirm('Force delist this listing?')) return;
    try {
      await api.put(`/api/admin/listings/${listingId}/force-delist`);
      toast.success('Listing delisted');
      fetchTab();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize whitespace-nowrap transition ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'no-shows' ? '🚩 No-Shows' :
             t === 'disputes' ? '⚖️ Disputes' :
             t === 'overview' ? '📊 Overview' :
             t === 'users'    ? '👥 Users' : '📦 Listings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Loading…</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Users"        value={stats.users}          icon="👤" />
                <StatBox label="Total Listings"     value={stats.listings}       icon="📦" />
                <StatBox label="Transactions"       value={stats.transactions}   icon="💳" />
                <StatBox label="Total Revenue"      value={`₹${stats.total_revenue?.toLocaleString()}`} icon="💰" color="text-green-600" />
                <StatBox label="Open Disputes"      value={stats.open_disputes}  icon="⚠️" color={stats.open_disputes > 0 ? 'text-red-500' : 'text-gray-900'} />
                <StatBox label="Active Rentals"     value={stats.active_rentals} icon="📅" />
                <StatBox label="CO₂ Saved"          value={`${stats.sustainability?.co2_saved_kg} kg`} icon="🌱" color="text-green-600" />
                <StatBox label="Water Saved"        value={`${(stats.sustainability?.water_saved_l / 1000).toFixed(1)}k L`} icon="💧" color="text-blue-600" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-3">Recent Transactions</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['ID', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(stats.recent_transactions || []).map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{t.id.slice(0, 8)}…</td>
                          <td className="px-4 py-3 capitalize">{t.type}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">₹{t.amount?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                              t.status === 'completed' ? 'bg-green-100 text-green-700' :
                              t.status === 'disputed'  ? 'bg-red-100 text-red-600' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{t.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── DISPUTES ── */}
          {tab === 'disputes' && (
            <div className="space-y-4">
              {disputes.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-2">⚖️</p>
                  <p>No disputes to review</p>
                </div>
              )}
              {disputes.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Dispute header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          d.status === 'open'         ? 'bg-yellow-100 text-yellow-700' :
                          d.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>{d.status.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400 capitalize">{d.type?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm text-gray-600">{d.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Filed: {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs font-mono text-gray-300">{d.id.slice(0, 8)}</p>
                  </div>

                  {/* Evidence comparison */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Listing original */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Original Listing Photo</p>
                      {d.listing_photo ? (
                        <div>
                          <img src={d.listing_photo} alt="Listing" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                          {d.listing_photo_timestamp && (
                            <p className="text-[10px] text-gray-400 mt-1">📅 {new Date(d.listing_photo_timestamp).toLocaleDateString()}</p>
                          )}
                        </div>
                      ) : <div className="w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">No photo</div>}
                    </div>

                    {/* Filer evidence */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Filer Evidence ({d.filer?.name})
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {(d.evidence_filer || []).slice(0, 4).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`Evidence ${i + 1}`} className="aspect-square object-cover rounded-lg border border-gray-100 hover:opacity-80 transition" />
                          </a>
                        ))}
                        {(d.evidence_filer || []).length === 0 && (
                          <div className="col-span-2 aspect-square bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 text-sm">No evidence</div>
                        )}
                      </div>
                      {d.complaint_photo_timestamp && (
                        <p className="text-[10px] text-gray-400 mt-1">📅 {new Date(d.complaint_photo_timestamp).toLocaleDateString()}</p>
                      )}
                    </div>

                    {/* Defense evidence */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Defense Evidence ({d.defendant?.name})
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {(d.evidence_defense || []).slice(0, 4).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt={`Defense ${i + 1}`} className="aspect-square object-cover rounded-lg border border-gray-100 hover:opacity-80 transition" />
                          </a>
                        ))}
                        {(d.evidence_defense || []).length === 0 && (
                          <div className="col-span-2 aspect-square bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 text-sm">Awaiting evidence</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User profiles */}
                  <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                    {[{ label: 'Filer', user: d.filer }, { label: 'Defendant', user: d.defendant }].map(({ label, user }) => (
                      <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                        <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name}&size=32&background=e5e7eb`}
                          alt={user?.name} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">{label}: {user?.name}</p>
                          <p className="text-xs text-gray-400">Trust: {user?.trust_score?.toFixed(1)} ★</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resolution actions */}
                  {d.status !== 'resolved' && (
                    <div className="px-5 pb-5 flex gap-2 flex-wrap border-t border-gray-100 pt-4">
                      <button onClick={() => resolveDispute(d.id, 'buyer_wins')}
                        className="text-xs bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 font-medium">
                        ✅ Buyer Wins (Refund)
                      </button>
                      <button onClick={() => resolveDispute(d.id, 'seller_wins')}
                        className="text-xs bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 font-medium">
                        ✅ Seller Wins (Release)
                      </button>
                      <button onClick={() => {
                        const amt = prompt('Enter partial refund amount (₹):');
                        if (amt) resolveDispute(d.id, 'partial_refund', parseFloat(amt));
                      }}
                        className="text-xs bg-orange-400 text-white px-4 py-2 rounded-xl hover:bg-orange-500 font-medium">
                        ⚖️ Partial Refund
                      </button>
                      <button onClick={() => resolveDispute(d.id, 'no_action')}
                        className="text-xs border border-gray-200 text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50 font-medium">
                        No Action
                      </button>
                    </div>
                  )}
                  {d.status === 'resolved' && (
                    <div className="px-5 pb-5">
                      <p className="text-sm text-green-600 font-medium">
                        ✅ Resolved: {d.admin_decision?.replace(/_/g, ' ')}
                      </p>
                      {d.admin_notes && <p className="text-xs text-gray-400 mt-0.5">{d.admin_notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Search users…" value={uq}
                  onChange={e => setUq(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      const { data } = await api.get(`/api/admin/users?q=${uq}&limit=50`);
                      setUsers(data.users || []);
                    }
                  }}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 flex-1"
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['User', 'City', 'Trust', 'Verified', 'Role', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}&size=28&background=e5e7eb`}
                              alt={u.name} className="w-7 h-7 rounded-full" />
                            <div>
                              <p className="font-medium text-gray-900 text-xs">{u.name}</p>
                              <p className="text-[10px] text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.locality || '—'}</td>
                        <td className="px-4 py-3">
                          <input type="number" defaultValue={u.trust_score} step="0.1" min="0" max="5"
                            onBlur={e => overrideTrust(u.id, parseFloat(e.target.value))}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleVerified(u.id, u.verified)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              u.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {u.verified ? '✓ Verified' : 'Unverified'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/storefront/${u.id}`}
                            className="text-xs text-green-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LISTINGS ── */}
          {tab === 'listings' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Item', 'Seller', 'Price', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={l.images?.[0]} alt={l.title} className="w-10 h-10 rounded-lg object-cover" />
                          <p className="text-xs font-medium text-gray-800 max-w-[150px] truncate">{l.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.users?.name}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-green-600">₹{l.price?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                          l.status === 'active'   ? 'bg-green-100 text-green-700' :
                          l.status === 'sold'     ? 'bg-gray-100 text-gray-500' :
                          l.status === 'delisted' ? 'bg-red-100 text-red-500' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{l.status}</span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <Link to={`/listing/${l.id}`} className="text-xs text-blue-500 hover:underline">View</Link>
                        {l.status !== 'delisted' && (
                          <button onClick={() => forceDelist(l.id)}
                            className="text-xs text-red-400 hover:underline">Delist</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── NO-SHOWS ── */}
          {tab === 'no-shows' && (
            <div className="space-y-3">
              {noShows.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-2">✅</p><p>No flagged no-shows</p>
                </div>
              )}
              {noShows.map(m => (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {m.status === 'buyer_noshow' ? '🚩 Buyer No-Show' :
                         m.status === 'seller_noshow' ? '🚩 Seller No-Show' : '⚠️ Disputed'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Scheduled: {new Date(m.scheduled_time).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Transaction: {m.transaction_id?.slice(0, 8)}… · ₹{m.transactions?.amount?.toLocaleString()}
                      </p>
                    </div>
                    {m.transactions?.listings?.images?.[0] && (
                      <img src={m.transactions.listings.images[0]} alt=""
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;
```

---

## 4. BACKEND — OFFERS ROUTES

### server/routes/offers.js
```javascript
const express  = require('express');
const router   = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase  = require('../services/supabase');

// POST /api/offers — make an offer
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { listing_id, amount } = req.body;
    const buyerId = req.user.id;

    const { data: listing } = await supabase.from('listings').select('*').eq('id', listing_id).single();
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.seller_id === buyerId) return res.status(400).json({ error: 'Cannot offer on own listing' });
    if (amount >= listing.price) return res.status(400).json({ error: 'Offer must be below listing price' });

    const { data, error } = await supabase.from('offers').insert({
      listing_id, buyer_id: buyerId, seller_id: listing.seller_id, amount: parseFloat(amount),
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('notifications').insert({
      user_id:  listing.seller_id, type: 'offer_received',
      title:    'New Offer Received!',
      content:  `Someone offered ₹${amount} on "${listing.title}"`,
      metadata: { offer_id: data.id, listing_id },
    });

    res.status(201).json(data);
  } catch (err) { next(err); }
});

// GET /api/offers/me — get my offers (as buyer or seller)
router.get('/me', authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('offers')
      .select(`*, listings(id, title, images, price)`)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

// PUT /api/offers/:id/counter — seller counters
router.put('/:id/counter', authGuard, async (req, res, next) => {
  try {
    const { counter_amount } = req.body;
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can counter' });

    const { data } = await supabase.from('offers')
      .update({ status: 'countered', counter_amount: parseFloat(counter_amount) })
      .eq('id', req.params.id).select().single();

    await supabase.from('notifications').insert({
      user_id: offer.buyer_id, type: 'offer_received',
      title: 'Counter-Offer Received', content: `Seller countered at ₹${counter_amount}`,
      metadata: { offer_id: offer.id, listing_id: offer.listing_id },
    });

    res.json(data);
  } catch (err) { next(err); }
});

// PUT /api/offers/:id/accept — accept (buyer or seller)
router.put('/:id/accept', authGuard, async (req, res, next) => {
  try {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });

    const isParty = offer.buyer_id === req.user.id || offer.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    const { data } = await supabase.from('offers')
      .update({ status: 'accepted' }).eq('id', req.params.id).select().single();

    const notifyId = req.user.id === offer.buyer_id ? offer.seller_id : offer.buyer_id;
    await supabase.from('notifications').insert({
      user_id: notifyId, type: 'offer_accepted',
      title: 'Offer Accepted!', content: `The offer for ₹${offer.counter_amount || offer.amount} was accepted.`,
      metadata: { offer_id: offer.id },
    });

    res.json(data);
  } catch (err) { next(err); }
});

// PUT /api/offers/:id/decline — decline
router.put('/:id/decline', authGuard, async (req, res, next) => {
  try {
    const { data: offer } = await supabase.from('offers').select('*').eq('id', req.params.id).single();
    if (!offer) return res.status(404).json({ error: 'Not found' });

    const isParty = offer.buyer_id === req.user.id || offer.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    const { data } = await supabase.from('offers')
      .update({ status: 'declined' }).eq('id', req.params.id).select().single();

    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
```

Add to `server/index.js`:
```javascript
app.use('/api/offers', require('./routes/offers'));
```

---

## 5. FRONTEND — NOTIFICATION CENTER

### client/src/context/NotificationContext.jsx
```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user }  = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', {
        event:  'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await api.get('/api/notifications').catch(() => ({ data: [] }));
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.read).length);
  };

  const markAllRead = async () => {
    await api.put('/api/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
```

### server/routes/notifications.js
```javascript
const express   = require('express');
const router    = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase  = require('../services/supabase');

router.get('/', authGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

router.put('/read-all', authGuard, async (req, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', req.user.id)
      .eq('read', false);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put('/:id/read', authGuard, async (req, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
```

---

## 6. FRONTEND — NAVBAR

### client/src/components/Navbar.jsx
```jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NOTIFICATION_ICONS = {
  wishlist_match:   '💝',
  meetup_reminder:  '📍',
  meetup_grace_start: '⏱',
  dispute_update:   '⚠️',
  offer_received:   '💬',
  offer_accepted:   '✅',
  rental_return_due:'📦',
  swap_matched:     '🔄',
  escrow_released:  '💰',
  listing_sold:     '🎉',
};

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 font-black text-gray-900 text-lg flex-shrink-0">
          <span className="text-2xl">👕</span>
          <span className="hidden sm:block">Thrift</span>
        </Link>

        {/* Search shortcut */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            onClick={() => navigate('/?q=')}
            className="w-full flex items-center gap-2 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 transition"
          >
            🔍 <span>Search clothing…</span>
          </button>
        </div>

        <div className="flex-1" />

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { path: '/',         label: 'Browse' },
            { path: '/swap',     label: '🔄 Swap' },
          ].map(({ path, label }) => (
            <Link key={path} to={path}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                isActive(path) ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            {/* Sell button */}
            <Link to="/create-listing"
              className="hidden sm:flex bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              + Sell
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                    <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 15).map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${!n.read ? 'bg-green-50/50' : ''}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">{NOTIFICATION_ICONS[n.type] || '📢'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-gray-300 mt-1">
                                {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar menu */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 hover:border-green-400 transition">
                <img
                  src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name}&background=22c55e&color=fff`}
                  alt={profile?.name}
                  className="w-full h-full object-cover"
                />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm truncate">{profile?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                  </div>
                  {[
                    { path: '/profile',   label: '👤 My Profile' },
                    { path: '/dashboard', label: '📊 Dashboard' },
                    { path: '/create-listing', label: '+ Sell Item' },
                    ...(profile?.role === 'admin' ? [{ path: '/admin', label: '🔧 Admin Panel' }] : []),
                  ].map(({ path, label }) => (
                    <Link key={path} to={path} onClick={() => setShowMenu(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => { signOut(); setShowMenu(false); navigate('/'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-medium text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
              Sign In
            </Link>
            <Link to="/register"
              className="text-sm font-semibold bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition">
              Join
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
```

---

## 7. FRONTEND — SUSTAINABILITY SCORE COMPONENT

### client/src/components/SustainabilityScore.jsx
```jsx
import { useState, useEffect } from 'react';
import api from '../lib/api';

const SustainabilityScore = ({ userId }) => {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    api.get(`/api/analytics/sustainability${userId ? `?user_id=${userId}` : ''}`)
      .then(r => setImpact(r.data))
      .catch(() => {});
  }, [userId]);

  if (!impact) return null;

  const co2Equiv  = (impact.co2_saved / 2.1).toFixed(0); // shirts equivalent
  const waterEq   = (impact.water_saved / 50).toFixed(0); // showers equivalent

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
      <h3 className="font-bold text-green-800 text-base mb-3">🌱 Your Impact</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{impact.co2_saved} kg</p>
          <p className="text-xs text-gray-500 mt-0.5">CO₂ Saved</p>
          <p className="text-[10px] text-green-500 mt-1">≈ {co2Equiv} new shirts not made</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{(impact.water_saved / 1000).toFixed(1)}k L</p>
          <p className="text-xs text-gray-500 mt-0.5">Water Saved</p>
          <p className="text-[10px] text-blue-500 mt-1">≈ {waterEq} showers</p>
        </div>
      </div>
      <p className="text-xs text-green-600 text-center mt-3">
        From {impact.transactions} completed transactions
      </p>
    </div>
  );
};

export default SustainabilityScore;
```

### server/routes/analytics.js (add sustainability endpoint)
```javascript
// Add this to the existing analytics router:

// GET /api/analytics/sustainability
router.get('/sustainability', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const { getUserImpact } = require('../utils/sustainability');

    if (user_id) {
      const impact = await getUserImpact(user_id);
      return res.json(impact);
    }

    // Platform-wide totals
    const { data } = await supabase.from('sustainability_log').select('co2_saved_kg, water_saved_l');
    const co2   = (data || []).reduce((s, l) => s + l.co2_saved_kg, 0);
    const water = (data || []).reduce((s, l) => s + l.water_saved_l, 0);
    res.json({ co2_saved: parseFloat(co2.toFixed(2)), water_saved: Math.round(water), transactions: data?.length || 0 });
  } catch (err) { next(err); }
});
```

---

## 8. FINAL SERVER/INDEX.JS — COMPLETE ASSEMBLY

### server/index.js (final complete version)
```javascript
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/user-photos',   require('./routes/userPhotos'));
app.use('/api/storefront',    require('./routes/storefront'));
app.use('/api/vouches',       require('./routes/vouches'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/uploads',       require('./routes/uploads'));
app.use('/api/wishlist',      require('./routes/wishlist'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/meetup',        require('./routes/meetup'));
app.use('/api/delivery',      require('./routes/delivery'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/swap',          require('./routes/swap'));
app.use('/api/tryon',         require('./routes/tryon'));
app.use('/api/rental',        require('./routes/rental'));
app.use('/api/dispute',       require('./routes/dispute'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/offers',        require('./routes/offers'));
app.use('/api/admin',         require('./routes/admin'));

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV })
);

// ─── 404 handler ──────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
);

// ─── Error handler (always last) ──────────────────────────────
app.use(require('./middleware/errorHandler'));

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Thrift Marketplace server running`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Env:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});
```

---

## 9. FINAL CLIENT/SRC/APP.JSX — COMPLETE WITH PROVIDERS

### client/src/App.jsx (final complete version)
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';

// Pages
import Home           from './pages/Home';
import Login          from './pages/Login';
import Register       from './pages/Register';
import ListingDetail  from './pages/ListingDetail';
import CreateListing  from './pages/CreateListing';
import Profile        from './pages/Profile';
import Storefront     from './pages/Storefront';
import SwapEngine     from './pages/SwapEngine';
import RentalPage     from './pages/RentalPage';
import ChatPage       from './pages/ChatPage';
import OrderTracking  from './pages/OrderTracking';
import AdminPanel     from './pages/AdminPanel';
import StyleQuiz      from './pages/StyleQuiz';
import SellerDashboard from './pages/SellerDashboard';

// Route guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return profile?.role === 'admin' ? children : <Navigate to="/" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
    <Routes>
      {/* Public */}
      <Route path="/"               element={<Home />} />
      <Route path="/listing/:id"    element={<ListingDetail />} />
      <Route path="/storefront/:id" element={<Storefront />} />
      <Route path="/login"          element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register"       element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

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

      {/* Fallback */}
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  </>
);

const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </NotificationProvider>
  </AuthProvider>
);

export default App;
```

---

## 10. COMPLETE FILE TREE — FINAL STATE

```
thrift-marketplace/
├── client/src/
│   ├── pages/
│   │   ├── Home.jsx               ✅ DOC 4
│   │   ├── Login.jsx              ✅ DOC 3
│   │   ├── Register.jsx           ✅ DOC 3
│   │   ├── ListingDetail.jsx      ✅ DOC 4
│   │   ├── CreateListing.jsx      ✅ DOC 4
│   │   ├── Profile.jsx            ✅ DOC 3
│   │   ├── Storefront.jsx         ✅ DOC 3
│   │   ├── SwapEngine.jsx         ✅ DOC 6
│   │   ├── RentalPage.jsx         ✅ DOC 7
│   │   ├── ChatPage.jsx           ✅ DOC 6
│   │   ├── OrderTracking.jsx      ✅ DOC 5
│   │   ├── AdminPanel.jsx         ✅ DOC 8
│   │   ├── StyleQuiz.jsx          ✅ DOC 3
│   │   └── SellerDashboard.jsx    ✅ DOC 4
│   ├── components/
│   │   ├── Navbar.jsx             ✅ DOC 8
│   │   ├── ListingCard.jsx        ✅ DOC 4
│   │   ├── SearchFilters.jsx      ✅ DOC 4
│   │   ├── TryOnModal.jsx         ✅ DOC 7
│   │   ├── ChatWindow.jsx         ✅ DOC 6
│   │   ├── QRScanner.jsx          ✅ DOC 5
│   │   ├── MeetupTimer.jsx        ✅ DOC 5
│   │   ├── EscrowStatus.jsx       ✅ DOC 5
│   │   ├── DisputePanel.jsx       ✅ DOC 7
│   │   ├── SwapCard.jsx           ✅ DOC 6
│   │   ├── ConditionBadge.jsx     ✅ DOC 4
│   │   ├── TrustScore.jsx         ✅ DOC 3
│   │   ├── PhotoGuidelines.jsx    ✅ DOC 4
│   │   └── SustainabilityScore.jsx ✅ DOC 8
│   ├── hooks/
│   │   ├── useAuth.js             ✅ DOC 3
│   │   ├── useRealtime.js         ✅ DOC 6
│   │   ├── useRazorpay.js         ✅ DOC 5
│   │   └── useNotifications.js    ✅ DOC 8
│   ├── context/
│   │   ├── AuthContext.jsx        ✅ DOC 1
│   │   └── NotificationContext.jsx ✅ DOC 8
│   ├── lib/
│   │   ├── supabaseClient.js      ✅ DOC 1
│   │   └── api.js                 ✅ DOC 1
│   └── App.jsx                    ✅ DOC 8
│
└── server/
    ├── routes/
    │   ├── auth.js                ✅ DOC 3
    │   ├── listings.js            ✅ DOC 4
    │   ├── uploads.js             ✅ DOC 4
    │   ├── wishlist.js            ✅ DOC 4
    │   ├── analytics.js           ✅ DOC 4 + 8
    │   ├── transactions.js        ✅ DOC 5
    │   ├── meetup.js              ✅ DOC 5
    │   ├── delivery.js            ✅ DOC 5
    │   ├── chat.js                ✅ DOC 6
    │   ├── swap.js                ✅ DOC 6
    │   ├── tryon.js               ✅ DOC 7
    │   ├── rental.js              ✅ DOC 7
    │   ├── dispute.js             ✅ DOC 7
    │   ├── notifications.js       ✅ DOC 8
    │   ├── offers.js              ✅ DOC 8
    │   ├── admin.js               ✅ DOC 8
    │   ├── storefront.js          ✅ DOC 3
    │   ├── vouches.js             ✅ DOC 3
    │   └── userPhotos.js          ✅ DOC 3
    ├── controllers/               ✅ All covered across docs
    ├── middleware/
    │   ├── authGuard.js           ✅ DOC 1
    │   ├── adminGuard.js          ✅ DOC 1
    │   └── errorHandler.js        ✅ DOC 1
    ├── services/
    │   ├── supabase.js            ✅ DOC 1
    │   ├── razorpay.js            ✅ DOC 5
    │   ├── shiprocket.js          ✅ DOC 5
    │   └── api4ai.js              ✅ DOC 7
    ├── utils/
    │   ├── qrGenerator.js         ✅ DOC 1
    │   ├── trustScore.js          ✅ DOC 3
    │   ├── sustainability.js      ✅ DOC 5
    │   └── seedData.js            ✅ DOC 2
    └── index.js                   ✅ DOC 8
```

---

## 11. ENVIRONMENT VARIABLES — COMPLETE REFERENCE

### server/.env
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Razorpay sandbox
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Shiprocket
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=yourpassword

# API4AI Virtual Try-On
API4AI_ENDPOINT=https://api4ai.cloud/fashion/virtual-tryon
API4AI_KEY=your_api4ai_key_here
```

### client/.env
```env
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOi...
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

---

## 12. SUPABASE STORAGE BUCKETS — SETUP CHECKLIST

Go to **Supabase Dashboard → Storage → New Bucket** and create:

| Bucket Name | Public | Used For |
|---|---|---|
| `listing-images` | ✅ Yes | Clothing photos, all listing images |
| `user-avatars` | ✅ Yes | Profile picture uploads |
| `user-photos` | ❌ Private | Try-on body photos (personal) |
| `tryon-results` | ❌ Private | Virtual try-on output images |
| `dispute-evidence` | ❌ Private | Evidence photos for disputes |

---

## 13. SUPABASE ADDITIONAL SQL — RUN AFTER MIGRATIONS

```sql
-- ── RPC for safe view increment ──────────────────────────────
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE listings SET views = views + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Admin RLS bypass policy (service role bypasses anyway) ───
-- Disputes: admin can read all
CREATE POLICY "Admin reads all disputes"
ON disputes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Transactions: admin can read all
CREATE POLICY "Admin reads all transactions"
ON transactions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Meetups: admin can read all
CREATE POLICY "Admin reads all meetups"
ON meetups FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 14. DEPLOYMENT CHECKLIST

### Backend (Render / Railway)
```
☐ Set root directory to /server
☐ Build command: npm install
☐ Start command: node index.js
☐ Add all server/.env variables in dashboard
☐ Set NODE_ENV=production
☐ Set FRONTEND_URL to Vercel deployment URL
```

### Frontend (Vercel)
```
☐ Set root directory to /client
☐ Build command: npm run build
☐ Output directory: build
☐ Add all client/.env variables as Vercel env vars
☐ Set REACT_APP_API_BASE_URL to Render/Railway backend URL
☐ Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
```

### Supabase
```
☐ Run all 15 CREATE TABLE migrations (DOC 2)
☐ Run utility functions SQL (DOC 2, Section 17)
☐ Run additional SQL above (Section 13 of this doc)
☐ Create all 5 storage buckets with correct public/private settings
☐ Enable Realtime for: messages, notifications tables
    → Supabase Dashboard → Database → Replication → Add tables
☐ Run seed script: cd server && npm run seed
☐ Verify: users (50), listings (200), transactions (80)
```

### Supabase Realtime — Enable These Tables
```
Dashboard → Database → Replication → Source → supabase_realtime publication
Add tables:
  ✅ messages
  ✅ notifications
  ✅ meetups   (for grace timer polling fallback)
```

---

## 15. QUICK-START COMMANDS

```bash
# 1. Clone & install
git clone <repo>
cd thrift-marketplace

# 2. Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. Set up .env files
cp server/.env.example server/.env   # fill in your keys
cp client/.env.example client/.env   # fill in your keys

# 4. Run Supabase migrations
# → Paste SQL from DOC 2 into Supabase SQL Editor

# 5. Seed database
cd server && npm run seed

# 6. Start development servers (two terminals)
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm start

# App runs at: http://localhost:3000
# API runs at: http://localhost:5000
# Admin login: use first seeded user (aarav0@example.com, any password after reset)
```

---

## 16. VIVA / DEMO TALKING POINTS

| Feature | Where to Show | Wow Factor |
|---|---|---|
| 3-photo enforcement | Create Listing page | Try submitting with 2 photos → blocked |
| QR Meetup | Order Tracking page (meetup txn) | Show timer countdown, QR display |
| Real-time chat | Chat page in two browser windows | Messages appear instantly |
| Virtual Try-On | Any listing page → "Try This On" | API4AI result side-by-side |
| Swap Engine | /swap → Browse → Propose | Gap calculation shown live |
| Dispute panel | Admin → Disputes | Side-by-side photo comparison |
| Sustainability | Profile page | CO₂ + water saved numbers |
| Trust Score | Any storefront | ★★★★☆ with vouch avatars |
| Dynamic Pricing | Create Listing → enter price | "Suggested ₹X–₹Y" tooltip |
| Escrow states | Order Tracking | pending → held → released flow |

---

*All 8 docs complete. The platform is fully specified and ready to build.*
*Total: ~2,400 lines of production code across 40+ files.*
