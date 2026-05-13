import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const ChatWindow = ({ sellerId, listingId, sellerName }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const openChat = async () => {
    if (!user) return navigate('/login');
    setLoading(true);
    try {
      const { data } = await api.post('/api/chat/conversations', {
        other_user_id: sellerId,
        listing_id: listingId,
      });
      navigate(`/chat/${data.id}`);
    } catch {
      toast.error('Could not open chat');
    } finally {
      setLoading(false);
    }
  };

  if (user?.id === sellerId) return null;

  return (
    <button
      onClick={openChat}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:border-green-400 hover:text-green-600 transition text-sm disabled:opacity-50"
    >
      💬 {loading ? 'Opening chat…' : `Message ${sellerName}`}
    </button>
  );
};

export default ChatWindow;
