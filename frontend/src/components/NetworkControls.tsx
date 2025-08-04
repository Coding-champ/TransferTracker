import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

interface NetworkControlsProps {
  svgRef: React.RefObject<SVGSVGElement>;
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  restartSimulation?: () => void;
  isSimulationRunning?: () => boolean;
}

const NetworkControls: React.FC<NetworkControlsProps> = ({ 
  svgRef, 
  zoomRef, 
  restartSimulation,
  isSimulationRunning 
}) => {
  const [isRunning, setIsRunning] = useState(false);

  // Update running state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSimulationRunning) {
        setIsRunning(isSimulationRunning());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isSimulationRunning]);
  const handlePlayPause = () => {
    if (restartSimulation) {
      if (!isRunning) {
        restartSimulation();
        setIsRunning(true);
      }
      // Note: We can't directly stop a running simulation, it will stop naturally when alpha threshold is reached
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy as any, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy as any, 0.67);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform as any, d3.zoomIdentity);
    }
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col space-y-2">
      {/* Play/Pause Control */}
      {restartSimulation && (
        <button
          onClick={handlePlayPause}
          className={`w-9 h-9 border border-gray-300 rounded-md shadow-sm flex items-center justify-center text-lg font-bold ${
            isRunning 
              ? 'bg-green-50 text-green-700 border-green-300' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title={isRunning ? "Simulation Running" : "Start Simulation"}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
      )}
      
      {/* Zoom Controls */}
      <button
        onClick={handleZoomIn}
        className="w-9 h-9 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center justify-center text-lg font-bold text-gray-700"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        className="w-9 h-9 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center justify-center text-lg font-bold text-gray-700"
        title="Zoom Out"
      >
        −
      </button>
      <button
        onClick={handleResetZoom}
        className="w-9 h-9 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center justify-center text-base font-bold text-gray-700"
        title="Reset Zoom"
      >
        ⌂
      </button>
    </div>
  );
};

export default NetworkControls;