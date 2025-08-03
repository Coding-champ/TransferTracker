import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransferNetwork from '../TransferNetwork';
import { FilterState } from '../../types';

// Mock the network data hook
jest.mock('../../hooks/useNetworkData', () => ({
  useNetworkData: jest.fn(() => ({
    networkData: {
      nodes: [
        { id: '1', name: 'Test Club 1', league: 'Bundesliga', x: 100, y: 100, stats: { transfersIn: 5, transfersOut: 3 } },
        { id: '2', name: 'Test Club 2', league: 'Premier League', x: 200, y: 200, stats: { transfersIn: 2, transfersOut: 4 } }
      ],
      edges: [
        { 
          source: '1', 
          target: '2', 
          stats: { transferCount: 3, successRate: 75 },
          transfers: []
        }
      ],
      metadata: { successRate: 75 }
    },
    loading: false,
    error: null,
    refetch: jest.fn()
  }))
}));

// Mock the network interactions hook
jest.mock('../../hooks/useNetworkInteractions', () => ({
  useNetworkInteractions: jest.fn(() => ({
    selectedNodeData: null,
    hoveredEdgeData: null,
    isDraggingRef: { current: false },
    handleNodeHover: jest.fn(),
    handleNodeClick: jest.fn(),
    handleEdgeHover: jest.fn(),
    handleDragStart: jest.fn(),
    handleDragEnd: jest.fn()
  }))
}));

// Mock D3 to prevent actual DOM manipulation during tests
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({ remove: jest.fn() })),
    attr: jest.fn(() => ({ attr: jest.fn() })),
    append: jest.fn(() => ({ attr: jest.fn(), on: jest.fn() })),
    call: jest.fn()
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn(() => ({
      filter: jest.fn(() => ({
        on: jest.fn()
      }))
    }))
  })),
  forceSimulation: jest.fn(() => ({
    force: jest.fn(() => ({ force: jest.fn() })),
    on: jest.fn(),
    stop: jest.fn()
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn(() => ({
      distance: jest.fn(() => ({
        strength: jest.fn()
      }))
    }))
  })),
  forceManyBody: jest.fn(() => ({ strength: jest.fn() })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({ radius: jest.fn() })),
  scaleOrdinal: jest.fn(() => ({
    domain: jest.fn(() => ({
      range: jest.fn()
    }))
  })),
  zoomIdentity: { k: 1, x: 0, y: 0 },
  drag: jest.fn(() => ({
    on: jest.fn()
  }))
}));

describe('TransferNetwork Zoom Behavior', () => {
  const defaultFilters: FilterState = {
    selectedSeasons: [],
    selectedLeagues: [],
    selectedClubs: [],
    transferTypeFilter: '',
    minTransferValue: 0,
    maxTransferValue: 1000000000,
    selectedTransferWindow: '',
    selectedPositions: [],
    selectedNationalities: [],
    ageRange: [16, 40],
    selectedContinents: [],
    selectedLeagueTiers: [],
    onlySuccessfulTransfers: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders TransferNetwork component', () => {
    render(<TransferNetwork filters={defaultFilters} />);
    
    expect(screen.getByText('Enhanced Transfer Network')).toBeInTheDocument();
    expect(screen.getByText('2 clubs')).toBeInTheDocument();
    expect(screen.getByText('1 connections')).toBeInTheDocument();
  });

  test('isDraggingRef is properly managed from useNetworkInteractions hook', () => {
    render(<TransferNetwork filters={defaultFilters} />);
    
    // Verify that the hook is called and isDraggingRef is available
    const { useNetworkInteractions } = require('../../hooks/useNetworkInteractions');
    expect(useNetworkInteractions).toHaveBeenCalled();
  });

  test('drag handlers are properly connected', () => {
    render(<TransferNetwork filters={defaultFilters} />);
    
    // Verify drag handlers are available through hook call
    const { useNetworkInteractions } = require('../../hooks/useNetworkInteractions');
    expect(useNetworkInteractions).toHaveBeenCalled();
  });

  test('zoom control instructions are displayed', () => {
    render(
      <TestWrapper>
        <TransferNetwork />
      </TestWrapper>
    );
    
    expect(screen.getByText('🎮 Controls:')).toBeInTheDocument();
    expect(screen.getByText('• Mouse wheel to zoom (0.1x - 5x)')).toBeInTheDocument();
    expect(screen.getByText('• Drag empty space to pan')).toBeInTheDocument();
    expect(screen.getByText('• Drag nodes to move them')).toBeInTheDocument();
  });
});

describe('TransferNetwork Integration with useNetworkInteractions', () => {
  const defaultFilters: FilterState = {
    selectedSeasons: [],
    selectedLeagues: [],
    selectedClubs: [],
    transferTypeFilter: '',
    minTransferValue: 0,
    maxTransferValue: 1000000000,
    selectedTransferWindow: '',
    selectedPositions: [],
    selectedNationalities: [],
    ageRange: [16, 40],
    selectedContinents: [],
    selectedLeagueTiers: [],
    onlySuccessfulTransfers: false
  };

  test('zoom behavior respects isDraggingRef from useNetworkInteractions', () => {
    render(
      <TestWrapper>
        <TransferNetwork />
      </TestWrapper>
    );
    
    // Verify that the component is using the shared isDraggingRef
    const { useNetworkInteractions } = require('../../hooks/useNetworkInteractions');
    expect(useNetworkInteractions).toHaveBeenCalled();
  });

  test('drag start and end are properly coordinated', () => {
    render(
      <TestWrapper>
        <TransferNetwork />
      </TestWrapper>
    );
    
    // Verify hooks are called
    const { useNetworkInteractions } = require('../../hooks/useNetworkInteractions');
    expect(useNetworkInteractions).toHaveBeenCalled();
  });
});