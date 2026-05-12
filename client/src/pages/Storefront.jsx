import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import TrustScore from '../components/TrustScore';

const Storefront = () => {
  const { id } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/storefront/${id}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading...</div>;
  if (!data)   return <div className="text-center py-20 text-gray-400">User not found</div>;

  const { user, listings, total_sales, vouches } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
