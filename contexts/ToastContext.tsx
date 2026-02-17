import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/ui/Toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
}

interface ToastContextData {
    addToast: (message: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
    toast: {
        success: (message: string, title?: string, duration?: number) => void;
        error: (message: string, title?: string, duration?: number) => void;
        info: (message: string, title?: string, duration?: number) => void;
        warning: (message: string, title?: string, duration?: number) => void;
    };
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setMessages((state) => state.filter((message) => message.id !== id));
    }, []);

    const addToast = useCallback(({ type, title, message, duration = 3000 }: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const toast = {
            id,
            type,
            title,
            message,
            duration,
        };

        setMessages((state) => [...state, toast]);
    }, []);

    const toast = {
        success: (message: string, title?: string, duration?: number) => addToast({ type: 'success', message, title, duration }),
        error: (message: string, title?: string, duration?: number) => addToast({ type: 'error', message, title, duration }),
        info: (message: string, title?: string, duration?: number) => addToast({ type: 'info', message, title, duration }),
        warning: (message: string, title?: string, duration?: number) => addToast({ type: 'warning', message, title, duration }),
    };

    return (
        <ToastContext.Provider value={{ addToast, removeToast, toast }}>
            {children}
            <ToastContainer messages={messages} />
        </ToastContext.Provider>
    );
};

export function useToast(): ToastContextData {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }

    return context;
}
