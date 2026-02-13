import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatConversation, AppUser } from '../types';
import { sendMessageToCloud, subscribeToMessages, markMessageAsReadInCloud } from '../services/firebaseService';
import { logActivityToCloud } from '../services/firebaseService';

export const useChat = (currentUser: AppUser | null, allUsers: AppUser[]) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Load messages from Firebase (Firestore)
    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeToMessages((allMsgsFromCloud) => {
            const isAdminDev = currentUser.role === 'admin_dev' || currentUser.role === 'admin';

            // Filter messages: Admin Dev sees ALL messages in the system
            // Others see only their own (sent or received)
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
            if (isAdminDev) {
                // For Admin Dev, this message activity updates BOTH participants in their sidebar list
                const participants = [msg.senderId, msg.receiverId];
                participants.forEach(pId => {
                    const conv = convMap.get(pId);
                    if (conv && pId !== currentUser.id) {
                        if (!conv.lastMessage || msg.timestamp > conv.lastMessage.timestamp) {
                            conv.lastMessage = msg;
                        }
                    }
                });
            } else {
                // Normal user: categorization relative to "me"
                const otherId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
                const conv = convMap.get(otherId);
                if (conv) {
                    if (!conv.lastMessage || msg.timestamp > conv.lastMessage.timestamp) {
                        conv.lastMessage = msg;
                    }
                    if (!msg.read && msg.receiverId === currentUser.id) {
                        conv.unreadCount++;
                    }
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

        if (currentUser) {
            logActivityToCloud({
                timestamp: new Date().toISOString(),
                userId: currentUser.id,
                userName: currentUser.name,
                userRole: currentUser.role,
                action: 'CHAT',
                category: 'CHAT',
                details: `Enviou uma mensagem para o usuário ID: ${receiverId}`,
                metadata: { receiverId }
            });
        }
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
