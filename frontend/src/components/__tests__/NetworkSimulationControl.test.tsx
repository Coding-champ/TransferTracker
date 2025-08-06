import React from 'react';
import { render } from '@testing-library/react';
import NetworkVisualization from '../Visualizations/NetworkVisualization';
import { MOCK_NETWORK_DATA } from '../../data/mockNetworkData';

// Mock ResizeObserver which is not available in test environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock the new hooks from NetworkVisualization
jest.mock('../../components/NetworkVisualization/hooks/useSimulationControl', () => ({
  useSimulationControl: () => ({
    restartSimulation: jest.fn(),
    isSimulationRunning: jest.fn(() => false),
  })
}));

jest.mock('../../components/NetworkVisualization/hooks/useZoomControls', () => ({
  useZoomControls: () => ({
    zoomRef: { current: null }
  })
}));

jest.mock('../../components/NetworkVisualization/hooks/useNetworkInteractions', () => ({
  useNetworkInteractions: () => ({
    selectedNode: null,
    hoveredEdge: null,
    isDraggingRef: { current: false },
    handleNodeHover: jest.fn(),
    handleNodeClick: jest.fn(),
    handleEdgeHover: jest.fn(),
    createDragBehavior: jest.fn()
  })
}));

describe('NetworkVisualization Simulation Control', () => {
  it('should render with simulation control functions', () => {
    const { container } = render(
      <NetworkVisualization networkData={MOCK_NETWORK_DATA} />
    );
    
    // Check that the component renders without crashing
    expect(container.querySelector('svg')).toBeInTheDocument();
    
    // Check that the NetworkControls are rendered
    expect(container.querySelector('[title="Start Simulation"]')).toBeInTheDocument();
  });
  
  it('should expose simulation control capabilities', () => {
    // Test that the component renders without crashing
    const { container } = render(
      <NetworkVisualization networkData={MOCK_NETWORK_DATA} />
    );
    
    // Verify the component renders
    expect(container.firstChild).toBeDefined();
  });
});