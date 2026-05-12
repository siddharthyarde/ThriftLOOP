import { Link } from 'react-router-dom';
import ConditionBadge from './ConditionBadge';

const ListingCard = ({ listing }) => {
  if (!listing) return null;
  const cover = (listing.images && listing.images[0]) ||
    'https://via.placeholder.com/400x400?text=No+Image';

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition"
    >
      <div className="aspect-square bg-gray-100">
        <img src={cover} alt={listing.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
          <ConditionBadge condition={listing.condition} />
        </div>
        <p className="text-sm font-bold text-gray-900 mt-1">₹{listing.price}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {listing.size} · {listing.locality || '—'}
        </p>
      </div>
    </Link>
  );
};

export default ListingCard;
