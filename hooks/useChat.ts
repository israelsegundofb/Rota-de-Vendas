import { useState, useMemo, useCallback } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  // Local state to simulate a backend (since we don't have a real backend for chat yet)
  // In a real app, this would be fetched from Firebase/API
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Helper to get conversation ID (unique pair of users)
  // Note: Not strictly needed for the list derived below, but good for logic
  const getConversationId = (user1: string, user2: string) => {
    return [user1, user2].sort().join('-');
  };

  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();

    // Initialize conversations for all users (optional, but good for UI)
    // Or just build from messages. Let's build from messages first.

    // 1. Group messages by the "other" user
    messages.forEach(msg => {
      const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          userId: otherUserId,
          unreadCount: 0,
          lastMessage: msg
        });
      }

      const conv = convMap.get(otherUserId)!;

      // Update last message if this one is newer
      if (!conv.lastMessage || new Date(msg.timestamp) > new Date(conv.lastMessage.timestamp)) {
        conv.lastMessage = msg;
      }

      // Count unread (only incoming messages)
      if (msg.receiverId === currentUser.id && !msg.read) {
        conv.unreadCount++;
      }
    });

    // 2. Convert to array and sort by last message time
    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA); // Descending
    });
  }, [messages, currentUser, allUsers]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  }, [conversations]);

  const sendMessage = useCallback((text: string, receiverId: string) => {
    if (!currentUser) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      receiverId: receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
  }, [currentUser]);

  const markAsRead = useCallback((senderId: string) => {
    if (!currentUser) return;

    setMessages(prev => prev.map(msg => {
      if (msg.senderId === senderId && msg.receiverId === currentUser.id && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    }));
  }, [currentUser]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const clearMessages = useCallback((otherUserId: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.filter(m =>
      !((m.senderId === currentUser.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === currentUser.id))
    ));
  }, [currentUser]);

  return {
    messages,
    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    totalUnread,
    deleteMessage,
    clearMessages
  };
};
