import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'bg-yellow-100 text-yellow-700' },
  matched:     { label: 'Confirmed',   color: 'bg-blue-100 text-blue-700' },
  escrow_held: { label: 'Escrow Held', color: 'bg-orange-100 text-orange-700' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  disputed:    { label: 'Disputed',    color: 'bg-red-100 text-red-600' },
  cancelled:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-500' },
};

const SwapCard = ({ swap, currentUserId, onUpdate }) => {
  const isUserA = swap.user_a === currentUserId;
  const myListing = isUserA ? swap.listing_a : swap.listing_b;
  const theirList = isUserA ? swap.listing_b : swap.listing_a;
  const theirUser = isUserA ? swap.user_b_info : swap.user_a_info;
  const status = STATUS_CONFIG[swap.status] || { label: swap.status, color: 'bg-gray-100 text-gray-500' };

  const handleConfirm = async () => {
    try {
      await api.put(`/api/swap/${swap.id}/confirm`);
      toast.success('Swap confirmed!');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm');
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/api/swap/${swap.id}/cancel`);
      toast.success('Swap cancelled');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not cancel');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">You offer</p>
          <img src={myListing?.images?.[0]} alt={myListing?.title}
            className="w-full aspect-square object-cover rounded-xl mb-1" />
          <p className="text-xs font-medium text-gray-700 truncate">{myListing?.title}</p>
          <p className="text-xs text-green-600 font-semibold">₹{myListing?.price?.toLocaleString()}</p>
        </div>

        <div className="flex flex-col items-center justify-center pt-8 gap-2">
          <span className="text-2xl text-gray-300">⇄</span>
          {swap.gap_payment > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-gray-400">gap</p>
              <p className={`text-xs font-bold ${swap.gap_payer === currentUserId ? 'text-orange-500' : 'text-green-500'}`}>
                {swap.gap_payer === currentUserId ? '-' : '+'}₹{swap.gap_payment?.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">They offer</p>
          <img src={theirList?.images?.[0]} alt={theirList?.title}
            className="w-full aspect-square object-cover rounded-xl mb-1" />
          <p className="text-xs font-medium text-gray-700 truncate">{theirList?.title}</p>
          <p className="text-xs text-green-600 font-semibold">₹{theirList?.price?.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={theirUser?.avatar_url || `https://ui-avatars.com/api/?name=${theirUser?.name}&size=24&background=e5e7eb&color=374151`}
            alt={theirUser?.name}
            className="w-6 h-6 rounded-full object-cover"
          />
          <p className="text-xs text-gray-500">{theirUser?.name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
        </div>

        <div className="flex gap-2">
          {swap.status === 'pending' && !isUserA && (
            <>
              <button onClick={handleConfirm}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">Accept</button>
              <button onClick={handleCancel}
                className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">Decline</button>
            </>
          )}
          {swap.status === 'pending' && isUserA && (
            <button onClick={handleCancel}
              className="text-xs border border-red-200 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50">Cancel</button>
          )}
          {swap.status === 'matched' && (
            <Link to={`/swap/${swap.id}`}
              className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">Pay & Proceed →</Link>
          )}
          {swap.status === 'escrow_held' && swap.transaction_id && (
            <Link to={`/order/${swap.transaction_id}`}
              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600">View Order →</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapCard;
