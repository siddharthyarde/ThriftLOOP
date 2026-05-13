const supabase = require('../services/supabase');

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

    const convoIds = (data || []).map(c => c.id);
    const { data: unreadMsgs } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convoIds)
      .eq('read', false)
      .neq('sender_id', userId);

    const unreadMap = {};
    (unreadMsgs || []).forEach(m => {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });

    const enriched = (data || []).map(c => ({
      ...c,
      other_user: c.participant_a === userId ? c.user_b : c.user_a,
      unread_count: unreadMap[c.id] || 0,
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

const getOrCreateConversation = async (req, res, next) => {
  try {
    const { other_user_id, listing_id } = req.body;
    const userId = req.user.id;

    if (userId === other_user_id) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

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

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_a: userId, participant_b: other_user_id, listing_id })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { before, limit = 50 } = req.query;
    const userId = req.user.id;

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

    res.json((data || []).reverse());
  } catch (err) { next(err); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

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
        sender_id: userId,
        content: content.trim(),
      })
      .select(`*, users!sender_id(id, name, avatar_url)`)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', req.user.id)
      .eq('read', false);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

module.exports = { getConversations, getOrCreateConversation, getMessages, sendMessage, markRead };
