import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import supabase from '../lib/supabaseClient';
import { useMessageSubscription } from '../hooks/useRealtime';
import { Photo } from '../components/Shared';
import * as I from '../components/Icons';

const LIMIT = 50;

const toDateLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yd = new Date(today); yd.setDate(yd.getDate() - 1);
  if (d.toDateString() === yd.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function ChatBubble({ m, isMe, profile }) {
  const out = isMe;
  return (
    <div style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', gap: 10 }}>
      {!out && (
        m.users?.avatar_url
          ? <img src={m.users.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 'auto', objectFit: 'cover' }}/>
          : <Photo variant="ph-soft" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 'auto' }}/>
      )}
      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: out ? 'flex-end' : 'flex-start', gap: 3 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          background: out ? 'var(--primary)' : 'var(--surface)',
          color: out ? 'var(--primary-ink)' : 'var(--ink)',
          borderBottomRightRadius: out ? 4 : 16,
          borderBottomLeftRadius: out ? 16 : 4,
          fontSize: 14, lineHeight: 1.5,
        }}>{m.content || m.text}</div>
        <span className="small muted" style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : m.time}
          {out && (m.read
            ? <span style={{ display: 'inline-flex', color: 'var(--accent)' }}><I.Check size={12} stroke={2.2}/><I.Check size={12} stroke={2.2} style={{ marginLeft: -6 }}/></span>
            : <I.Check size={12} stroke={2}/>
          )}
        </span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Photo variant="ph-soft" style={{ width: 28, height: 28, borderRadius: '50%' }}/>
      <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--surface)' }}>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-mute)',
              animation: `pulse 1.2s ${i * 0.15}s infinite`,
            }}/>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [convo, setConvo] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimeout = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const markRead = useCallback(() => {
    if (conversationId) api.put(`/api/chat/conversations/${conversationId}/read`).catch(() => {});
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data } = await api.get(`/api/chat/conversations/${conversationId}/messages?limit=${LIMIT}`);
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    api.get('/api/chat/conversations')
      .then(r => {
        const list = r.data || [];
        setConversations(list);
        const found = list.find(c => c.id === conversationId);
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
    if (!conversationId) return;
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
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        channelRef.current?.track({ user_id: user?.id, name: profile?.name, typing: false });
      }, 2500);
    }
  };

  const otherUser = convo?.other_user;
  const listing = convo?.listings;

  let lastDateLabel = null;

  return (
    <section style={{ padding: '24px 32px', height: 'calc(100vh - 80px)' }}>
      <div className="card" style={{
        borderRadius: 20, overflow: 'hidden', height: '100%', display: 'grid',
        gridTemplateColumns: '320px 1fr', minHeight: 600,
      }}>
        {/* Sidebar — conversation list */}
        <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 18px 12px' }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 22, letterSpacing: '-.01em' }}>Messages</h2>
            <div style={{ position: 'relative', marginTop: 12 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)' }}>
                <I.Search size={14}/>
              </span>
              <input className="input" placeholder="Search" style={{ padding: '9px 12px 9px 34px', background: 'var(--bg)', fontSize: 13 }}/>
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {conversations.map(c => {
              const other = c.other_user;
              const isActive = c.id === conversationId;
              const unread = c.unread_count || 0;
              return (
                <button key={c.id}
                  onClick={() => navigate(`/chat/${c.id}`)}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px', width: '100%',
                    background: isActive ? 'var(--bg)' : 'transparent', textAlign: 'left',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)', border: 'none',
                  }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {other?.avatar_url
                      ? <img src={other.avatar_url} alt={other.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}/>
                      : <Photo variant="ph-soft" style={{ width: 40, height: 40, borderRadius: '50%' }}/>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: unread ? 600 : 500 }}>{other?.name || 'User'}</span>
                      <span className="small muted" style={{ fontSize: 11 }}>
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span className="small muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                        {c.last_message}
                      </span>
                      {unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: 'var(--accent)', color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {conversations.length === 0 && !loading && (
              <p className="muted small" style={{ padding: '32px 18px', textAlign: 'center' }}>No conversations yet</p>
            )}
          </div>
        </aside>

        {/* Chat window */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="icon-btn" onClick={() => navigate(-1)}><I.ArrowLeft size={16}/></button>
            <div style={{ position: 'relative' }}>
              {otherUser?.avatar_url
                ? <img src={otherUser.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}/>
                : <Photo variant="ph-soft" style={{ width: 38, height: 38, borderRadius: '50%' }}/>
              }
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{otherUser?.name || 'User'}</span>
                {otherUser?.verified && <I.Verified size={12} style={{ color: 'var(--accent)' }}/>}
              </div>
              <div className="small muted" style={{ fontSize: 11 }}>
                {typingUsers.length > 0 ? 'Typing…' : 'Online'}
              </div>
            </div>
            {listing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 6px', background: 'var(--surface)', borderRadius: 99, border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => navigate(`/listing/${listing.id}`)}>
                {listing.images?.[0]
                  ? <img src={listing.images[0]} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}/>
                  : <Photo variant="ph-soft" style={{ width: 28, height: 28, borderRadius: '50%' }}/>
                }
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{listing.title}</div>
                  <div className="serif" style={{ fontSize: 12, color: 'var(--ink-mute)' }}>₹{Number(listing.price || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '22px 26px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-mute)' }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p className="muted small">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((m, i) => {
                const dateLabel = m.created_at ? toDateLabel(m.created_at) : null;
                const showDate = dateLabel && dateLabel !== lastDateLabel;
                if (showDate) lastDateLabel = dateLabel;
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id || i}>
                    {showDate && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px' }}>
                        <span className="pill" style={{ background: 'var(--surface)', fontSize: 10, letterSpacing: '.1em' }}>{dateLabel}</span>
                      </div>
                    )}
                    <ChatBubble m={m} isMe={isMe} profile={profile}/>
                  </div>
                );
              })
            )}
            {typingUsers.length > 0 && <TypingBubble/>}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
            <button type="button" className="icon-btn"><I.Plus size={18}/></button>
            <input className="input" value={input} onChange={handleInputChange}
              placeholder="Type a message…" style={{ flex: 1, background: 'var(--bg)' }}/>
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending} style={{ padding: '10px 14px' }}>
              <I.Arrow size={16}/>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
