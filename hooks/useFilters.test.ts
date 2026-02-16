import { renderHook, act } from '@testing-library/react';
import { useFilters } from './useFilters';
import { EnrichedClient, AppUser, Product } from '../types';
import { describe, it, expect, vi } from 'vitest';

// Mock useUrlParams
vi.mock('./useUrlParams', () => ({
    useUrlParams: () => ({
        getParam: vi.fn(() => null),
        setParam: vi.fn(),
        clearParams: vi.fn()
    })
}));

// Mock data
const mockClients: EnrichedClient[] = [
    {
        id: '1',
        companyName: 'Empresa A',
        ownerName: 'João da Silva',
        cleanAddress: 'Rua A, 123',
        city: 'São Paulo',
        state: 'SP',
        region: 'Sudeste',
        category: ['Varejo'],
        salespersonId: 'user1',
        lat: 0, lng: 0,
        purchasedProducts: [],
        contact: '1199999999',
        originalAddress: 'Rua A, 123'
    },
    {
        id: '2',
        companyName: 'Empresa B',
        ownerName: 'Maria Oliveira',
        cleanAddress: 'Rua B, 456',
        city: 'Recife',
        state: 'PE',
        region: 'Nordeste',
        category: ['Atacado'],
        salespersonId: 'user2',
        lat: 0, lng: 0,
        purchasedProducts: [
            { sku: 'PROD1', name: 'Produto 1', category: 'Cat1', price: 10, quantity: 1, purchaseDate: '2023-01-01', brand: 'Brand1', factoryCode: 'F1' }
        ],
        contact: '8199999999',
        originalAddress: 'Rua B, 456'
    }
];

const mockUsers: AppUser[] = [
    { id: 'user1', name: 'Vendedor 1', username: 'vendedor1', role: 'sales_external' },
    { id: 'user2', name: 'Vendedor 2', username: 'vendedor2', role: 'sales_external' },
    { id: 'admin', name: 'Admin', username: 'admin', role: 'admin_general' }
];

const mockCurrentUser: AppUser = mockUsers[2]; // Admin sees all

const mockProducts: Product[] = [
    { sku: 'PROD1', name: 'Produto 1', category: 'Cat1', price: 10, brand: 'Brand1', factoryCode: 'F1' },
    { sku: 'PROD2', name: 'Produto 2', category: 'Cat2', price: 20, brand: 'Brand2', factoryCode: 'F2' }
];

describe('useFilters Hook', () => {
    it('deve retornar todos os clientes inicialmente (para admin)', () => {
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, mockCurrentUser, mockProducts));

        expect(result.current.filteredClients).toHaveLength(2);
        expect(result.current.visibleClients).toHaveLength(2);
    });

    it('deve filtrar por termo de busca (razão social)', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, mockCurrentUser, mockProducts));

        act(() => {
            result.current.setSearchQuery('Empresa A');
        });

        // Fast-forward debounce
        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(result.current.filteredClients).toHaveLength(1);
        expect(result.current.filteredClients[0].id).toBe('1');
        vi.useRealTimers();
    });

    it('deve filtrar por região', () => {
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, mockCurrentUser, mockProducts));

        act(() => {
            result.current.setFilterRegion('Nordeste');
        });

        expect(result.current.filteredClients).toHaveLength(1);
        expect(result.current.filteredClients[0].region).toBe('Nordeste');
    });

    it('deve filtrar por categoria', () => {
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, mockCurrentUser, mockProducts));

        act(() => {
            result.current.setFilterCategory('Varejo');
        });

        expect(result.current.filteredClients).toHaveLength(1);
        expect(result.current.filteredClients[0].category).toContain('Varejo');
    });

    it('deve filtrar clientes restrictos por vendedor (não admin)', () => {
        const salespersonUser = mockUsers[0]; // user1
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, salespersonUser, mockProducts));

        // user1 only owns client '1'
        expect(result.current.visibleClients).toHaveLength(1);
        expect(result.current.filteredClients).toHaveLength(1);
        expect(result.current.filteredClients[0].id).toBe('1');
    });

    it('deve filtrar apenas clientes com compras', () => {
        const { result } = renderHook(() => useFilters(mockClients, mockUsers, mockCurrentUser, mockProducts));

        act(() => {
            result.current.setFilterOnlyWithPurchases(true);
        });

        expect(result.current.filteredClients).toHaveLength(1);
        expect(result.current.filteredClients[0].id).toBe('2');
    });
});
