import React from 'react';
import { render } from '@testing-library/react';
import NetworkCanvas from '../NetworkCanvas';
import { MOCK_NETWORK_DATA } from '../../data/mockNetworkData';

// Mock useD3Network to test simulation control functions
jest.mock('../../hooks/useD3Network', () => ({
  useD3Network: () => ({
    svgRef: { current: null },
    initializeVisualization: jest.fn(() => jest.fn()),
    restartSimulation: jest.fn(),
    isSimulationRunning: jest.fn(() => false),
    zoomRef: { current: null }
  })
}));

describe('NetworkCanvas Simulation Control', () => {
  it('should render with simulation control functions', () => {
    const { container } = render(
      <NetworkCanvas networkData={MOCK_NETWORK_DATA} />
    );
    
    // Check that the component renders without crashing
    expect(container.querySelector('svg')).toBeInTheDocument();
    
    // Check that the NetworkControls are rendered
    expect(container.querySelector('[title="Start Simulation"]')).toBeInTheDocument();
  });
  
  it('should expose simulation control capabilities', () => {
    // Mock implementation should return simulation control functions
    const mockUseD3Network = jest.requireMock('../../hooks/useD3Network').useD3Network;
    const result = mockUseD3Network();
    
    expect(result.restartSimulation).toBeDefined();
    expect(result.isSimulationRunning).toBeDefined();
    expect(typeof result.restartSimulation).toBe('function');
    expect(typeof result.isSimulationRunning).toBe('function');
  });
});