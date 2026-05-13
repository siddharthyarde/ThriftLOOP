import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import TrustScore from '../components/TrustScore';
import TryOnModal from '../components/TryOnModal';
import ConditionBadge from '../components/ConditionBadge';
import ChatWindow from '../components/ChatWindow';

const trackRecentlyViewed = (listingId) => {
  const key  = 'recently_viewed';
  const prev = JSON.parse(localStorage.getItem(key) || '[]');
  const next = [listingId, ...prev.filter(i => i !== listingId)].slice(0, 10);
  localStorage.setItem(key, JSON.stringify(next));
};

const ListingDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeImg, setActiveImg]   = useState(0);
  const [saved, setSaved]           = useState(false);
  const [showTryOn, setShowTryOn]   = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data } = await api.get(`/api/listings/${id}`);
        setListing(data);
      } catch {
        toast.error('Listing not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
    if (user) {
      api.get(`/api/wishlist/check/${id}`)
        .then(r => setSaved(r.data.saved))
        .catch(() => setSaved(false));
    }
    api.post(`/api/listings/${id}/view`).catch(() => {});
    trackRecentlyViewed(id);
  }, [id]); // eslint-disable-line

  const toggleWishlist = async () => {
    if (!user) return navigate('/login');
    try {
      if (saved) {
        await api.delete(`/api/wishlist/${id}`);
      } else {
        await api.post(`/api/wishlist/${id}`);
      }
      setSaved(!saved);
      toast.success(saved ? 'Removed from wishlist' : 'Added to wishlist');
    } catch {
      toast.error('Could not update wishlist');
    }
  };

  const handleBuy = async () => {
    if (!user) return navigate('/login');
    setBuyLoading(true);
    try {
      const { data } = await api.post('/api/transactions', {
        listing_id:    listing.id,
        type:          'buy',
        delivery_type: 'meetup',
      });
      navigate(`/order/${data.transaction.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate purchase');
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-square mb-3">
            <img src={listing.images[activeImg]} alt={listing.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2">
            {listing.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                  activeImg === i ? 'border-green-500' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Listing info */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
              <button
                onClick={toggleWishlist}
                className={`text-2xl transition flex-shrink-0 ${saved ? 'text-red-400' : 'text-gray-300 hover:text-red-300'}`}
              >
                {saved ? '♥' : '♡'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="capitalize text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{listing.category}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Size {listing.size}</span>
              <ConditionBadge condition={listing.condition} />
              {listing.condition_ai && listing.condition_ai !== listing.condition && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  🤖 AI suggests: {listing.condition_ai}
                </span>
              )}
            </div>
          </div>

          <p className="text-3xl font-bold text-gray-900">₹{listing.price?.toLocaleString()}</p>

          {listing.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            {listing.available_for?.includes('buy')    && <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">🛍️ Buy</span>}
            {listing.available_for?.includes('swap')   && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">🔄 Swap</span>}
            {listing.available_for?.includes('rental') && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                📦 Rent ₹{listing.rental_price_per_day}/day
              </span>
            )}
          </div>

          {listing.locality && <p className="text-sm text-gray-500">📍 {listing.locality}</p>}

          <div className="flex gap-4 text-sm text-gray-400">
            <span>👁 {listing.views} views</span>
            <span>♡ {listing.saves} saves</span>
          </div>

          {!isOwner ? (
            <div className="flex flex-col gap-3 pt-2">
              {listing.available_for?.includes('buy') && (
                <button
                  onClick={handleBuy}
                  disabled={buyLoading || listing.status !== 'active'}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
                >
                  {buyLoading ? 'Processing…' : listing.status !== 'active' ? 'Not Available' : 'Buy Now'}
                </button>
              )}
              {listing.available_for?.includes('swap') && (
                <Link
                  to={`/swap?target=${listing.id}`}
                  className="w-full text-center border-2 border-blue-400 text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 transition"
                >
                  Propose a Swap
                </Link>
              )}
              {listing.available_for?.includes('rental') && (
                <Link
                  to={`/rental/${listing.id}`}
                  className="w-full text-center border-2 border-purple-400 text-purple-600 font-semibold py-3 rounded-xl hover:bg-purple-50 transition"
                >
                  Rent This Item
                </Link>
              )}
              <button
                onClick={() => setShowTryOn(true)}
                className="w-full border-2 border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
              >
                👗 Virtual Try-On
              </button>
              <ChatWindow sellerId={listing.seller_id} listingId={listing.id} sellerName={listing.users?.name} />
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                to={`/create-listing?edit=${listing.id}`}
                className="flex-1 text-center border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Edit Listing
              </Link>
              <button
                onClick={async () => {
                  try {
                    await api.put(`/api/listings/${listing.id}/delist`);
                    toast.success('Listing delisted');
                    navigate('/dashboard');
                  } catch {
                    toast.error('Could not delist');
                  }
                }}
                className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm hover:bg-red-50"
              >
                Delist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seller card */}
      {listing.users && (
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <Link to={`/storefront/${listing.seller_id}`}>
            <img
              src={listing.users.avatar_url || `https://ui-avatars.com/api/?name=${listing.users.name}&background=22c55e&color=fff`}
              alt={listing.users.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/storefront/${listing.seller_id}`} className="font-semibold text-gray-900 hover:underline">
              {listing.users.name}
            </Link>
            {listing.users.verified && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
            )}
            <div className="mt-0.5"><TrustScore score={listing.users.trust_score} /></div>
          </div>
          <Link
            to={`/storefront/${listing.seller_id}`}
            className="text-sm text-green-600 border border-green-200 px-4 py-1.5 rounded-xl hover:bg-green-50"
          >
            View Store
          </Link>
        </div>
      )}

      {showTryOn && <TryOnModal listing={listing} onClose={() => setShowTryOn(false)} />}
    </div>
  );
};

export default ListingDetail;
