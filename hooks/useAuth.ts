import { useState, useMemo } from 'react';
import { AppUser, UserRole } from '../types';

export const INITIAL_USERS: AppUser[] = [
    { id: 'admin_dev', name: 'Admin DEV', username: 'admin', email: 'admin@vendas.ai', role: 'admin_dev', password: '123', salesCategory: 'N/A', color: '#6B7280', status: 'Online' },
    { id: '1', name: 'João Silva (Vendedor A)', username: 'vendedor_a', email: 'joao.silva@vendas.ai', role: 'sales_external', password: '123', salesCategory: 'Externo', color: '#EF4444', status: 'Offline' }, // Red
    { id: '2', name: 'Maria Santos (Vendedor B)', username: 'vendedor_b', email: 'maria.santos@vendas.ai', role: 'sales_internal', password: '123', salesCategory: 'Interno', color: '#3B82F6', status: 'Offline' }, // Blue
];

export const useAuth = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const currentUser = useMemo(() => {
        if (!currentUserId) return null;
        return users.find(u => u.id === currentUserId) || null;
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

    return {
        users,
        setUsers,
        currentUser,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser
    };
};
