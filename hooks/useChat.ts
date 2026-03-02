import { useState, useEffect, useMemo } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';
import {
  sendMessageToCloud,
  subscribeToMessages,
  markMessageAsReadInCloud,
  deleteMessageFromCloud,
  clearAllMessagesFromCloud
} from '../services/firebaseService';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Subscribe to messages from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToMessages((msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  // Process conversations based on messages
  const conversations: ChatConversation[] = useMemo(() => {
    if (!currentUser) return [];

    const convMap = new Map<string, ChatConversation>();

    // Group messages by participants
    messages.forEach(message => {
      const isSender = message.senderId === currentUser.id;
      const otherParticipantId = isSender ? message.receiverId : message.senderId;

      // We use the other participant's ID as the conversation ID for simplicity in UI
      const convId = otherParticipantId;

      const existing = convMap.get(convId);
      const isUnread = !message.read && !isSender;

      if (!existing) {
        convMap.set(convId, {
          userId: convId,
          lastMessage: message,
          unreadCount: isUnread ? 1 : 0
        });
      } else {
        // Update last message if this one is newer
        if (!existing.lastMessage || new Date(message.timestamp) > new Date(existing.lastMessage.timestamp)) {
          existing.lastMessage = message;
        }
        if (isUnread) {
          existing.unreadCount += 1;
        }
      }
    });

    // Sort by last message timestamp
    return Array.from(convMap.values()).sort((a, b) => {
      const timeA = a.lastMessage?.timestamp || '';
      const timeB = b.lastMessage?.timestamp || '';
      return timeB.localeCompare(timeA);
    });
  }, [messages, currentUser]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  }, [conversations]);

  const sendMessage = async (receiverId: string, text: string) => {
    if (!currentUser) return;

    const newMessage: Omit<ChatMessage, 'id'> = {
      senderId: currentUser.id,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    await sendMessageToCloud(newMessage);
  };

  const markAsRead = async (otherUserId: string) => {
    if (!currentUser) return;

    const unreadMsgs = messages.filter(m =>
      m.senderId === otherUserId &&
      m.receiverId === currentUser.id &&
      !m.read
    );

    for (const msg of unreadMsgs) {
      await markMessageAsReadInCloud(msg.id);
    }
  };

  const deleteMessage = async (messageId: string) => {
    await deleteMessageFromCloud(messageId);
  };

  const clearMessages = async () => {
    await clearAllMessagesFromCloud();
  };

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