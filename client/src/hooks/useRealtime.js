import { useEffect, useRef, useCallback } from 'react';
import supabase from '../lib/supabaseClient';

export const useMessageSubscription = (conversationId, onNewMessage) => {
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => { if (onNewMessage) onNewMessage(payload.new); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, onNewMessage]);
};

export const useTypingIndicator = (currentUserId, currentUserName) => {
  const channelRef = useRef(null);
  const typingRef = useRef(false);
  const timeoutRef = useRef(null);

  const setTyping = useCallback((isTyping) => {
    if (!channelRef.current) return;
    if (isTyping && !typingRef.current) {
      typingRef.current = true;
      channelRef.current.track({ user_id: currentUserId, name: currentUserName, typing: true });
    }
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

export const useNotificationSubscription = (userId, onUpdate) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => { if (onUpdate) onUpdate(payload.new); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, onUpdate]);
};

export default useMessageSubscription;
