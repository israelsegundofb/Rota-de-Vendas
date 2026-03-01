import { useMemo, useState, useCallback } from 'react';
import { ChatConversation, ChatMessage, AppUser } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();
    messages.forEach(message => {
      const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
      const conversationId = userId + '-' + currentUser.id;

      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, { userId, lastMessage: message, unreadCount: 0 });
      } else {
        const conv = convMap.get(conversationId)!;
        conv.lastMessage = message;
      }

      if (!message.read && message.receiverId === currentUser.id) {
        const conv = convMap.get(conversationId)!;
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser]);

  const sendMessage = useCallback((receiverId: string, text: string) => {
    if (!currentUser) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
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

    setMessages(prev => prev.map(msg => {
      if (msg.senderId === userId && msg.receiverId === currentUser.id && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    }));
  }, [currentUser]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const clearMessages = useCallback((conversationId?: string) => {
    if (conversationId && currentUser) {
      // Find the other user from the conversationId (which we might just assume is the other userId for simplicity in this context,
      // though above we defined it as userId + '-' + currentUser.id. Wait, conversationId param is actually the other userId).
      setMessages(prev => prev.filter(msg =>
        !(msg.senderId === conversationId && msg.receiverId === currentUser.id) &&
        !(msg.receiverId === conversationId && msg.senderId === currentUser.id)
      ));
    } else {
      setMessages([]);
    }
  }, [currentUser]);

  const totalUnread = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter(m => m.receiverId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

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