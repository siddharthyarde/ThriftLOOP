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
  const [data, setData]         = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/seller'),
      api.get('/api/listings/me/all'),
    ]).then(([analyticsRes, listingsRes]) => {
      setData(analyticsRes.data);
      setListings(listingsRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!data)   return <div className="text-center py-20 text-gray-400">Could not load dashboard</div>;

  const { summary, top_listing, category_breakdown } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
        <Link to="/create-listing" className="bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-600">
          + New Listing
        </Link>
      </div>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active Listings" value={summary.active_listings} icon="📦" />
            <StatCard label="Total Sold"      value={summary.sold_listings}   icon="✅" />
            <StatCard label="Total Revenue"   value={`₹${(summary.total_revenue || 0).toLocaleString()}`} icon="💰" />
            <StatCard label="Conversion Rate" value={`${summary.conversion_rate}%`} icon="📈" sub={`${summary.total_views} views`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Views"      value={(summary.total_views || 0).toLocaleString()} icon="👁" />
            <StatCard label="Total Saves"      value={(summary.total_saves || 0).toLocaleString()} icon="♥" />
            <StatCard label="Avg Days to Sell" value={summary.avg_days_to_sell ? `${summary.avg_days_to_sell}d` : '—'} icon="⏱" />
            <StatCard label="Open Disputes"    value={summary.open_disputes} icon="⚠️" sub={summary.open_disputes > 0 ? 'Needs attention' : 'All clear'} />
          </div>

          {top_listing && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">🏆 Best Performing Listing</h2>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <img src={top_listing.images?.[0]} alt={top_listing.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{top_listing.title}</p>
                  <p className="text-sm text-gray-500">₹{top_listing.price?.toLocaleString()} · {top_listing.views} views · {top_listing.saves} saves</p>
                </div>
                <Link to={`/listing/${top_listing.id}`} className="text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg">View</Link>
              </div>
            </div>
          )}

          {category_breakdown && Object.keys(category_breakdown).length > 0 && (
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
          )}
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
