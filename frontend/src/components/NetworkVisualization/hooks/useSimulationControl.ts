import { useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkNode, NetworkEdge } from '../../../types';

/**
 * Hook for controlling the D3 force simulation
 * Provides explicit start, stop, and restart functionality
 */
export const useSimulationControl = () => {
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkEdge> | null>(null);
  const isSimulationRunningRef = useRef<boolean>(false);
  const alphaTargetRef = useRef<number>(0);

  /**
   * Initialize a new force simulation
   */
  const createSimulation = useCallback((
    nodes: NetworkNode[], 
    edges: NetworkEdge[],
    width: number,
    height: number,
    config: {
      chargeStrength?: number;
      linkDistance?: number;
      collisionRadius?: number;
      alphaDecay?: number;
      velocityDecay?: number;
    } = {}
  ) => {
    // Clear any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Use provided config or sensible defaults
    const {
      chargeStrength = -100,
      linkDistance = 100,
      collisionRadius = 15,
      alphaDecay = 0.02,
      velocityDecay = 0.4
    } = config;

    // Create new simulation with optimal parameters
    const simulation = d3.forceSimulation<NetworkNode>(nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkEdge>(edges)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(0.1))
      .force('charge', d3.forceManyBody()
        .strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(collisionRadius))
      .alphaDecay(alphaDecay)
      .velocityDecay(velocityDecay)
      .alphaTarget(0)  // Set target to 0 so simulation will naturally cool down
      .alphaMin(0.001); // Threshold for considering simulation stabilized

    // Store the simulation reference
    simulationRef.current = simulation;
    isSimulationRunningRef.current = true;

    // Return the simulation for further configuration
    return simulation;
  }, []);

  /**
   * Explicitly start or restart the simulation with a specific alpha
   */
  const startSimulation = useCallback((alpha: number = 0.3) => {
    if (simulationRef.current) {
      console.log(`Starting simulation with alpha: ${alpha}`);
      simulationRef.current.alpha(alpha).restart();
      isSimulationRunningRef.current = true;
    }
  }, []);

  /**
   * Restart the simulation with a predefined alpha value
   */
  const restartSimulation = useCallback(() => {
    if (simulationRef.current) {
      console.log('Restarting simulation');
      // Use a more conservative alpha value to prevent excessive motion
      simulationRef.current.alpha(0.2).restart();
      isSimulationRunningRef.current = true;
    }
  }, []);

  /**
   * Immediately stop the simulation
   */
  const stopSimulation = useCallback(() => {
    if (simulationRef.current) {
      console.log('Stopping simulation');
      // Set alpha target to 0 to allow cooling down
      simulationRef.current.alphaTarget(0);
      // Explicitly stop the simulation
      simulationRef.current.stop();
      isSimulationRunningRef.current = false;
    }
  }, []);

  /**
   * Gradually stop the simulation
   */
  const coolingStop = useCallback((callback?: () => void) => {
    if (simulationRef.current) {
      console.log('Cooling down simulation');
      // Set alpha target to 0
      simulationRef.current.alphaTarget(0);
      
      // Let the simulation cool down naturally
      const checkCooling = () => {
        if (simulationRef.current && simulationRef.current.alpha() < 0.01) {
          simulationRef.current.stop();
          isSimulationRunningRef.current = false;
          if (callback) callback();
          return;
        }
        // Check again in 100ms
        setTimeout(checkCooling, 100);
      };
      
      checkCooling();
    }
  }, []);

  /**
   * Set a static alpha target to maintain constant movement or freeze
   */
  const setAlphaTarget = useCallback((target: number) => {
    if (simulationRef.current) {
      console.log(`Setting alpha target to: ${target}`);
      simulationRef.current.alphaTarget(target);
      alphaTargetRef.current = target;
      
      if (target > 0 && !isSimulationRunningRef.current) {
        simulationRef.current.restart();
        isSimulationRunningRef.current = true;
      }
    }
  }, []);

  /**
   * Heat up the simulation temporarily and then cool down
   */
  const reheatSimulation = useCallback((alpha: number = 0.3, duration: number = 3000) => {
    if (simulationRef.current) {
      console.log(`Reheating simulation for ${duration}ms`);
      const previousTarget = alphaTargetRef.current;
      
      // Set a higher alpha to heat up
      simulationRef.current.alpha(alpha).restart();
      isSimulationRunningRef.current = true;
      
      // After duration, restore previous alpha target
      setTimeout(() => {
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(previousTarget);
          if (previousTarget === 0) {
            coolingStop();
          }
        }
      }, duration);
    }
  }, [coolingStop]);

  /**
   * Check if simulation is currently running
   */
  const isSimulationRunning = useCallback(() => {
    return isSimulationRunningRef.current;
  }, []);

  return {
    simulationRef,
    isSimulationRunning,
    createSimulation,
    startSimulation,
    restartSimulation,
    stopSimulation,
    coolingStop,
    setAlphaTarget,
    reheatSimulation
  };
};