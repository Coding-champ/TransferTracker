import { renderHook, act } from '@testing-library/react';
import { useGlobalState, useStateActions, loggingMiddleware } from '../useGlobalState';

// Mock console methods for testing middleware
const mockConsole = {
  group: jest.fn(),
  log: jest.fn(),
  groupEnd: jest.fn()
};

global.console = { ...global.console, ...mockConsole };

describe('useGlobalState', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with provided state', () => {
    const initialState = { count: 0, name: 'test' };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    expect(result.current.state).toEqual(initialState);
  });

  it('should update state with setState', () => {
    const initialState = { count: 0 };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    act(() => {
      result.current.setState({ count: 5 });
    });

    expect(result.current.state.count).toBe(5);
  });

  it('should handle functional updates', () => {
    const initialState = { count: 0 };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    act(() => {
      result.current.setState(prev => ({ count: prev.count + 1 }));
    });

    expect(result.current.state.count).toBe(1);
  });

  it('should update specific fields', () => {
    const initialState = { count: 0, name: 'test' };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    act(() => {
      result.current.updateField('count', 10);
    });

    expect(result.current.state.count).toBe(10);
    expect(result.current.state.name).toBe('test');
  });

  it('should reset state', () => {
    const initialState = { count: 0 };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    act(() => {
      result.current.setState({ count: 5 });
    });

    act(() => {
      result.current.resetState();
    });

    expect(result.current.state).toEqual(initialState);
  });

  it('should handle selective subscriptions', () => {
    const initialState = { count: 0, name: 'test' };
    const { result } = renderHook(() => 
      useGlobalState({ initialState })
    );

    const count = result.current.getSelectedValue(state => state.count);
    expect(count).toBe(0);

    act(() => {
      result.current.updateField('name', 'updated');
    });

    // Count should still be 0 when name changes
    const countAfterNameUpdate = result.current.getSelectedValue(state => state.count);
    expect(countAfterNameUpdate).toBe(0);
    
    act(() => {
      result.current.updateField('count', 5);
    });

    // Count should now be updated
    const countAfterCountUpdate = result.current.getSelectedValue(state => state.count);
    expect(countAfterCountUpdate).toBe(5);
  });

  it('should persist state to localStorage when enabled', () => {
    const initialState = { count: 0 };
    const { result } = renderHook(() => 
      useGlobalState({ 
        initialState,
        persistence: { enabled: true, key: 'test-state' }
      })
    );

    act(() => {
      result.current.setState({ count: 5 });
    });

    const stored = localStorage.getItem('test-state');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual({ count: 5 });
  });

  it('should load persisted state on initialization', () => {
    const persistedState = { count: 10 };
    localStorage.setItem('test-state', JSON.stringify(persistedState));

    const { result } = renderHook(() => 
      useGlobalState({ 
        initialState: { count: 0 },
        persistence: { enabled: true, key: 'test-state' }
      })
    );

    expect(result.current.state).toEqual(persistedState);
  });

  it('should execute middleware', () => {
    const middleware = jest.fn((state, action, next) => {
      next(action);
    });

    const { result } = renderHook(() => 
      useGlobalState({ 
        initialState: { count: 0 },
        middleware: [middleware]
      })
    );

    act(() => {
      result.current.setState({ count: 1 });
    });

    expect(middleware).toHaveBeenCalled();
  });

  it('should provide metrics', () => {
    const { result } = renderHook(() => 
      useGlobalState({ initialState: { count: 0 } })
    );

    expect(result.current.metrics).toEqual({
      subscriptionCount: 0,
      cacheSize: 0,
      stateSize: expect.any(Number)
    });
  });
});

describe('useStateActions', () => {
  it('should create typed actions', () => {
    const mockDispatch = jest.fn();
    const { result } = renderHook(() => 
      useStateActions(mockDispatch)
    );

    act(() => {
      result.current.setState({ count: 1 });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_STATE',
      payload: { count: 1 }
    });

    act(() => {
      result.current.updateField('count', 2);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_FIELD',
      payload: { field: 'count', value: 2 }
    });

    act(() => {
      result.current.resetState();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'RESET_STATE'
    });
  });

  it('should handle batch updates', () => {
    const mockDispatch = jest.fn();
    const { result } = renderHook(() => 
      useStateActions(mockDispatch)
    );

    const updates = [
      { field: 'count', value: 1 },
      { field: 'name', value: 'test' }
    ];

    act(() => {
      result.current.batchUpdate(updates);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'BATCH_UPDATE',
      payload: updates
    });
  });

  it('should handle custom actions', () => {
    const mockDispatch = jest.fn();
    const { result } = renderHook(() => 
      useStateActions(mockDispatch)
    );

    act(() => {
      result.current.customAction('CUSTOM_TYPE', { data: 'test' });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'CUSTOM_TYPE',
      payload: { data: 'test' }
    });
  });
});

describe('loggingMiddleware', () => {
  beforeEach(() => {
    mockConsole.group.mockClear();
    mockConsole.log.mockClear();
    mockConsole.groupEnd.mockClear();
  });

  it('should log actions in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockNext = jest.fn();
    const state = { count: 0 };
    const action = { type: 'TEST_ACTION', payload: { data: 'test' } };

    loggingMiddleware(state, action, mockNext);

    expect(mockConsole.group).toHaveBeenCalledWith('🔄 State Action: TEST_ACTION');
    expect(mockConsole.log).toHaveBeenCalledWith('Previous State:', state);
    expect(mockConsole.log).toHaveBeenCalledWith('Action:', action);
    expect(mockNext).toHaveBeenCalled();
    expect(mockConsole.groupEnd).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const mockNext = jest.fn();
    const state = { count: 0 };
    const action = { type: 'TEST_ACTION' };

    loggingMiddleware(state, action, mockNext);

    expect(mockConsole.group).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});