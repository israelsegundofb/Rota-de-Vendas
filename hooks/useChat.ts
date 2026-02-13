import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';
import { sendMessageToCloud, subscribeToMessages, markMessageAsReadInCloud } from '../services/firebaseService';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Load messages from Firebase (Firestore)
    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeToMessages((allMsgsFromCloud) => {
            const isAdminDev = currentUser.role === 'admin_dev' || currentUser.role === 'admin';

            // Filter messages: Admin Dev sees ALL, others see only their own
            const visibleMsgs = allMsgsFromCloud.filter(msg =>
                isAdminDev || msg.senderId === currentUser.id || msg.receiverId === currentUser.id
            );

            setMessages(visibleMsgs);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Update conversations list based on messages
    useEffect(() => {
        if (!currentUser) return;

        const convMap = new Map<string, ChatConversation>();
        const isAdminDev = currentUser.role === 'admin_dev' || currentUser.role === 'admin';

        // Initialize with all users (Admin Dev sees all potential conversations)
        allUsers.forEach(user => {
            if (user.id !== currentUser.id) {
                convMap.set(user.id, {
                    userId: user.id,
                    unreadCount: 0
                });
            }
        });

        // Update with messages
        messages.forEach(msg => {
            // For Admin Dev, messages between User A and User B need to be categorized.
            // We'll show conversations indexed by "the other person" relative to current user.
            // But for Admin Dev, "the other person" is arbitrary if they aren't part of it.
            // Actually, let's keep it simple: Admin Dev sees a list of ALL users and their last messages globally.

            const otherId = msg.senderId === currentUser.id ? msg.receiverId :
                (msg.receiverId === currentUser.id ? msg.senderId : msg.senderId); // Fallback for admin monitoring

            // If Admin is monitoring A <-> B, we decide who the "otherId" is for the list.
            // Better: Admin Dev sees a list of all users, and clicking one shows conversations with THAT user.

            const conv = convMap.get(otherId);
            if (conv) {
                if (!conv.lastMessage || msg.timestamp > conv.lastMessage.timestamp) {
                    conv.lastMessage = msg;
                }
                if (!msg.read && msg.receiverId === currentUser.id) {
                    conv.unreadCount++;
                }
            }
        });

        setConversations(Array.from(convMap.values()).sort((a, b) => {
            const timeA = a.lastMessage?.timestamp || '';
            const timeB = b.lastMessage?.timestamp || '';
            return timeB.localeCompare(timeA);
        }));
    }, [messages, currentUser, allUsers]);

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

    const markAsRead = useCallback(async (otherUserId: string) => {
        if (!currentUser) return;

        const unreadMsgs = messages.filter(m => m.senderId === otherUserId && m.receiverId === currentUser.id && !m.read);

        for (const msg of unreadMsgs) {
            await markMessageAsReadInCloud(msg.id);
        }
    }, [currentUser, messages]);

    return {
        messages,
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        markAsRead,
        totalUnread: conversations.reduce((acc, c) => acc + c.unreadCount, 0)
    };
};
