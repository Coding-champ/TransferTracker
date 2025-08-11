import { useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { 
  CircularZoomState,
  UseCircularZoomProps 
} from '../types';

export const useCircularZoom = ({
  layout,
  svgRef,
  config,
  onZoomChange
}: UseCircularZoomProps) => {
  
  const [zoomState, setZoomState] = useState<CircularZoomState>({
    level: 1, // Overview
    focusedTier: null,
    focusedLeague: null,
    scale: 1,
    translateX: 0,
    translateY: 0
  });

  // Handle mousewheel zoom
  const handleZoom = useCallback((event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
    if (!layout || !svgRef.current) return;

    const { transform } = event;
    
    // Update zoom state
    const newZoomState: CircularZoomState = {
      ...zoomState,
      scale: transform.k,
      translateX: transform.x,
      translateY: transform.y
    };

    // Determine zoom level based on scale
    if (transform.k <= 1.5) {
      newZoomState.level = 1;
      newZoomState.focusedTier = null;
      newZoomState.focusedLeague = null;
    } else if (transform.k <= 2.5) {
      newZoomState.level = 2;
      newZoomState.focusedLeague = null;
    } else {
      newZoomState.level = 3;
    }

    setZoomState(newZoomState);
    
    // Call onZoomChange to trigger layout recalculation when zoom level changes
    if (onZoomChange) {
      onZoomChange(newZoomState);
    }
    
    // Don't apply visual transform here - let the layout recalculation handle the zoom
  }, [layout, svgRef, onZoomChange, zoomState]);

  // Create zoom behavior
  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 5])
    .on('zoom', handleZoom);

  // Handle zoom level change
  const setZoomLevel = useCallback((level: 1 | 2 | 3, focusedTier?: number, focusedLeague?: string) => {
    if (!layout) return;

    const newZoomState: CircularZoomState = {
      level,
      focusedTier: focusedTier || null,
      focusedLeague: focusedLeague || null,
      scale: level === 1 ? 1 : level === 2 ? 2 : 3,
      translateX: 0,
      translateY: 0
    };

    setZoomState(newZoomState);
    
    // Call onZoomChange to trigger layout recalculation for data-based zoom
    if (onZoomChange) {
      onZoomChange(newZoomState);
    }
  }, [layout, onZoomChange]);

  // Zoom to specific tier
  const zoomToTier = useCallback((tier: number) => {
    setZoomLevel(2, tier);
  }, [setZoomLevel]);

  // Zoom to specific league
  const zoomToLeague = useCallback((league: string) => {
    setZoomLevel(3, undefined, league);
  }, [setZoomLevel]);

  // Reset zoom to overview
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, [setZoomLevel]);

  // Setup zoom behavior
  useEffect(() => {
    if (!svgRef.current || !config.enableZoom) return;

    const svg = d3.select(svgRef.current);
    
    // Apply zoom behavior to SVG
    svg.call(zoomBehavior);

    // Prevent default double-click zoom (we handle rotation double-click)
    svg.on('dblclick.zoom', null);

    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, config.enableZoom, zoomBehavior]);

  // Handle keyboard shortcuts for zoom levels
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!layout) return;

      switch (event.key) {
        case '1':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setZoomLevel(1);
          }
          break;
        case '2':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setZoomLevel(2);
          }
          break;
        case '3':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setZoomLevel(3);
          }
          break;
        case 'Escape':
          resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layout, setZoomLevel, resetZoom]);

  return {
    zoomState,
    setZoomLevel,
    zoomToTier,
    zoomToLeague,
    resetZoom,
    zoomBehavior
  };
};