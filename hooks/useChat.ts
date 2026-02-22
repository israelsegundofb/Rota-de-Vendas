import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppUser, ChatMessage, ChatConversation } from '../types';
import {
    subscribeToMessages,
    sendMessageToCloud,
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

    // Derived state: Conversations
    const conversations: ChatConversation[] = useMemo(() => {
        if (!currentUser) return [];

        const convMap = new Map<string, ChatConversation>();

        // We only care about messages involving the current user
        const relevantMessages = messages.filter(m =>
            m.senderId === currentUser.id || m.receiverId === currentUser.id
        );

        relevantMessages.forEach(message => {
            const userId = message.senderId === currentUser.id ? message.receiverId : message.senderId;

            // Conversation ID is just the other user's ID in this context
            // But we can key by userId for simplicity in the map
            if (!convMap.has(userId)) {
                convMap.set(userId, {
                    userId,
                    lastMessage: message,
                    unreadCount: 0
                });
            } else {
                const conv = convMap.get(userId)!;
                // Update last message if this one is newer (assuming messages are sorted or we check timestamp)
                // The subscription returns sorted by timestamp asc usually, so last is newest
                if (!conv.lastMessage || new Date(message.timestamp) > new Date(conv.lastMessage.timestamp)) {
                    conv.lastMessage = message;
                }
            }

            // Count unread
            if (message.receiverId === currentUser.id && !message.read) {
                const conv = convMap.get(userId)!;
                conv.unreadCount += 1;
            }
        });

        // Ensure we have entries for all users?
        // Typically chat lists show existing conversations or allow starting new ones from a user list.
        // App.tsx seems to pass `conversations` to `ChatPanel`.
        // If `ChatPanel` handles "new chat", we might only return active conversations here.
        // Let's return active ones sorted by time.

        return Array.from(convMap.values()).sort((a, b) => {
            const timeA = a.lastMessage?.timestamp || '';
            const timeB = b.lastMessage?.timestamp || '';
            return timeB.localeCompare(timeA); // Newest first
        });
    }, [messages, currentUser]);

    // Derived state: Total Unread
    const totalUnread = useMemo(() => {
        if (!currentUser) return 0;
        return messages.filter(m => m.receiverId === currentUser.id && !m.read).length;
    }, [messages, currentUser]);

    // Actions
    const sendMessage = useCallback(async (receiverId: string, text: string) => {
        if (!currentUser) return;
        const newMessage: Omit<ChatMessage, 'id'> = {
            senderId: currentUser.id,
            receiverId,
            text,
            timestamp: new Date().toISOString(),
            read: false
        };
        await sendMessageToCloud(newMessage);
    }, [currentUser]);

    const markAsRead = useCallback(async (senderId: string) => {
        if (!currentUser) return;
        // Find all unread messages from this sender to me
        const unreadMsgs = messages.filter(m =>
            m.senderId === senderId &&
            m.receiverId === currentUser.id &&
            !m.read
        );

        // Mark all as read
        await Promise.all(unreadMsgs.map(m => markMessageAsReadInCloud(m.id)));
    }, [messages, currentUser]);

    const deleteMessage = useCallback(async (messageId: string) => {
        await deleteMessageFromCloud(messageId);
    }, []);

    const clearMessages = useCallback(async () => {
        await clearAllMessagesFromCloud();
    }, []);

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
