import { useState, useEffect, useCallback } from 'react';
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
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uq, setUq] = useState('');

  const fetchTab = useCallback(async () => {
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
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

  const resolveDispute = async (disputeId, decision, refundAmount = null) => {
    try {
      await api.put(`/api/dispute/${disputeId}/resolve`, {
        admin_decision: decision,
        admin_notes: `Resolved by admin on ${new Date().toLocaleDateString()}`,
        refund_amount: refundAmount,
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

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize whitespace-nowrap transition ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
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
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Users"    value={stats.users} icon="👤" />
                <StatBox label="Total Listings" value={stats.listings} icon="📦" />
                <StatBox label="Transactions"   value={stats.transactions} icon="💳" />
                <StatBox label="Total Revenue"  value={`₹${stats.total_revenue?.toLocaleString()}`} icon="💰" color="text-green-600" />
                <StatBox label="Open Disputes"  value={stats.open_disputes} icon="⚠️" color={stats.open_disputes > 0 ? 'text-red-500' : 'text-gray-900'} />
                <StatBox label="Active Rentals" value={stats.active_rentals} icon="📅" />
                <StatBox label="CO₂ Saved"      value={`${stats.sustainability?.co2_saved_kg} kg`} icon="🌱" color="text-green-600" />
                <StatBox label="Water Saved"    value={`${(stats.sustainability?.water_saved_l / 1000).toFixed(1)}k L`} icon="💧" color="text-blue-600" />
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
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          d.status === 'open'         ? 'bg-yellow-100 text-yellow-700' :
                          d.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>{d.status?.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400 capitalize">{d.type?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm text-gray-600">{d.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Filed: {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs font-mono text-gray-300">{d.id.slice(0, 8)}</p>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
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
