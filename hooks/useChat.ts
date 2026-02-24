import { useState, useMemo } from 'react';
import { ChatConversation, AppUser } from '../types';

export const useChat = (messages: any[], currentUser: AppUser | null, allUsers: AppUser[]) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

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

    return Array.from(convMap.values()).sort((a: any, b: any) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser, allUsers]);

  // Mock functions for now to satisfy App.tsx interface
  const sendMessage = (content: string, type: string) => { console.log('sendMessage', content, type); };
  const markAsRead = (userId: string) => { console.log('markAsRead', userId); };
  const deleteMessage = (messageId: string) => { console.log('deleteMessage', messageId); };
  const clearMessages = () => { console.log('clearMessages'); };
  const totalUnread = 0;

  // Garantir que conversations nunca é undefined
  return {
    messages,
    conversations: conversations || [],
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    deleteMessage,
    clearMessages,
    totalUnread
  };
};