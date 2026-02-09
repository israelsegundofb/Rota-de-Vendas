import { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';

const INITIAL_USERS: AppUser[] = [
    { id: 'admin', name: 'Administrador Geral', username: 'admin', email: 'admin@vendas.ai', role: 'admin', password: '123', salesCategory: 'N/A', color: '#6B7280' },
    { id: '1', name: 'João Silva (Vendedor A)', username: 'vendedor_a', email: 'joao.silva@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Externo', color: '#EF4444' },
    { id: '2', name: 'Maria Santos (Vendedor B)', username: 'vendedor_b', email: 'maria.santos@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Interno', color: '#3B82F6' },
];

export const useAuth = () => {
    const [users, setUsers] = useState<AppUser[]>(() => {
        try {
            const saved = localStorage.getItem('vendas_ai_users');
            return saved ? JSON.parse(saved) : INITIAL_USERS;
        } catch (e) {
            console.error("Failed to load users from storage", e);
            return INITIAL_USERS;
        }
    });

    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

    // Persistence
    useEffect(() => {
        localStorage.setItem('vendas_ai_users', JSON.stringify(users));
    }, [users]);

    const login = (user: AppUser) => {
        setCurrentUser(user);
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const addUser = (newUser: AppUser) => {
        setUsers([...users, newUser]);
    };

    const updateUser = (updatedUser: AppUser) => {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    };

    const deleteUser = (userId: string) => {
        setUsers(users.filter(u => u.id !== userId));
    };

    return {
        users,
        setUsers, // Exposed for cloud sync override if needed
        currentUser,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser
    };
};
