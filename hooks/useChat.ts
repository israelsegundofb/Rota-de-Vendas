import { useState, useMemo, useCallback } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();
    messages.forEach((message: ChatMessage) => {
      const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
      const conversationId = userId + '-' + currentUser.id;

      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, { lastMessage: message, userId, unreadCount: 0 });
      } else {
        const conv = convMap.get(conversationId)!;
        if (new Date(message.timestamp) > new Date(conv.lastMessage?.timestamp || '')) {
            conv.lastMessage = message;
        }
      }

      if (message.receiverId === currentUser.id && !message.read) {
         convMap.get(conversationId)!.unreadCount += 1;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser, allUsers]);

  const sendMessage = useCallback((receiverId: string, text: string) => {
      if (!currentUser) return;
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId,
          text,
          timestamp: new Date().toISOString(),
          read: false
      };
      setMessages(prev => [...prev, newMessage]);
  }, [currentUser]);

  const markAsRead = useCallback((userId: string) => {
      if (!currentUser) return;
      setMessages(prev => prev.map(msg =>
          (msg.senderId === userId && msg.receiverId === currentUser.id && !msg.read)
          ? { ...msg, read: true } : msg
      ));
  }, [currentUser]);

  const totalUnread = useMemo(() => {
      if (!currentUser) return 0;
      return messages.filter(m => m.receiverId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

  const deleteMessage = useCallback((messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const clearMessages = useCallback((conversationId?: string) => {
      if (!conversationId) {
          setMessages([]);
      } else {
          // Typically conversationId is formed by userId + '-' + currentUser.id
          // But since clearMessages in App is often just "clear all for active user"
          // We'll clear based on if the user is part of the conversation
          if (!currentUser) return;
          const otherUserId = conversationId.split('-')[0];
          setMessages(prev => prev.filter(m =>
              !(m.senderId === otherUserId && m.receiverId === currentUser.id) &&
              !(m.senderId === currentUser.id && m.receiverId === otherUserId)
          ));
      }
  }, [currentUser]);

  return {
    messages,
    conversations: conversations || [],
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    totalUnread,
    deleteMessage,
    clearMessages
  };
};