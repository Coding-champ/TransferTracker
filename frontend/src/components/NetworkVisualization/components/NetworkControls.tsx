import React from 'react';

interface NetworkControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  isSimulationRunning: boolean;
}

/**
 * Control buttons for manipulating the network visualization
 */
const NetworkControls: React.FC<NetworkControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onStartSimulation,
  onStopSimulation,
  isSimulationRunning
}) => {
  return (
    <div className="absolute left-4 top-4 flex flex-col space-y-2 bg-white bg-opacity-80 p-2 rounded-lg shadow-md">
      {/* Zoom controls */}
      <button
        onClick={onZoomIn}
        className="w-8 h-8 flex items-center justify-center text-lg font-bold bg-white rounded border border-gray-300 hover:bg-gray-100"
        title="Zoom In"
      >
        +
      </button>
      
      <button
        onClick={onZoomOut}
        className="w-8 h-8 flex items-center justify-center text-lg font-bold bg-white rounded border border-gray-300 hover:bg-gray-100"
        title="Zoom Out"
      >
        −
      </button>
      
      <button
        onClick={onResetZoom}
        className="w-8 h-8 flex items-center justify-center text-lg font-bold bg-white rounded border border-gray-300 hover:bg-gray-100"
        title="Reset Zoom"
      >
        ⌂
      </button>
      
      <div className="pt-2 border-t border-gray-300"></div>
      
      {/* Simulation controls */}
      {isSimulationRunning ? (
        <button
          onClick={onStopSimulation}
          className="w-8 h-8 flex items-center justify-center bg-white rounded border border-red-300 text-red-500 hover:bg-red-50"
          title="Stop Simulation"
        >
          ■
        </button>
      ) : (
        <button
          onClick={onStartSimulation}
          className="w-8 h-8 flex items-center justify-center bg-white rounded border border-green-300 text-green-500 hover:bg-green-50"
          title="Start Simulation"
        >
          ▶
        </button>
      )}
    </div>
  );
};

export default NetworkControls;