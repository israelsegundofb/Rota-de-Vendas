import { useState } from 'react';
import { AppUser, UserRole } from '../types';

export const INITIAL_USERS: AppUser[] = [
    { id: 'admin', name: 'Administrador Geral', username: 'admin', email: 'admin@vendas.ai', role: 'admin', password: '@Graves2026#', salesCategory: 'N/A', color: '#6B7280' },
    { id: '1', name: 'João Silva (Vendedor A)', username: 'vendedor_a', email: 'joao.silva@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Externo', color: '#EF4444' },
    { id: '2', name: 'Maria Santos (Vendedor B)', username: 'vendedor_b', email: 'maria.santos@vendas.ai', role: 'salesperson', password: '123', salesCategory: 'Interno', color: '#3B82F6' },
];

export const useAuth = () => {
    // Usuários são gerenciados pelo useDataPersistence, que usa Firestore
    // Este hook apenas gerencia o estado local e operações CRUD
    const [users, setUsers] = useState<AppUser[]>([]);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

    // NÃO persistimos mais aqui - useDataPersistence faz isso via Firestore
    // Os usuários chegam via prop e são sincronizados automaticamente

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
