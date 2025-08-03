import { renderHook, act } from '@testing-library/react';
import { useNetworkInteractions } from '../useNetworkInteractions';

describe('useNetworkInteractions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('initializes with correct default values', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    expect(result.current.selectedNodeData).toBeNull();
    expect(result.current.hoveredEdgeData).toBeNull();
    expect(result.current.isDraggingRef.current).toBe(false);
  });

  test('isDraggingRef is properly exposed', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    expect(result.current.isDraggingRef).toBeDefined();
    expect(typeof result.current.isDraggingRef).toBe('object');
    expect(result.current.isDraggingRef.current).toBe(false);
  });

  test('handleDragStart sets isDragging to true immediately', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    act(() => {
      result.current.handleDragStart();
    });

    expect(result.current.isDraggingRef.current).toBe(true);
  });

  test('handleDragEnd sets up timeout for isDragging reset', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    // Start drag first
    act(() => {
      result.current.handleDragStart();
    });
    expect(result.current.isDraggingRef.current).toBe(true);

    // End drag
    act(() => {
      result.current.handleDragEnd();
    });

    // Should still be true immediately after drag end
    expect(result.current.isDraggingRef.current).toBe(true);

    // Fast-forward time by 100ms (the timeout duration)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should now be false
    expect(result.current.isDraggingRef.current).toBe(false);
  });

  test('handleNodeHover does not update when dragging', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockNode = {
      id: '1',
      name: 'Test Club',
      league: 'Bundesliga',
      x: 100,
      y: 100,
      stats: { transfersIn: 5, transfersOut: 3 }
    };

    // Start dragging
    act(() => {
      result.current.handleDragStart();
    });

    // Try to hover while dragging
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    // Should not update selectedNodeData while dragging
    expect(result.current.selectedNodeData).toBeNull();

    // End drag and wait for timeout
    act(() => {
      result.current.handleDragEnd();
      jest.advanceTimersByTime(100);
    });

    // Now hovering should work
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    expect(result.current.selectedNodeData).toEqual(mockNode);
  });

  test('handleEdgeHover does not update when dragging', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockEdge = {
      source: '1',
      target: '2',
      stats: { transferCount: 3, successRate: 75 },
      transfers: []
    };

    // Start dragging
    act(() => {
      result.current.handleDragStart();
    });

    // Try to hover edge while dragging
    act(() => {
      result.current.handleEdgeHover(mockEdge);
    });

    // Should not update hoveredEdgeData while dragging
    expect(result.current.hoveredEdgeData).toBeNull();

    // End drag and wait for timeout
    act(() => {
      result.current.handleDragEnd();
      jest.advanceTimersByTime(100);
    });

    // Now edge hovering should work
    act(() => {
      result.current.handleEdgeHover(mockEdge);
    });

    expect(result.current.hoveredEdgeData).toEqual(mockEdge);
  });

  test('multiple drag start calls clear previous timeouts', () => {
    const { result } = renderHook(() => useNetworkInteractions());

    // Start first drag
    act(() => {
      result.current.handleDragStart();
    });

    // End first drag
    act(() => {
      result.current.handleDragEnd();
    });

    // Start second drag immediately (should clear the timeout from first drag)
    act(() => {
      result.current.handleDragStart();
    });

    // Wait 100ms - should still be dragging because second drag cleared the timeout
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.isDraggingRef.current).toBe(true);
  });

  test('clearSelection does not clear when dragging', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockNode = {
      id: '1',
      name: 'Test Club',
      league: 'Bundesliga',
      x: 100,
      y: 100,
      stats: { transfersIn: 5, transfersOut: 3 }
    };

    // Set some data first
    act(() => {
      result.current.handleNodeHover(mockNode);
    });
    expect(result.current.selectedNodeData).toEqual(mockNode);

    // Start dragging
    act(() => {
      result.current.handleDragStart();
    });

    // Try to clear while dragging
    act(() => {
      result.current.clearSelection();
    });

    // Should not clear while dragging
    expect(result.current.selectedNodeData).toEqual(mockNode);

    // End drag and wait
    act(() => {
      result.current.handleDragEnd();
      jest.advanceTimersByTime(100);
    });

    // Now clear should work
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedNodeData).toBeNull();
  });

  test('handleNodeClick prevents click during drag', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockNode = {
      id: '1',
      name: 'Test Club',
      league: 'Bundesliga',
      x: 100,
      y: 100,
      fx: null,
      fy: null,
      stats: { transfersIn: 5, transfersOut: 3 }
    };

    const mockSimulation = {
      alpha: jest.fn(() => ({ restart: jest.fn() }))
    };

    // Start dragging
    act(() => {
      result.current.handleDragStart();
    });

    // Try to click while dragging
    act(() => {
      result.current.handleNodeClick(mockNode, mockSimulation);
    });

    // Should not pin/unpin node while dragging
    expect(mockNode.fx).toBeNull();
    expect(mockNode.fy).toBeNull();
    expect(mockSimulation.alpha).not.toHaveBeenCalled();
  });

  test('zoom behavior: hover events do not interfere with drag state', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockNode = {
      id: '1',
      name: 'Test Club',
      league: 'Bundesliga',
      x: 100,
      y: 100,
      stats: { transfersIn: 5, transfersOut: 3 }
    };

    const mockEdge = {
      source: '1',
      target: '2',
      stats: { transferCount: 3, successRate: 75 },
      transfers: []
    };

    // Start dragging
    act(() => {
      result.current.handleDragStart();
    });

    // Hover over node while dragging
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    // Should not update selectedNodeData while dragging
    expect(result.current.selectedNodeData).toBeNull();
    expect(result.current.isDraggingRef.current).toBe(true);

    // Hover over edge while dragging
    act(() => {
      result.current.handleEdgeHover(mockEdge);
    });

    // Should not update hoveredEdgeData while dragging
    expect(result.current.hoveredEdgeData).toBeNull();
    expect(result.current.isDraggingRef.current).toBe(true);

    // End drag
    act(() => {
      result.current.handleDragEnd();
      jest.advanceTimersByTime(100);
    });

    // Now hovering should work
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    expect(result.current.selectedNodeData).toEqual(mockNode);
    expect(result.current.isDraggingRef.current).toBe(false);
  });

  test('zoom behavior: rapid hover events during drag transition', () => {
    const { result } = renderHook(() => useNetworkInteractions());
    
    const mockNode = {
      id: '1',
      name: 'Test Club',
      league: 'Bundesliga',
      x: 100,
      y: 100,
      stats: { transfersIn: 5, transfersOut: 3 }
    };

    // Start and immediately end drag
    act(() => {
      result.current.handleDragStart();
    });

    act(() => {
      result.current.handleDragEnd();
    });

    // Hover immediately after drag end (during timeout)
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    // Should not update while in timeout period
    expect(result.current.selectedNodeData).toBeNull();
    expect(result.current.isDraggingRef.current).toBe(true);

    // Wait for timeout to complete
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Now hovering should work
    act(() => {
      result.current.handleNodeHover(mockNode);
    });

    expect(result.current.selectedNodeData).toEqual(mockNode);
    expect(result.current.isDraggingRef.current).toBe(false);
  });
});