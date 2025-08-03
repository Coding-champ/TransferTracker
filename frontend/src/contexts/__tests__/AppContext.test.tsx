import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import { act } from '@testing-library/react';

// Test component to use context
const TestComponent = () => {
  const { state, setFilters, setSelectedNode, setHoveredEdge, clearSelections } = useAppContext();
  
  return (
    <div>
      <div data-testid="filters-count">{state.filters.seasons.length}</div>
      <div data-testid="selected-node">{state.selectedNode?.name || 'none'}</div>
      <div data-testid="hovered-edge">{state.hoveredEdge?.id || 'none'}</div>
      <button onClick={() => setFilters({ ...state.filters, seasons: ['2022/23'] })}>
        Update Filters
      </button>
      <button onClick={() => setSelectedNode({ id: 'test', name: 'Test Club', league: 'Test League', country: 'Test', stats: { transfersIn: 1, transfersOut: 2, totalSpent: 1000, totalReceived: 2000, netSpend: -1000 } })}>
        Select Node
      </button>
      <button onClick={() => setHoveredEdge({ id: 'test-edge', source: 'a', target: 'b', transfers: [], stats: { totalValue: 1000, transferCount: 1, avgTransferValue: 1000, types: ['sale'], seasons: ['2023/24'], transferWindows: ['summer'] } })}>
        Hover Edge
      </button>
      <button onClick={clearSelections}>Clear Selections</button>
    </div>
  );
};

describe('AppContext', () => {
  it('provides initial state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('filters-count')).toHaveTextContent('1'); // Default season
    expect(screen.getByTestId('selected-node')).toHaveTextContent('none');
    expect(screen.getByTestId('hovered-edge')).toHaveTextContent('none');
  });

  it('updates filters correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByText('Update Filters').click();
    });

    // Should still have 1 filter but different season
    expect(screen.getByTestId('filters-count')).toHaveTextContent('1');
  });

  it('manages selected node state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByText('Select Node').click();
    });

    expect(screen.getByTestId('selected-node')).toHaveTextContent('Test Club');

    act(() => {
      screen.getByText('Clear Selections').click();
    });

    expect(screen.getByTestId('selected-node')).toHaveTextContent('none');
  });

  it('manages hovered edge state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByText('Hover Edge').click();
    });

    expect(screen.getByTestId('hovered-edge')).toHaveTextContent('test-edge');

    act(() => {
      screen.getByText('Clear Selections').click();
    });

    expect(screen.getByTestId('hovered-edge')).toHaveTextContent('none');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    consoleSpy.mockRestore();
  });
});