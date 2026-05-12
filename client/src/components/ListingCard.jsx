import { Link } from 'react-router-dom';
import ConditionBadge from './ConditionBadge';

const ListingCard = ({ listing, compact = false }) => {
  if (!listing) return null;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={listing.images?.[0]}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Available-for badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {listing.available_for?.includes('swap')   && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">SWAP</span>}
          {listing.available_for?.includes('rental') && <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full">RENT</span>}
        </div>
        {listing.status !== 'active' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold uppercase text-sm tracking-wider">{listing.status}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <p className="text-base font-bold text-gray-900">₹{listing.price?.toLocaleString()}</p>
          <ConditionBadge condition={listing.condition} size="xs" />
        </div>
        {!compact && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {listing.size} · {listing.users?.locality || listing.locality}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ListingCard;
