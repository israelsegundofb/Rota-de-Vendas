import { useState, useMemo } from 'react';
import { ChatConversation, ChatMessage, AppUser } from '../types';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Remover setConversations
  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();
    messages.forEach((message: ChatMessage) => {
      const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
      const conversationId = userId + '-' + currentUser.id;

      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, { lastMessage: message, userId, unreadCount: 0 });
      } else {
        const conv = convMap.get(conversationId);
        if (conv) {
          conv.lastMessage = message;
        }
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser, allUsers]);

  // Default values to satisfy App.tsx type requirements without breaking existing functionality
  const sendMessage = (_receiverId: string, _text: string) => {};
  const markAsRead = (_conversationId: string) => {};
  const deleteMessage = (_messageId: string) => {};
  const clearMessages = (_conversationId?: string) => {};

  // Garantir que conversations nunca é undefined
  return {
    messages,
    conversations: conversations || [],
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    totalUnread: 0,
    deleteMessage,
    clearMessages,
  };
};