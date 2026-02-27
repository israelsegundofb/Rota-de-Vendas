import { useState, useMemo, useCallback } from 'react';
import { AppUser, ChatMessage, ChatConversation } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  // State for messages and active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Helper to generate conversation ID
  const getConversationId = (user1Id: string, user2Id: string) => {
    return [user1Id, user2Id].sort().join('-');
  };

  // Derive conversations from messages
  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();

    // Group messages by the "other" user
    messages.forEach(message => {
      const isSender = message.senderId === currentUser.id;
      const otherUserId = isSender ? message.receiverId : message.senderId;

      if (!otherUserId) return;

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: message,
          unreadCount: 0
        });
      } else {
        const conv = convMap.get(otherUserId)!;
        // Update last message if this one is newer
        if (new Date(message.timestamp) > new Date(conv.lastMessage!.timestamp)) {
          conv.lastMessage = message;
        }
      }

      // Count unread messages (received by current user and not read)
      if (message.receiverId === currentUser.id && !message.read) {
        const conv = convMap.get(otherUserId)!;
        conv.unreadCount += 1;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser]);

  // Actions
  const sendMessage = useCallback((receiverId: string, text: string) => {
    if (!currentUser) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
  }, [currentUser]);

  const markAsRead = useCallback((senderId: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(msg =>
      (msg.senderId === senderId && msg.receiverId === currentUser.id && !msg.read)
        ? { ...msg, read: true }
        : msg
    ));
  }, [currentUser]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const clearMessages = useCallback((conversationId?: string) => {
    if (conversationId) {
       // Logic to clear specific conversation if needed, for now clear all for user
       // Note: conversationId in the UI often maps to userId of the other person
       setMessages(prev => prev.filter(msg =>
         msg.senderId !== conversationId && msg.receiverId !== conversationId
       ));
    } else {
      setMessages([]);
    }
  }, []);

  const totalUnread = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter(m => m.receiverId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

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
