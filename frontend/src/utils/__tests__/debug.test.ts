import { debugLog, createPerformanceTimer } from '../debug';

// Mock console methods for testing
const originalConsoleLog = console.log;
const originalNodeEnv = process.env.NODE_ENV;
let consoleLogMock: jest.Mock;

beforeEach(() => {
  consoleLogMock = jest.fn();
  console.log = consoleLogMock;
});

afterEach(() => {
  console.log = originalConsoleLog;
  // Reset NODE_ENV using Object.defineProperty to avoid readonly issues
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: originalNodeEnv,
    writable: true,
    configurable: true
  });
});

// Helper function to set NODE_ENV for testing
const setNodeEnv = (env: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true
  });
};

describe('Debug Utilities', () => {
  describe('debugLog', () => {
    it('should log debug messages in development environment', () => {
      setNodeEnv('development');

      debugLog('Test message');
      expect(consoleLogMock).toHaveBeenCalledWith('[DEBUG] Test message');
    });

    it('should log debug messages with data in development environment', () => {
      setNodeEnv('development');

      const testData = { key: 'value', number: 123 };
      debugLog('Test message with data', testData);
      
      expect(consoleLogMock).toHaveBeenCalledWith('[DEBUG] Test message with data:', testData);
    });

    it('should not log in production environment', () => {
      setNodeEnv('production');

      debugLog('This should not appear');
      expect(consoleLogMock).not.toHaveBeenCalled();

      debugLog('This should not appear either', { data: 'test' });
      expect(consoleLogMock).not.toHaveBeenCalled();
    });

    it('should not log in test environment', () => {
      setNodeEnv('test');

      debugLog('This should not appear in test');
      expect(consoleLogMock).not.toHaveBeenCalled();
    });

    it('should handle various data types', () => {
      setNodeEnv('development');

      debugLog('String data', 'test string');
      debugLog('Number data', 42);
      debugLog('Boolean data', true);
      debugLog('Array data', [1, 2, 3]);
      debugLog('Null data', null);
      debugLog('Undefined data', undefined);

      expect(consoleLogMock).toHaveBeenCalledTimes(6);
      
      // Check that all expected calls were made
      expect(consoleLogMock.mock.calls).toEqual(expect.arrayContaining([
        ['[DEBUG] String data:', 'test string'],
        ['[DEBUG] Number data:', 42],
        ['[DEBUG] Boolean data:', true],
        ['[DEBUG] Array data:', [1, 2, 3]],
        ['[DEBUG] Null data:', null],
        ['[DEBUG] Undefined data:', undefined]
      ]));
    });
  });

  describe('createPerformanceTimer', () => {
    beforeEach(() => {
      // Mock performance.now() for consistent testing
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // start time
        .mockReturnValueOnce(1150); // end time (150ms later)
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a performance timer in development environment', () => {
      setNodeEnv('development');

      const timer = createPerformanceTimer('Test operation');
      expect(typeof timer).toBe('function');

      timer();
      expect(consoleLogMock).toHaveBeenCalledWith('[PERF] Test operation: 150.00ms');
    });

    it('should return no-op function in production environment', () => {
      setNodeEnv('production');

      const timer = createPerformanceTimer('Test operation');
      expect(typeof timer).toBe('function');

      timer();
      expect(consoleLogMock).not.toHaveBeenCalled();
    });

    it('should return no-op function in test environment', () => {
      setNodeEnv('test');

      const timer = createPerformanceTimer('Test operation');
      expect(typeof timer).toBe('function');

      timer();
      expect(consoleLogMock).not.toHaveBeenCalled();
    });

    it('should handle multiple timers with different labels', () => {
      setNodeEnv('development');

      // Reset the mock for individual timer tests
      jest.restoreAllMocks();
      
      // Mock different time intervals for each timer
      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // timer1 start
        .mockReturnValueOnce(2000) // timer2 start  
        .mockReturnValueOnce(1100) // timer1 end (100ms)
        .mockReturnValueOnce(2250); // timer2 end (250ms)

      const timer1 = createPerformanceTimer('Operation 1');
      const timer2 = createPerformanceTimer('Operation 2');

      timer1();
      expect(consoleLogMock).toHaveBeenCalledWith('[PERF] Operation 1: 100.00ms');

      timer2();
      expect(consoleLogMock).toHaveBeenCalledWith('[PERF] Operation 2: 250.00ms');
    });

    it('should format timing correctly', () => {
      setNodeEnv('development');

      // Test various timing scenarios
      const testCases = [
        { start: 1000, end: 1000.1, expected: '0.10ms' },
        { start: 1000, end: 1001, expected: '1.00ms' },
        { start: 1000, end: 1010.567, expected: '10.57ms' },
        { start: 1000, end: 2000, expected: '1000.00ms' }
      ];

      testCases.forEach(({ start, end, expected }, index) => {
        jest.restoreAllMocks();
        jest.spyOn(performance, 'now')
          .mockReturnValueOnce(start)
          .mockReturnValueOnce(end);

        const timer = createPerformanceTimer(`Test ${index}`);
        timer();

        expect(consoleLogMock).toHaveBeenCalledWith(`[PERF] Test ${index}: ${expected}`);
      });
    });
  });

  describe('Integration tests', () => {
    it('should work together for debugging performance operations', () => {
      setNodeEnv('development');

      jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050);

      debugLog('Starting operation', { operation: 'test' });
      const timer = createPerformanceTimer('Test operation');
      
      // Simulate some work
      timer();
      
      debugLog('Operation completed');

      expect(consoleLogMock).toHaveBeenCalledTimes(3);
      expect(consoleLogMock).toHaveBeenNthCalledWith(1, '[DEBUG] Starting operation:', { operation: 'test' });
      expect(consoleLogMock).toHaveBeenNthCalledWith(2, '[PERF] Test operation: 50.00ms');
      expect(consoleLogMock).toHaveBeenNthCalledWith(3, '[DEBUG] Operation completed');
    });

    it('should be silent in production for both debug and performance', () => {
      setNodeEnv('production');

      debugLog('Debug message', { data: 'test' });
      const timer = createPerformanceTimer('Performance test');
      timer();

      expect(consoleLogMock).not.toHaveBeenCalled();
    });
  });
});