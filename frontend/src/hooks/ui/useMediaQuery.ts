import { useState, useEffect, useCallback } from 'react';

/**
 * Type for media query result
 */
interface MediaQueryState {
  matches: boolean;
  query: string;
}

/**
 * Enhanced media query hook with TypeScript support
 * 
 * Provides reactive media query matching with:
 * - SSR compatibility
 * - Automatic cleanup
 * - TypeScript support
 * - Multiple query support
 * 
 * @param query - CSS media query string
 * @param defaultValue - Default value for SSR (default: false)
 * @returns Boolean indicating if query matches
 * 
 * @example
 * ```typescript
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 * const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * 
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 * 
 * return <DesktopLayout />;
 * ```
 */
export function useMediaQuery(
  query: string,
  defaultValue: boolean = false
): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // Return default value during SSR
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    // Return actual match state on client
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // Skip if window is not available (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event handler
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook for multiple media queries
 * 
 * @param queries - Object with media query strings
 * @returns Object with boolean values for each query
 * 
 * @example
 * ```typescript
 * const { isMobile, isTablet, isDesktop } = useMediaQueries({
 *   isMobile: '(max-width: 767px)',
 *   isTablet: '(min-width: 768px) and (max-width: 1023px)',
 *   isDesktop: '(min-width: 1024px)'
 * });
 * ```
 */
export function useMediaQueries<T extends Record<string, string>>(
  queries: T
): Record<keyof T, boolean> {
  const [matches, setMatches] = useState<Record<keyof T, boolean>>(() => {
    const initialMatches = {} as Record<keyof T, boolean>;
    
    if (typeof window === 'undefined') {
      // Return false for all queries during SSR
      Object.keys(queries).forEach(key => {
        initialMatches[key as keyof T] = false;
      });
      return initialMatches;
    }

    // Get initial matches
    Object.entries(queries).forEach(([key, query]) => {
      initialMatches[key as keyof T] = window.matchMedia(query).matches;
    });
    
    return initialMatches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueries: Array<{
      key: keyof T;
      mediaQuery: MediaQueryList;
      handler: (event: MediaQueryListEvent) => void;
    }> = [];

    // Set up listeners for each query
    Object.entries(queries).forEach(([key, query]) => {
      const mediaQuery = window.matchMedia(query);
      
      const handler = (event: MediaQueryListEvent) => {
        setMatches(prev => ({
          ...prev,
          [key as keyof T]: event.matches
        }));
      };

      // Add listener
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
      } else {
        mediaQuery.addListener(handler);
      }

      mediaQueries.push({ key, mediaQuery, handler });
    });

    // Cleanup function
    return () => {
      mediaQueries.forEach(({ mediaQuery, handler }) => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handler);
        } else {
          mediaQuery.removeListener(handler);
        }
      });
    };
  }, [queries]);

  return matches;
}

/**
 * Hook for common responsive breakpoints
 * 
 * @param customBreakpoints - Custom breakpoint definitions
 * @returns Object with boolean values for common screen sizes
 */
export function useResponsive(customBreakpoints?: {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  xxl?: string;
}) {
  const defaultBreakpoints = {
    xs: '(max-width: 575px)',
    sm: '(min-width: 576px) and (max-width: 767px)',
    md: '(min-width: 768px) and (max-width: 991px)',
    lg: '(min-width: 992px) and (max-width: 1199px)',
    xl: '(min-width: 1200px) and (max-width: 1399px)',
    xxl: '(min-width: 1400px)',
    ...customBreakpoints
  };

  const breakpoints = useMediaQueries(defaultBreakpoints);

  // Additional utility flags
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLargeScreen = useMediaQuery('(min-width: 1200px)');

  return {
    ...breakpoints,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen
  };
}

/**
 * Hook for detecting user preferences
 * 
 * @returns Object with user preference states
 */
export function useUserPreferences() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  const supportsHover = useMediaQuery('(hover: hover)');
  const supportsPointerFine = useMediaQuery('(pointer: fine)');

  return {
    prefersDarkMode,
    prefersReducedMotion,
    prefersHighContrast,
    supportsHover,
    supportsPointerFine,
    isTouchDevice: !supportsHover && !supportsPointerFine
  };
}

/**
 * Hook for orientation detection
 * 
 * @returns Object with orientation information
 */
export function useOrientation() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return {
    isPortrait,
    isLandscape,
    orientation: isPortrait ? 'portrait' : 'landscape'
  } as const;
}