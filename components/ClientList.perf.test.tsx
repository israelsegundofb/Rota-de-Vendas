import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ClientList from './ClientList';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichedClient } from '../types';

let mockRenderCount = 0;

vi.mock('./ClientCard', () => ({
  default: React.memo((props: any) => {
    mockRenderCount++;
    return <div data-testid="client-card">{props.client.id}</div>;
  })
}));

// Provide a mock for VirtuosoGrid as well so we can just count renders
vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: any) => (
    <div data-testid="virtuoso">
      {data?.map((item: any, index: number) => (
        <div key={item.id}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
  VirtuosoGrid: ({ data, itemContent, components }: any) => (
    <div data-testid="virtuoso-grid">
      {data?.map((item: any, index: number) => (
        <div key={item.id}>{itemContent(index, item)}</div>
      ))}
    </div>
  )
}));

const mockClients: EnrichedClient[] = Array.from({ length: 50 }).map((_, i) => ({
  id: `c${i}`,
  companyName: `Client ${i}`,
  region: 'Sul',
  category: ['Varejo'],
  salespersonId: 'u1',
  lat: 0,
  lng: 0,
  cleanAddress: '',
  city: '',
  state: '',
  ownerName: '',
  purchasedProducts: [],
  contact: '',
  originalAddress: ''
}));

describe('ClientList Performance', () => {
  beforeEach(() => {
    mockRenderCount = 0;
  });

  it('does not re-render ClientCard components when parent state changes but list props are the same', async () => {
    const Wrapper = () => {
      const [term, setTerm] = React.useState('');
      return (
        <div>
          <button onClick={() => setTerm('a')} data-testid="update">Update</button>
          <ClientList
            clients={mockClients}
            searchTerm={term}
            onSearchChange={setTerm}
            regionFilter="Todos"
            onRegionFilterChange={() => {}}
            categoryFilter="Todos"
            onCategoryFilterChange={() => {}}
            onUpdateClient={() => {}}
            products={[]}
            productCategories={[]}
          />
        </div>
      );
    };

    render(<Wrapper />);
    const initialRenderCount = mockRenderCount;
    expect(initialRenderCount).toBe(50);

    mockRenderCount = 0;

    await act(async () => {
      fireEvent.click(screen.getByTestId('update'));
    });

    const afterUpdateRenderCount = mockRenderCount;
    console.log(`Initial renders: ${initialRenderCount}, Renders after update: ${afterUpdateRenderCount}`);

    // If ClientCard doesn't re-render, afterUpdateRenderCount should be 0.
    // If it re-renders because `itemContent` or `style` changes referential equality, it will be 50.
    expect(afterUpdateRenderCount).toBe(0);
  });
});
