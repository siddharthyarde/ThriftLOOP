import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import supabase from '../lib/supabaseClient';
import { useMessageSubscription } from '../hooks/useRealtime';

const LIMIT = 50;

const ChatPage = () => {
  const { id: conversationId } = useParams();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [convo, setConvo] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const markRead = useCallback(() => {
    api.put(`/api/chat/conversations/${conversationId}/read`).catch(() => {});
  }, [conversationId]);

  const fetchMessages = useCallback(async (before = null) => {
    try {
      const params = before ? `?before=${before}&limit=${LIMIT}` : `?limit=${LIMIT}`;
      const { data } = await api.get(`/api/chat/conversations/${conversationId}/messages${params}`);
      if (before) {
        setMessages(prev => [...(data || []), ...prev]);
      } else {
        setMessages(data || []);
        setTimeout(scrollToBottom, 100);
      }
      setHasMore((data || []).length === LIMIT);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    api.get('/api/chat/conversations')
      .then(r => {
        const found = (r.data || []).find(c => c.id === conversationId);
        if (found) setConvo(found);
      })
      .catch(() => {});
    fetchMessages();
    markRead();
  }, [conversationId, fetchMessages, markRead]);

  const handleNewMessage = useCallback((newMsg) => {
    setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    markRead();
    setTimeout(scrollToBottom, 50);
  }, [markRead]);

  useMessageSubscription(conversationId, handleNewMessage);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.values(state).flat()
          .filter(u => u.user_id !== user?.id && u.typing);
        setTypingUsers(others);
      })
      .subscribe();
    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [conversationId, user?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read: false,
      users: { id: user.id, name: profile?.name, avatar_url: profile?.avatar_url },
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      const { data } = await api.post(`/api/chat/conversations/${conversationId}/messages`, { content });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (channelRef.current) {
      channelRef.current.track({ user_id: user?.id, name: profile?.name, typing: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({ user_id: user?.id, name: profile?.name, typing: false });
      }, 2500);
    }
  };

  const otherUser = convo?.other_user;
  const listing = convo?.listings;

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <img
          src={otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${otherUser?.name}&background=22c55e&color=fff`}
          alt={otherUser?.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{otherUser?.name}</p>
          {listing && (
            <Link to={`/listing/${listing.id}`} className="text-xs text-gray-400 hover:text-green-600 truncate block">
              Re: {listing.title} · ₹{listing.price?.toLocaleString()}
            </Link>
          )}
        </div>
        {listing?.images?.[0] && (
          <Link to={`/listing/${listing.id}`}>
            <img src={listing.images[0]} alt={listing.title}
              className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => fetchMessages(messages[0]?.created_at)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >Load older messages</button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === user?.id;
          const showAvatar = !isMe && (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 flex-shrink-0">
                  {showAvatar && (
                    <img
                      src={msg.users?.avatar_url || `https://ui-avatars.com/api/?name=${msg.users?.name}&size=28&background=e5e7eb&color=374151`}
                      alt={msg.users?.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  )}
                </div>
              )}
              <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-400 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>}
                </p>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message…"
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white disabled:opacity-40 hover:bg-green-600 flex-shrink-0"
        >➤</button>
      </form>
    </div>
  );
};

export default ChatPage;
