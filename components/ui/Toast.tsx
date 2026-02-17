import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage, useToast } from '../../contexts/ToastContext';

interface ToastProps {
    message: ToastMessage;
}

const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
};

const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
};

const Toast: React.FC<ToastProps> = ({ message }) => {
    const { removeToast } = useToast();

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(message.id);
        }, message.duration);

        return () => {
            clearTimeout(timer);
        };
    }, [message.id, message.duration, removeToast]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`relative flex items-start gap-3 w-full max-w-sm rounded-lg border p-4 shadow-lg pointer-events-auto ${colors[message.type]}`}
        >
            <div className={`shrink-0 ${iconColors[message.type]}`}>
                {icons[message.type]}
            </div>
            <div className="flex-1 pt-0.5">
                {message.title && <h3 className="text-sm font-semibold">{message.title}</h3>}
                <p className={`text-sm ${message.title ? 'mt-1 opacity-90' : 'font-medium'}`}>
                    {message.message}
                </p>
            </div>
            <button
                onClick={() => removeToast(message.id)}
                className="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
                aria-label="Fechar notificação"
                title="Fechar"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

interface ToastContainerProps {
    messages: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages }) => {
    // Fixed container at bottom-center or top-right. Let's go with top-right for desktop, bottom-center for mobile consistency?
    // User requested "Immediate visual feedback". Top-right is standard for CRM/Dashboards.
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 p-4 w-full max-w-sm pointer-events-none sm:items-end">
            <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                    <Toast key={message.id} message={message} />
                ))}
            </AnimatePresence>
        </div>
    );
};
