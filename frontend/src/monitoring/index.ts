/**
 * Monitoring - Main exports for monitoring components
 * Central export point for all monitoring and dashboard components
 */

import { useState, useEffect } from 'react';
import React from 'react';
import DevDashboard from './DevDashboard';
import PerformanceOverlay from './PerformanceOverlay';

export { default as DevDashboard } from './DevDashboard';
export { default as PerformanceOverlay } from './PerformanceOverlay';
export { default as MigrationProgress } from './MigrationProgress';
export { default as ComponentAnalyzer } from './ComponentAnalyzer';

/**
 * Hook to manage the dev dashboard state
 */
export const useDevDashboard = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + D to toggle dashboard
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
};

/**
 * Provider component for monitoring features
 */

interface MonitoringProviderProps {
  children: React.ReactNode;
  enableOverlay?: boolean;
  enableDashboard?: boolean;
  overlayPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({
  children,
  enableOverlay = process.env.NODE_ENV === 'development',
  enableDashboard = process.env.NODE_ENV === 'development',
  overlayPosition = 'top-right'
}) => {
  const dashboard = useDevDashboard();

  return React.createElement(
    React.Fragment,
    {},
    children,
    enableOverlay && React.createElement(PerformanceOverlay, { position: overlayPosition }),
    enableDashboard && React.createElement(DevDashboard, { isOpen: dashboard.isOpen, onClose: dashboard.close })
  );
};

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).openDashboard = () => {
    // Dispatch a custom event to open the dashboard
    window.dispatchEvent(new CustomEvent('openDashboard'));
  };

  console.log('🔍 Monitoring tools available:');
  console.log('- Ctrl/Cmd + Shift + D: Toggle performance dashboard');
  console.log('- Ctrl/Cmd + Shift + P: Toggle performance overlay');
  console.log('- window.openDashboard() - Open dashboard programmatically');
}