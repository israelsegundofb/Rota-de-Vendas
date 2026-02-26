import { useState, useMemo, useCallback } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  // Mock messages state if not provided
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Derive conversations
  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();
    messages.forEach(message => {
      const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
      // Unique conversation ID for the pair
      const conversationId = userId;

      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, { userId, unreadCount: 0, lastMessage: message });
      } else {
        const conv = convMap.get(conversationId);
        if (conv) {
            conv.lastMessage = message;
        }
      }

      // Update unread count
      if (message.receiverId === currentUser.id && !message.read) {
          const conv = convMap.get(conversationId);
          if (conv) {
              conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser]);

  const totalUnread = useMemo(() => {
      return conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
  }, [conversations]);

  const sendMessage = useCallback((text: string) => {
      if (!currentUser || !activeConversationId) return;

      const newMessage: ChatMessage = {
          id: crypto.randomUUID(),
          senderId: currentUser.id,
          receiverId: activeConversationId,
          text,
          timestamp: new Date().toISOString(),
          read: false
      };

      setMessages(prev => [...prev, newMessage]);
  }, [currentUser, activeConversationId]);

  const markAsRead = useCallback((userId: string) => {
      if (!currentUser) return;
      setMessages(prev => prev.map(msg =>
          (msg.senderId === userId && msg.receiverId === currentUser.id)
          ? { ...msg, read: true }
          : msg
      ));
  }, [currentUser]);

  const deleteMessage = useCallback((messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const clearMessages = useCallback((conversationId?: string) => {
      const targetId = conversationId || activeConversationId;
      if (!currentUser || !targetId) return;

      setMessages(prev => prev.filter(m =>
          !((m.senderId === currentUser.id && m.receiverId === targetId) ||
            (m.senderId === targetId && m.receiverId === currentUser.id))
      ));
  }, [currentUser, activeConversationId]);

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
