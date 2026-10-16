import { useState, useMemo } from 'react';
import { AppUser, UserRole } from '../types';

export const INITIAL_USERS: AppUser[] = [
    { id: '1770947393105', name: 'Admin_Dev', username: 'admin_israel', email: 'israelsegundofb@gmail.com', role: 'admin_dev', password: '123456', salesCategory: 'N/A', color: '#6B7280', status: 'Online' },
];

export const useAuth = () => {
    const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const currentUser = useMemo(() => {
        if (!currentUserId) return null;
        const found = users.find(u => u.id === currentUserId) || null;
        if (found && found.username.toLowerCase() !== 'admin_israel') {
            return null;
        }
        return found;
    }, [users, currentUserId]);

    const login = (user: AppUser) => {
        // Garantir que o usuário exista na lista para que a derivação funcione
        if (!users.find(u => u.id === user.id)) {
            setUsers(prev => [...prev, user]);
        }
        setCurrentUserId(user.id);
    };

    const logout = () => {
        setCurrentUserId(null);
    };

    const addUser = (newUser: AppUser) => {
        setUsers(prev => [...prev, newUser]);
    };

    const updateUser = (updatedUser: AppUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    };

    const deleteUser = (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        if (currentUserId === userId) setCurrentUserId(null);
    };

    const publicUsers = useMemo(() => {
        const isAdmDev = currentUser?.role === 'admin_dev';
        return users.map(u => {
            if (isAdmDev) return u;
            return { ...u, password: '***' };
        });
    }, [users, currentUser]);

    return {
        users, // Raw list for Login/Admin
        publicUsers, // Sanitized list for General UI
        setUsers,
        currentUser,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser
    };
};
