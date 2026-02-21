import { render } from '@testing-library/react';
import ClientList from './ClientList';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { EnrichedClient } from '../types';

// Mock Dependencies
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ style, data, itemContent }: any) => (
        <div data-testid="virtuoso-list" style={style}>
            {data.map((item: any, index: number) => (
                <div key={index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
    VirtuosoGrid: ({ style, data, itemContent }: any) => (
        <div data-testid="virtuoso-grid" style={style}>
            {data.map((item: any, index: number) => (
                <div key={index}>{itemContent(index, item)}</div>
            ))}
        </div>
    ),
}));

// Mock ClientCard to capture props
// We use a spy on the implementation to inspect calls
const ClientCardMock = vi.fn((props) => <div data-testid="client-card">{props.client.companyName}</div>);
vi.mock('./ClientCard', () => ({ default: (props: any) => ClientCardMock(props) }));

// Mock other components to avoid rendering complexity
vi.mock('./EditClientModal', () => ({ default: () => null }));
vi.mock('./AddClientModal', () => ({ default: () => null }));
vi.mock('./ClientProductAssignmentModal', () => ({ default: () => null }));

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

describe('ClientList Performance', () => {
    it('should pass stable style prop to ClientCard across re-renders', () => {
        // Set window width to simulate desktop (VirtuosoGrid)
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
        window.dispatchEvent(new Event('resize'));

        const { rerender } = render(
            <ClientList
                clients={mockClients}
                onUpdateClient={() => { }}
                currentUserRole="sales_external"
                currentUserId="user1"
                currentUserName="Vendedor 1"
                products={[]}
                productCategories={[]}
                users={[]}
                searchTerm="initial"
                onSearchChange={() => { }}
                regionFilter="Todos"
                onRegionFilterChange={() => { }}
                categoryFilter="Todos"
                onCategoryFilterChange={() => { }}
            />
        );

        // Get the style prop from the first call
        // Note: ClientCardMock might be called multiple times if React renders twice in StrictMode, or if Virtuoso renders multiple items.
        // But since we only have 1 item, we check the last call of the FIRST render cycle.
        // Actually, we just need to compare the style prop from the first render vs the second render.

        const firstRenderCallCount = ClientCardMock.mock.calls.length;
        expect(firstRenderCallCount).toBeGreaterThan(0);
        const firstCallStyle = ClientCardMock.mock.calls[firstRenderCallCount - 1][0].style;

        // Rerender with different search term
        rerender(
            <ClientList
                clients={mockClients}
                onUpdateClient={() => { }}
                currentUserRole="sales_external"
                currentUserId="user1"
                currentUserName="Vendedor 1"
                products={[]}
                productCategories={[]}
                users={[]}
                searchTerm="updated"
                onSearchChange={() => { }}
                regionFilter="Todos"
                onRegionFilterChange={() => { }}
                categoryFilter="Todos"
                onCategoryFilterChange={() => { }}
            />
        );

        const secondRenderCallCount = ClientCardMock.mock.calls.length;
        expect(secondRenderCallCount).toBeGreaterThan(firstRenderCallCount);

        const lastCallStyle = ClientCardMock.mock.calls[secondRenderCallCount - 1][0].style;

        // This expectation SHOULD FAIL before the fix if style is recreated on every render
        expect(firstCallStyle).toBe(lastCallStyle);
    });
});
