import { useEffect, useRef } from 'react';
import { logActivityToCloud } from '../services/firebaseService';
import { useAuth } from './useAuth';

export const usePageTracking = (pageName: string, path?: string) => {
    const { currentUser } = useAuth();
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        if (!currentUser) return;

        // Start timer
        startTimeRef.current = Date.now();

        // Log entry
        logActivityToCloud({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'VIEW',
            category: 'NAVIGATION',
            details: `Acessou a tela: ${pageName}`,
            metadata: { path: path || window.location.pathname },
            timestamp: new Date().toISOString()
        });

        return () => {
            if (startTimeRef.current) {
                const duration = (Date.now() - startTimeRef.current) / 1000; // seconds

                if (duration > 2) {
                    logActivityToCloud({
                        userId: currentUser.id,
                        userName: currentUser.name,
                        userRole: currentUser.role,
                        action: 'VIEW',
                        category: 'NAVIGATION',
                        details: `Permaneceu em ${pageName} por ${duration.toFixed(1)}s`,
                        metadata: {
                            duration,
                            path: path || window.location.pathname
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            }
        };
    }, [pageName, currentUser, path]);
};

export const useClickTracking = () => {
    const { currentUser } = useAuth();

    const trackClick = (elementId: string, description: string) => {
        if (!currentUser) return;

        logActivityToCloud({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'CLICK',
            category: 'INTERACTION',
            details: `Clicou em: ${description}`,
            metadata: { elementId },
            timestamp: new Date().toISOString()
        });
    };

    return { trackClick };
};
