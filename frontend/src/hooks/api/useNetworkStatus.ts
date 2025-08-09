/**
 * useNetworkStatus Hook
 * 
 * Real-time network condition monitoring with:
 * - Connection type and quality detection
 * - Adaptive loading strategies based on connection
 * - Bandwidth optimization
 * - Connection quality awareness
 */

import { useState, useEffect, useCallback } from 'react';
import { NetworkStatusOptions, NetworkStatusState } from './types';

/**
 * Hook for monitoring real-time network status and conditions
 * 
 * @param options - Network monitoring options
 * @returns Current network status and quality information
 */
export function useNetworkStatus(options: NetworkStatusOptions = {}): NetworkStatusState {
  const {
    adaptiveLoading = true,
    bandwidthMonitoring = true,
    qualityThreshold = 'medium'
  } = options;

  const [networkState, setNetworkState] = useState<NetworkStatusState>(() => {
    // Initialize with current navigator values if available
    const navigator = window.navigator;
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 100,
      saveData: connection?.saveData || false,
      quality: 'good', // Will be calculated
      lastUpdate: Date.now(),
      monitoring: true
    };
  });

  // Calculate connection quality based on metrics
  const calculateQuality = useCallback((downlink: number, rtt: number, effectiveType: string) => {
    if (effectiveType === 'slow-2g' || downlink < 0.5 || rtt > 2000) {
      return 'poor';
    } else if (effectiveType === '2g' || downlink < 1.5 || rtt > 1000) {
      return 'good';
    } else {
      return 'excellent';
    }
  }, []);

  // Update network state
  const updateNetworkState = useCallback(() => {
    const navigator = window.navigator;
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const newState: Partial<NetworkStatusState> = {
      isOnline: navigator.onLine,
      lastUpdate: Date.now()
    };

    if (connection) {
      newState.connectionType = connection.type || 'unknown';
      newState.effectiveType = connection.effectiveType || '4g';
      newState.downlink = connection.downlink || 10;
      newState.rtt = connection.rtt || 100;
      newState.saveData = connection.saveData || false;
      
      newState.quality = calculateQuality(
        newState.downlink!,
        newState.rtt!,
        newState.effectiveType!
      );
    }

    setNetworkState(prev => ({ ...prev, ...newState }));
  }, [calculateQuality]);

  // Set up network event listeners
  useEffect(() => {
    const handleOnline = () => {
      updateNetworkState();
    };

    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        lastUpdate: Date.now()
      }));
    };

    const handleConnectionChange = () => {
      updateNetworkState();
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const navigator = window.navigator;
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial update
    updateNetworkState();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkState]);

  // Periodic bandwidth monitoring
  useEffect(() => {
    if (!bandwidthMonitoring) return;

    const interval = setInterval(() => {
      // Simple bandwidth test using a small image
      const startTime = Date.now();
      const img = new Image();
      
      img.onload = () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Estimate bandwidth (very rough)
        if (duration > 1000) {
          setNetworkState(prev => ({
            ...prev,
            quality: 'poor',
            lastUpdate: Date.now()
          }));
        } else if (duration > 500) {
          setNetworkState(prev => ({
            ...prev,
            quality: 'good',
            lastUpdate: Date.now()
          }));
        } else {
          setNetworkState(prev => ({
            ...prev,
            quality: 'excellent',
            lastUpdate: Date.now()
          }));
        }
      };

      img.onerror = () => {
        setNetworkState(prev => ({
          ...prev,
          quality: 'poor',
          lastUpdate: Date.now()
        }));
      };

      // Use a small 1x1 pixel transparent image for testing
      img.src = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?t=${Date.now()}`;
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [bandwidthMonitoring]);

  return networkState;
}

export default useNetworkStatus;