/**
 * Debug Utilities
 * Provides development-only logging and performance monitoring utilities
 */

/**
 * Development-only debug logging
 * @param message - Debug message to log
 * @param data - Optional data to log alongside the message
 */
export function debugLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (arguments.length > 1) {
      console.log(`[DEBUG] ${message}:`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Creates a performance timer for measuring execution time
 * @param label - Label for the performance measurement
 * @returns Function to call when measurement should end (development only)
 */
export const createPerformanceTimer = (label: string): (() => void) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
    };
  }
  return () => {}; // No-op in production
};