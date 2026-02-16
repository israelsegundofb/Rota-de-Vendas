import { render, screen, fireEvent } from '@testing-library/react';
import ClientList from './ClientList';
import { EnrichedClient, AppUser } from '../types';
import { describe, it, expect, vi } from 'vitest';

// Mock Dependencies
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent }: any) => (
        <div data-testid="virtuoso-list">
            {data.map((item: any, index: number) => (
                <div key={index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
    VirtuosoGrid: ({ data, itemContent }: any) => (
        <div data-testid="virtuoso-grid">
            {data.map((item: any, index: number) => (
                <div key={index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
}));

vi.mock('./EditClientModal', () => ({ default: () => <div data-testid="edit-modal">Edit Modal</div> }));
vi.mock('./AddClientModal', () => ({ default: () => <div data-testid="add-modal">Add Modal</div> }));
vi.mock('./ClientProductAssignmentModal', () => ({ default: () => <div data-testid="product-modal">Product Modal</div> }));

const mockClients: EnrichedClient[] = [
    {
        id: '1',
        companyName: 'Empresa Teste',
        ownerName: 'Dono Teste',
        cleanAddress: 'Rua Teste',
        city: 'Cidade Teste',
        state: 'TE',
        region: 'Sul',
        category: ['Varejo'],
        salespersonId: 'user1',
        lat: 0, lng: 0,
        purchasedProducts: [],
        contact: '999999999',
        originalAddress: 'Rua Teste',
    }
];

const mockUsers: AppUser[] = [
    { id: 'user1', name: 'Vendedor 1', username: 'vendedor1', role: 'sales_external' }
];

describe('ClientList Component', () => {
    it('deve renderizar a lista de clientes', () => {
        render(
            <ClientList
                clients={mockClients}
                onUpdateClient={() => { }}
                currentUserRole="sales_external"
                currentUserId="user1"
                currentUserName="Vendedor 1"
                products={[]}
                productCategories={[]}
                users={mockUsers}
                searchTerm=""
                onSearchChange={vi.fn()}
                regionFilter="Todos"
                onRegionFilterChange={vi.fn()}
                categoryFilter="Todos"
                onCategoryFilterChange={vi.fn()}
            />
        );

        // Usa getAllByText pois pode aparecer no view mobile e desktop
        const companyNameElements = screen.getAllByText('Empresa Teste');
        expect(companyNameElements.length).toBeGreaterThan(0);
    });

    it('deve chamar onSearchChange ao digitar', () => {
        const onSearchChangeMock = vi.fn();
        render(
            <ClientList
                clients={mockClients}
                onUpdateClient={() => { }}
                currentUserRole="sales_external"
                currentUserId="user1"
                currentUserName="Vendedor 1"
                products={[]}
                productCategories={[]}
                users={mockUsers}
                searchTerm=""
                onSearchChange={onSearchChangeMock}
                regionFilter="Todos"
                onRegionFilterChange={vi.fn()}
                categoryFilter="Todos"
                onCategoryFilterChange={vi.fn()}
            />
        );

        const inputs = screen.getAllByPlaceholderText(/Razão Social ou Proprietário/i);
        const searchInput = inputs[0];

        fireEvent.change(searchInput, { target: { value: 'Nova Busca' } });
        expect(onSearchChangeMock).toHaveBeenCalledWith('Nova Busca');
    });
});
