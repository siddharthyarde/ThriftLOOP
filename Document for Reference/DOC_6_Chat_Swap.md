# DOC 6 — REAL-TIME CHAT + SMART SWAP ENGINE
### AI-Powered Thrift Marketplace
> Part 6 of 8 | Covers: Supabase Realtime chat, typing indicators, read receipts, full swap engine with valuation gap, mutual confirmation, swap-specific escrow and meetup

---

## 1. OVERVIEW

### Chat
- Built entirely on **Supabase Realtime** (postgres_changes subscription)
- Typing indicators via **Supabase Presence**
- Read receipts tracked in `messages.read` column
- Conversation initiated from a listing page (buyer → seller)

### Swap Engine
- User A proposes swap with their listing vs a target listing
- System calculates gap = abs(value_A – value_B)
- Lower-value party pays gap into escrow + both pay safety deposit
- Mutual confirmation required → meetup or delivery

---

## 2. BACKEND — CHAT ROUTES

### server/routes/chat.js
```javascript
const express = require('express');
const router  = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
} = require('../controllers/chatController');

router.get('/conversations',          authGuard, getConversations);
router.post('/conversations',         authGuard, getOrCreateConversation);
router.get('/conversations/:id/messages', authGuard, getMessages);
router.post('/conversations/:id/messages', authGuard, sendMessage);
router.put('/conversations/:id/read',  authGuard, markRead);

module.exports = router;
```

---

## 3. BACKEND — CHAT CONTROLLER

### server/controllers/chatController.js
```javascript
const supabase = require('../services/supabase');

// ─── GET ALL CONVERSATIONS ────────────────────────────────────
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, created_at, last_message, last_message_at,
        listing_id,
        listings(id, title, images, price, status),
        participant_a, participant_b,
        user_a:users!participant_a(id, name, avatar_url),
        user_b:users!participant_b(id, name, avatar_url)
      `)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) return res.status(500).json({ error: error.message });

    // Attach unread count per conversation
    const convoIds = (data || []).map(c => c.id);
    const { data: unreadCounts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convoIds)
      .eq('read', false)
      .neq('sender_id', userId);

    const unreadMap = {};
    (unreadCounts || []).forEach(m => {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });

    const enriched = (data || []).map(c => ({
      ...c,
      other_user: c.participant_a === userId ? c.user_b : c.user_a,
      unread_count: unreadMap[c.id] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// ─── GET OR CREATE CONVERSATION ───────────────────────────────
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { other_user_id, listing_id } = req.body;
    const userId = req.user.id;

    if (userId === other_user_id) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_a.eq.${userId},participant_b.eq.${other_user_id}),` +
        `and(participant_a.eq.${other_user_id},participant_b.eq.${userId})`
      )
      .eq('listing_id', listing_id)
      .single();

    if (existing) return res.json(existing);

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_a: userId,
        participant_b: other_user_id,
        listing_id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// ─── GET MESSAGES ─────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { id: conversationId }    = req.params;
    const { before, limit = 50 }   = req.query;
    const userId = req.user.id;

    // Verify user is in conversation
    const { data: convo } = await supabase
      .from('conversations')
      .select('participant_a, participant_b')
      .eq('id', conversationId)
      .single();

    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.participant_a !== userId && convo.participant_b !== userId) {
      return res.status(403).json({ error: 'Not your conversation' });
    }

    let query = supabase
      .from('messages')
      .select(`*, users!sender_id(id, name, avatar_url)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json((data || []).reverse()); // Return oldest first
  } catch (err) {
    next(err);
  }
};

// ─── SEND MESSAGE ─────────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

    // Verify user is in conversation
    const { data: convo } = await supabase
      .from('conversations')
      .select('participant_a, participant_b')
      .eq('id', conversationId)
      .single();

    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (convo.participant_a !== userId && convo.participant_b !== userId) {
      return res.status(403).json({ error: 'Not your conversation' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       userId,
        content:         content.trim(),
      })
      .select(`*, users!sender_id(id, name, avatar_url)`)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// ─── MARK MESSAGES AS READ ────────────────────────────────────
const markRead = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.id;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage, markRead };
```

---

## 4. FRONTEND — useRealtime HOOK (Supabase Realtime)

### client/src/hooks/useRealtime.js
```javascript
import { useEffect, useRef, useCallback } from 'react';
import supabase from '../lib/supabaseClient';

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 * Returns cleanup function.
 */
export const useMessageSubscription = (conversationId, onNewMessage) => {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (onNewMessage) onNewMessage(payload.new);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
};

/**
 * Typing indicator via Supabase Presence.
 * Returns { typingUsers, setTyping }
 */
export const useTypingIndicator = (conversationId, currentUserId, currentUserName) => {
  const channelRef  = useRef(null);
  const typingRef   = useRef(false);
  const timeoutRef  = useRef(null);

  const setTyping = useCallback((isTyping) => {
    if (!channelRef.current) return;
    if (isTyping && !typingRef.current) {
      typingRef.current = true;
      channelRef.current.track({ user_id: currentUserId, name: currentUserName, typing: true });
    }
    // Auto-clear after 2.5s of no typing
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.track({ user_id: currentUserId, name: currentUserName, typing: false });
        typingRef.current = false;
      }
    }, 2500);
  }, [currentUserId, currentUserName]);

  return { setTyping, channelRef };
};

/**
 * Subscribe to notification count changes for a user.
 */
export const useNotificationSubscription = (userId, onUpdate) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (onUpdate) onUpdate(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);
};
```

---

## 5. FRONTEND — CHAT PAGE

### client/src/pages/ChatPage.jsx
```jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import supabase from '../lib/supabaseClient';
import { useMessageSubscription, useTypingIndicator } from '../hooks/useRealtime';

const ChatPage = () => {
  const { id: conversationId } = useParams();
  const { user, profile }      = useAuth();

  const [messages,    setMessages]    = useState([]);
  const [convo,       setConvo]       = useState(null);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);

  const bottomRef    = useRef(null);
  const channelRef   = useRef(null);
  const LIMIT        = 50;

  // ── Initial load ──
  useEffect(() => {
    fetchConversation();
    fetchMessages();
    markRead();
  }, [conversationId]);

  // ── Realtime subscription ──
  useMessageSubscription(conversationId, (newMsg) => {
    setMessages(prev => {
      if (prev.find(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
    // Enrich sender info if missing
    markRead();
    scrollToBottom();
  });

  // ── Typing presence ──
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter(u => u.user_id !== user?.id && u.typing);
        setTypingUsers(others);
      })
      .subscribe();

    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  const fetchConversation = async () => {
    const { data } = await api.get('/api/chat/conversations').catch(() => ({ data: [] }));
    const found = (data || []).find(c => c.id === conversationId);
    if (found) setConvo(found);
  };

  const fetchMessages = async (before = null) => {
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
  };

  const markRead = () => {
    api.put(`/api/chat/conversations/${conversationId}/read`).catch(() => {});
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic update
    const optimistic = {
      id:         `opt-${Date.now()}`,
      sender_id:  user.id,
      content,
      created_at: new Date().toISOString(),
      read:       false,
      users:      { id: user.id, name: profile?.name, avatar_url: profile?.avatar_url },
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
    // Broadcast typing
    if (channelRef.current) {
      channelRef.current.track({ user_id: user?.id, name: profile?.name, typing: true });
      clearTimeout(window._typingTimeout);
      window._typingTimeout = setTimeout(() => {
        channelRef.current?.track({ user_id: user?.id, name: profile?.name, typing: false });
      }, 2500);
    }
  };

  const otherUser  = convo?.other_user;
  const listing    = convo?.listings;

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-64px)] flex flex-col">

      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {/* Load more */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={() => {
                const oldest = messages[0];
                if (oldest) fetchMessages(oldest.created_at);
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Load older messages
            </button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe    = msg.sender_id === user?.id;
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
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-400 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <span className="ml-1">{msg.read ? ' ✓✓' : ' ✓'}</span>}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
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

      {/* Input */}
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
          className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white disabled:opacity-40 hover:bg-green-600 transition flex-shrink-0"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
```

---

## 6. FRONTEND — CHAT WINDOW COMPONENT (embedded, for listing detail)

### client/src/components/ChatWindow.jsx
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

/**
 * Compact chat initiator shown on listing detail page.
 * Opens conversation (or creates one) then navigates to ChatPage.
 */
const ChatWindow = ({ sellerId, listingId, sellerName }) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  const openChat = async () => {
    if (!user) return navigate('/login');
    setLoading(true);
    try {
      const { data } = await api.post('/api/chat/conversations', {
        other_user_id: sellerId,
        listing_id:    listingId,
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
```

---

## 7. BACKEND — SWAP ROUTES

### server/routes/swap.js
```javascript
const express = require('express');
const router  = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getSwapOpportunities,
  proposeSwap,
  getMySwaps,
  getSwapById,
  confirmSwap,
  cancelSwap,
  acceptSwapPayment,
} = require('../controllers/swapController');

router.get('/opportunities',   authGuard, getSwapOpportunities);
router.get('/me',              authGuard, getMySwaps);
router.get('/:id',             authGuard, getSwapById);
router.post('/',               authGuard, proposeSwap);
router.put('/:id/confirm',     authGuard, confirmSwap);
router.put('/:id/cancel',      authGuard, cancelSwap);
router.put('/:id/pay-gap',     authGuard, acceptSwapPayment);

module.exports = router;
```

---

## 8. BACKEND — SWAP CONTROLLER

### server/controllers/swapController.js
```javascript
const supabase = require('../services/supabase');
const razorpayService = require('../services/razorpay');
const { generateMeetupQR } = require('../utils/qrGenerator');

const DEPOSIT_PERCENTAGE = 0.15; // 15% safety deposit on each item's value

// ─── GET SWAP OPPORTUNITIES ───────────────────────────────────
// Returns listings available for swap that match the user's listings
const getSwapOpportunities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category, size, target_listing_id } = req.query;

    // If target_listing_id given, find user's listings that could match
    if (target_listing_id) {
      const { data: target } = await supabase
        .from('listings')
        .select('*')
        .eq('id', target_listing_id)
        .single();

      if (!target) return res.status(404).json({ error: 'Target listing not found' });

      // Get user's own swap-available listings
      const { data: myListings } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', userId)
        .eq('status', 'active')
        .contains('available_for', ['swap']);

      return res.json({ target, my_listings: myListings || [] });
    }

    // Browse all swap-available listings (not own)
    let query = supabase
      .from('listings')
      .select(`*, users!seller_id(id, name, avatar_url, trust_score, verified)`)
      .eq('status', 'active')
      .contains('available_for', ['swap'])
      .neq('seller_id', userId);

    if (category) query = query.eq('category', category);
    if (size)     query = query.eq('size', size);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(40);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

// ─── PROPOSE SWAP ─────────────────────────────────────────────
const proposeSwap = async (req, res, next) => {
  try {
    const { listing_id_a, listing_id_b } = req.body;
    // listing_id_a = initiator's item, listing_id_b = target item
    const userId = req.user.id;

    // Validate both listings
    const [{ data: listingA }, { data: listingB }] = await Promise.all([
      supabase.from('listings').select('*').eq('id', listing_id_a).single(),
      supabase.from('listings').select('*').eq('id', listing_id_b).single(),
    ]);

    if (!listingA || !listingB) return res.status(404).json({ error: 'One or both listings not found' });
    if (listingA.seller_id !== userId) return res.status(403).json({ error: 'Listing A must be yours' });
    if (listingB.seller_id === userId) return res.status(400).json({ error: 'Cannot swap with yourself' });
    if (!listingA.available_for?.includes('swap')) return res.status(400).json({ error: 'Your listing is not available for swap' });
    if (!listingB.available_for?.includes('swap')) return res.status(400).json({ error: 'Target listing is not available for swap' });
    if (listingA.status !== 'active' || listingB.status !== 'active') {
      return res.status(400).json({ error: 'One or both listings are not active' });
    }

    const value_a   = listingA.price;
    const value_b   = listingB.price;
    const gap       = parseFloat(Math.abs(value_a - value_b).toFixed(2));
    const gap_payer = value_a < value_b ? userId : listingB.seller_id; // lower-value party pays
    const deposit_a = parseFloat((value_a * DEPOSIT_PERCENTAGE).toFixed(2));
    const deposit_b = parseFloat((value_b * DEPOSIT_PERCENTAGE).toFixed(2));

    const { data: swap, error } = await supabase
      .from('swaps')
      .insert({
        listing_id_a,
        listing_id_b,
        user_a:      userId,
        user_b:      listingB.seller_id,
        value_a,
        value_b,
        gap_payment: gap,
        gap_payer,
        deposit_a,
        deposit_b,
        status:      'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Notify user_b
    await supabase.from('notifications').insert({
      user_id:  listingB.seller_id,
      type:     'swap_matched',
      title:    'Swap Proposal Received!',
      content:  `Someone wants to swap their item with your "${listingB.title}"`,
      metadata: { swap_id: swap.id, listing_id: listingB.id },
    });

    res.status(201).json({
      swap,
      summary: {
        your_item:    listingA.title,
        their_item:   listingB.title,
        your_value:   value_a,
        their_value:  value_b,
        gap_payment:  gap,
        gap_payer:    gap_payer === userId ? 'you' : 'them',
        your_deposit: deposit_a,
        their_deposit: deposit_b,
        total_you_pay: gap_payer === userId ? gap + deposit_a : deposit_a,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET MY SWAPS ─────────────────────────────────────────────
const getMySwaps = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        listing_a:listings!listing_id_a(id, title, images, price, category, status),
        listing_b:listings!listing_id_b(id, title, images, price, category, status),
        user_a_info:users!user_a(id, name, avatar_url, trust_score),
        user_b_info:users!user_b(id, name, avatar_url, trust_score)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    next(err);
  }
};

// ─── GET SINGLE SWAP ──────────────────────────────────────────
const getSwapById = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('swaps')
      .select(`
        *,
        listing_a:listings!listing_id_a(*),
        listing_b:listings!listing_id_b(*),
        user_a_info:users!user_a(id, name, avatar_url, trust_score, verified),
        user_b_info:users!user_b(id, name, avatar_url, trust_score, verified),
        transactions(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Swap not found' });
    if (data.user_a !== userId && data.user_b !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// ─── CONFIRM SWAP (user_b accepts the proposal) ───────────────
const confirmSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId  = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.user_b !== userId) return res.status(403).json({ error: 'Only the receiving party can confirm' });
    if (swap.status !== 'pending') return res.status(400).json({ error: `Swap is already ${swap.status}` });

    const { data: updated } = await supabase
      .from('swaps')
      .update({ status: 'matched' })
      .eq('id', id)
      .select()
      .single();

    // Notify user_a to proceed with payment
    await supabase.from('notifications').insert({
      user_id:  swap.user_a,
      type:     'swap_matched',
      title:    'Swap Accepted! Pay to proceed.',
      content:  'The other party accepted your swap. Pay deposit (+ gap if applicable) to hold the swap.',
      metadata: { swap_id: id },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// ─── PAY GAP + DEPOSIT (Razorpay, both parties) ───────────────
const acceptSwapPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Swap not found' });
    if (swap.status !== 'matched') return res.status(400).json({ error: 'Swap must be confirmed first' });

    const valid = razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

    // Determine amount user should have paid
    const isUserA     = swap.user_a === userId;
    const isGapPayer  = swap.gap_payer === userId;
    const deposit     = isUserA ? swap.deposit_a : swap.deposit_b;
    const totalDue    = isGapPayer ? deposit + swap.gap_payment : deposit;

    // Mark both items reserved once both parties have paid
    // Simplified: mark swap escrow_held when either party pays
    // In production, track per-user payment status separately
    const { data: updated } = await supabase
      .from('swaps')
      .update({ status: 'escrow_held' })
      .eq('id', id)
      .select()
      .single();

    // Reserve both listings
    await supabase.from('listings').update({ status: 'reserved' }).in('id', [swap.listing_id_a, swap.listing_id_b]);

    // Create a transaction record linking the swap
    const { data: txn } = await supabase
      .from('transactions')
      .insert({
        buyer_id:      swap.user_a,
        seller_id:     swap.user_b,
        listing_id:    swap.listing_id_b,
        type:          'swap',
        status:        'escrow_held',
        amount:        swap.gap_payment + swap.deposit_a,
        escrow_status: 'held',
        delivery_type: 'meetup',
      })
      .select()
      .single();

    await supabase.from('swaps').update({ transaction_id: txn.id }).eq('id', id);

    // Schedule meetup (auto-generate QR)
    const qrHash = generateMeetupQR(swap.listing_id_a, txn.id);
    await supabase.from('meetups').insert({
      transaction_id: txn.id,
      scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      qr_code:        qrHash,
    });

    res.json({ swap: updated, transaction: txn });
  } catch (err) {
    next(err);
  }
};

// ─── CANCEL SWAP ──────────────────────────────────────────────
const cancelSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId  = req.user.id;

    const { data: swap } = await supabase.from('swaps').select('*').eq('id', id).single();
    if (!swap) return res.status(404).json({ error: 'Not found' });
    if (swap.user_a !== userId && swap.user_b !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (!['pending', 'matched'].includes(swap.status)) {
      return res.status(400).json({ error: 'Cannot cancel at this stage' });
    }

    await supabase.from('swaps').update({ status: 'cancelled' }).eq('id', id);
    await supabase.from('listings')
      .update({ status: 'active' })
      .in('id', [swap.listing_id_a, swap.listing_id_b]);

    res.json({ message: 'Swap cancelled' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSwapOpportunities, proposeSwap, getMySwaps, getSwapById,
  confirmSwap, cancelSwap, acceptSwapPayment,
};
```

---

## 9. FRONTEND — SWAP ENGINE PAGE

### client/src/pages/SwapEngine.jsx
```jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import SwapCard from '../components/SwapCard';

const TABS = ['browse', 'propose', 'my-swaps'];

const SwapEngine = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const targetListingId = searchParams.get('target');
  const [tab, setTab]   = useState(targetListingId ? 'propose' : 'browse');

  const [browseable,    setBrowseable]    = useState([]);
  const [mySwaps,       setMySwaps]       = useState([]);
  const [myListings,    setMyListings]    = useState([]);
  const [targetListing, setTargetListing] = useState(null);
  const [selectedMine,  setSelectedMine]  = useState(null);
  const [swapSummary,   setSwapSummary]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [proposing,     setProposing]     = useState(false);

  useEffect(() => {
    if (tab === 'browse')    fetchBrowseable();
    if (tab === 'my-swaps')  fetchMySwaps();
    if (tab === 'propose')   fetchProposeData();
  }, [tab]);

  const fetchBrowseable = async () => {
    setLoading(true);
    const { data } = await api.get('/api/swap/opportunities').catch(() => ({ data: [] }));
    setBrowseable(data || []);
    setLoading(false);
  };

  const fetchMySwaps = async () => {
    setLoading(true);
    const { data } = await api.get('/api/swap/me').catch(() => ({ data: [] }));
    setMySwaps(data || []);
    setLoading(false);
  };

  const fetchProposeData = async () => {
    setLoading(true);
    try {
      const params = targetListingId ? `?target_listing_id=${targetListingId}` : '';
      const { data } = await api.get(`/api/swap/opportunities${params}`);
      if (data.target) setTargetListing(data.target);
      if (data.my_listings) setMyListings(data.my_listings);
    } catch {
      toast.error('Could not load swap data');
    } finally {
      setLoading(false);
    }
  };

  const calculateGap = () => {
    if (!selectedMine || !targetListing) return null;
    const gap       = Math.abs(selectedMine.price - targetListing.price);
    const iPayGap   = selectedMine.price < targetListing.price;
    const deposit_a = parseFloat((selectedMine.price * 0.15).toFixed(2));
    const deposit_b = parseFloat((targetListing.price * 0.15).toFixed(2));
    return {
      gap,
      i_pay_gap:    iPayGap,
      my_deposit:   deposit_a,
      their_deposit: deposit_b,
      total_i_pay:  iPayGap ? gap + deposit_a : deposit_a,
    };
  };

  const handlePropose = async () => {
    if (!selectedMine || !targetListing) return toast.error('Select your item first');
    setProposing(true);
    try {
      const { data } = await api.post('/api/swap', {
        listing_id_a: selectedMine.id,
        listing_id_b: targetListing.id,
      });
      setSwapSummary(data.summary);
      toast.success('Swap proposed! Waiting for the other party.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Proposal failed');
    } finally {
      setProposing(false);
    }
  };

  const gap = calculateGap();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Smart Swap Engine</h1>
      <p className="text-gray-500 text-sm mb-6">Exchange items fairly — gaps balanced automatically.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {t === 'my-swaps' ? 'My Swaps' : t === 'propose' ? 'Propose' : 'Browse'}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {browseable.map(l => (
              <div key={l.id} className="relative">
                <ListingCard listing={l} />
                <button
                  onClick={() => navigate(`/swap?target=${l.id}`)}
                  className="absolute bottom-14 left-2 right-2 bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-600 text-center"
                >
                  🔄 Propose Swap
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── PROPOSE TAB ── */}
      {tab === 'propose' && !swapSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Target listing */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">They Offer</h2>
            {targetListing ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <img src={targetListing.images?.[0]} alt={targetListing.title}
                  className="w-full aspect-square object-cover rounded-xl mb-3" />
                <p className="font-semibold text-gray-900">{targetListing.title}</p>
                <p className="text-green-600 font-bold text-lg">₹{targetListing.price?.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Size {targetListing.size} · Grade {targetListing.condition} · {targetListing.category}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                <p>No target listing selected</p>
                <button onClick={() => setTab('browse')} className="mt-2 text-sm text-green-600 underline">
                  Browse items to swap
                </button>
              </div>
            )}
          </div>

          {/* My listing selection */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">You Offer</h2>
            {myListings.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                <p className="mb-2">No swap-eligible listings</p>
                <Link to="/create-listing" className="text-sm text-green-600 underline">
                  Create a listing and mark it available for swap
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedMine(selectedMine?.id === l.id ? null : l)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                      selectedMine?.id === l.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <img src={l.images?.[0]} alt={l.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{l.title}</p>
                      <p className="text-green-600 font-semibold">₹{l.price?.toLocaleString()}</p>
                    </div>
                    {selectedMine?.id === l.id && <span className="text-blue-500 text-xl">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gap calculation */}
      {tab === 'propose' && !swapSummary && gap && selectedMine && targetListing && (
        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">💰 Swap Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Your item value</span>
              <span className="font-medium">₹{selectedMine.price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Their item value</span>
              <span className="font-medium">₹{targetListing.price?.toLocaleString()}</span>
            </div>
            {gap.gap > 0 && (
              <div className={`flex justify-between pt-2 border-t border-gray-100 ${gap.i_pay_gap ? 'text-orange-600' : 'text-green-600'}`}>
                <span>{gap.i_pay_gap ? 'You pay gap' : 'They pay gap'}</span>
                <span className="font-semibold">₹{gap.gap?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Your safety deposit (15%)</span>
              <span className="font-medium">₹{gap.my_deposit?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold text-base">
              <span>Total you pay now</span>
              <span className="text-green-600">₹{gap.total_i_pay?.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Safety deposit is returned after successful swap. Gap covers the value difference.
          </p>
          <button
            onClick={handlePropose}
            disabled={proposing}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {proposing ? 'Proposing…' : '🔄 Propose Swap'}
          </button>
        </div>
      )}

      {/* Swap proposed confirmation */}
      {swapSummary && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mt-6">
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="font-bold text-green-800 text-lg mb-1">Swap Proposed!</h3>
          <p className="text-green-700 text-sm mb-4">
            Waiting for <strong>{targetListing?.users?.name || 'the other party'}</strong> to confirm.
            You'll be notified when they respond.
          </p>
          <button onClick={() => { setSwapSummary(null); setTab('my-swaps'); }}
            className="text-sm text-green-600 underline">
            View My Swaps →
          </button>
        </div>
      )}

      {/* ── MY SWAPS TAB ── */}
      {tab === 'my-swaps' && (
        loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : mySwaps.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">🔄</p>
            <p>No swaps yet.</p>
            <button onClick={() => setTab('browse')} className="mt-2 text-sm text-blue-500 underline">
              Browse items to swap
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mySwaps.map(swap => (
              <SwapCard key={swap.id} swap={swap} currentUserId={user?.id} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default SwapEngine;
```

---

## 10. FRONTEND — SWAP CARD COMPONENT

### client/src/components/SwapCard.jsx
```jsx
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const STATUS_CONFIG = {
  pending:      { label: 'Pending',      color: 'bg-yellow-100 text-yellow-700' },
  matched:      { label: 'Confirmed',    color: 'bg-blue-100 text-blue-700' },
  escrow_held:  { label: 'Escrow Held',  color: 'bg-orange-100 text-orange-700' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-700' },
  disputed:     { label: 'Disputed',     color: 'bg-red-100 text-red-600' },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-500' },
};

const SwapCard = ({ swap, currentUserId, onUpdate }) => {
  const isUserA    = swap.user_a === currentUserId;
  const myListing  = isUserA ? swap.listing_a : swap.listing_b;
  const theirList  = isUserA ? swap.listing_b : swap.listing_a;
  const theirUser  = isUserA ? swap.user_b_info : swap.user_a_info;
  const status     = STATUS_CONFIG[swap.status] || { label: swap.status, color: 'bg-gray-100 text-gray-500' };

  const handleConfirm = async () => {
    try {
      await api.put(`/api/swap/${swap.id}/confirm`);
      toast.success('Swap confirmed!');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm');
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/api/swap/${swap.id}/cancel`);
      toast.success('Swap cancelled');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not cancel');
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* My item */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">You offer</p>
          <img src={myListing?.images?.[0]} alt={myListing?.title}
            className="w-full aspect-square object-cover rounded-xl mb-1" />
          <p className="text-xs font-medium text-gray-700 truncate">{myListing?.title}</p>
          <p className="text-xs text-green-600 font-semibold">₹{myListing?.price?.toLocaleString()}</p>
        </div>

        {/* Arrow */}
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

        {/* Their item */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-400 mb-1">They offer</p>
          <img src={theirList?.images?.[0]} alt={theirList?.title}
            className="w-full aspect-square object-cover rounded-xl mb-1" />
          <p className="text-xs font-medium text-gray-700 truncate">{theirList?.title}</p>
          <p className="text-xs text-green-600 font-semibold">₹{theirList?.price?.toLocaleString()}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={theirUser?.avatar_url || `https://ui-avatars.com/api/?name=${theirUser?.name}&size=24&background=e5e7eb&color=374151`}
            alt={theirUser?.name} className="w-6 h-6 rounded-full object-cover"
          />
          <p className="text-xs text-gray-500">{theirUser?.name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="flex gap-2">
          {/* User B confirms */}
          {swap.status === 'pending' && !isUserA && (
            <>
              <button onClick={handleConfirm}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
                Accept
              </button>
              <button onClick={handleCancel}
                className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Decline
              </button>
            </>
          )}
          {/* User A cancels pending */}
          {swap.status === 'pending' && isUserA && (
            <button onClick={handleCancel}
              className="text-xs border border-red-200 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50">
              Cancel
            </button>
          )}
          {/* Pay after match */}
          {swap.status === 'matched' && (
            <Link to={`/swap-payment/${swap.id}`}
              className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
              Pay & Proceed →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapCard;
```

---

## 11. API ENDPOINT SUMMARY — CHAT & SWAP MODULE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/chat/conversations` | Yes | All my conversations with unread count |
| POST | `/api/chat/conversations` | Yes | Get or create conversation |
| GET | `/api/chat/conversations/:id/messages` | Yes | Load messages (paginated) |
| POST | `/api/chat/conversations/:id/messages` | Yes | Send message |
| PUT | `/api/chat/conversations/:id/read` | Yes | Mark messages as read |
| GET | `/api/swap/opportunities` | Yes | Browse swap-available listings |
| GET | `/api/swap/me` | Yes | My swap proposals |
| GET | `/api/swap/:id` | Yes | Single swap detail |
| POST | `/api/swap` | Yes | Propose a swap |
| PUT | `/api/swap/:id/confirm` | Yes | User B accepts proposal |
| PUT | `/api/swap/:id/pay-gap` | Yes | Pay gap + deposit (Razorpay) |
| PUT | `/api/swap/:id/cancel` | Yes | Cancel swap |

---

## NEXT: DOC 7 — Virtual Try-On + Rental Flow + Dispute Resolution
API4AI virtual try-on modal with photo caching, full rental booking/return/damage flow, dispute filing with evidence upload, admin dispute review panel with escrow action triggers.
