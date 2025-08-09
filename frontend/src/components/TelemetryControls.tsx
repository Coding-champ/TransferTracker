/**
 * Telemetry Control Panel - Simple UI for enabling/disabling telemetry
 * Provides user-friendly controls for performance monitoring
 */

import React, { useState, useEffect } from 'react';
import { telemetryConfig, type TelemetryConfig } from '../utils/telemetry/config';

interface TelemetryControlsProps {
  className?: string;
}

export const TelemetryControls: React.FC<TelemetryControlsProps> = ({ className = '' }) => {
  const [config, setConfig] = useState<TelemetryConfig>(telemetryConfig.getConfig());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update config state when it changes
    const updateConfig = () => setConfig(telemetryConfig.getConfig());
    
    // Listen for config changes (simple polling for now)
    const interval = setInterval(updateConfig, 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleToggleTelemetry = () => {
    if (config.enabled) {
      telemetryConfig.disable();
    } else {
      telemetryConfig.enable();
    }
  };

  const handleEnableLowImpact = () => {
    telemetryConfig.enableLowImpact();
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        title="Toggle Telemetry Controls"
      >
        📊 {config.enabled ? 'ON' : 'OFF'}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Performance Telemetry</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${config.enabled ? 'text-green-600' : 'text-red-600'}`}>
                {config.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {/* Controls */}
            <div className="space-y-2">
              <button
                onClick={handleToggleTelemetry}
                className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                  config.enabled 
                    ? 'bg-red-100 hover:bg-red-200 text-red-800' 
                    : 'bg-green-100 hover:bg-green-200 text-green-800'
                }`}
              >
                {config.enabled ? 'Disable Telemetry' : 'Enable Telemetry'}
              </button>
              
              <button
                onClick={handleEnableLowImpact}
                className="w-full px-3 py-2 rounded text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
              >
                Enable Low-Impact Mode
              </button>
            </div>
            
            {config.enabled && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Memory tracking: {config.dataCollection.memoryTracking ? '✓' : '✗'}</div>
                  <div>Render tracking: {config.dataCollection.renderTracking ? '✓' : '✗'}</div>
                  <div>Data collection: {config.intervals.dataCollection / 1000}s</div>
                  <div>Max metrics: {config.limits.maxMetrics}</div>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
              <div>Dashboard: Ctrl+Shift+D</div>
              <div>Console: window.telemetryConfig</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelemetryControls;