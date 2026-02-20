import { useMemo } from 'react';
import { ChatConversation } from '../types';

export const useChat = (messages, currentUser, allUsers) => {
  // Remover setConversations
  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map();
    messages.forEach(message => {
      const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
      const conversationId = userId + '-' + currentUser.id;

      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, { lastMessage: message, userId });
      } else {
        convMap.get(conversationId).lastMessage = message;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser, allUsers]);

  // Garantir que conversations nunca é undefined
  return {
    messages,
    conversations: conversations || [],
  };
};