import { useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { 
  CircularZoomState,
  UseCircularZoomProps 
} from '../types';
import { createZoomBehavior } from '../../shared/utils/d3-helpers';
import { zoomTo } from '../../shared/utils/animation-utils';

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

  // Create zoom behavior
  const zoomBehavior = createZoomBehavior([[0.5, 0.5], [5, 5]]);

  // Handle zoom level change
  const setZoomLevel = useCallback((level: 1 | 2 | 3, focusedTier?: number, focusedLeague?: string) => {
    if (!layout || !svgRef.current) return;

    const newZoomState: CircularZoomState = {
      level,
      focusedTier: focusedTier || null,
      focusedLeague: focusedLeague || null,
      scale: level === 1 ? 1 : level === 2 ? 2 : 3,
      translateX: 0,
      translateY: 0
    };

    let targetTransform: d3.ZoomTransform;
    const svg = d3.select(svgRef.current);

    switch (level) {
      case 1: // Overview - show all tiers
        targetTransform = d3.zoomIdentity;
        break;
        
      case 2: // Tier Focus - focus on specific tier
        if (focusedTier !== undefined) {
          const tier = layout.tiers.find(t => t.tier === focusedTier);
          if (tier) {
            const scale = Math.min(config.width, config.height) / (tier.radius * 2.5);
            targetTransform = d3.zoomIdentity
              .translate(config.width / 2, config.height / 2)
              .scale(scale)
              .translate(-layout.centerX, -layout.centerY);
            newZoomState.scale = scale;
          } else {
            targetTransform = d3.zoomIdentity.scale(2);
            newZoomState.scale = 2;
          }
        } else {
          targetTransform = d3.zoomIdentity.scale(2);
          newZoomState.scale = 2;
        }
        break;
        
      case 3: // League Details - focus on specific league nodes
        if (focusedLeague) {
          const leagueNodes = layout.nodes.filter(n => n.league === focusedLeague);
          if (leagueNodes.length > 0) {
            // Calculate bounding box of league nodes
            const xExtent = d3.extent(leagueNodes, d => d.x) as [number, number];
            const yExtent = d3.extent(leagueNodes, d => d.y) as [number, number];
            
            const centerX = (xExtent[0] + xExtent[1]) / 2;
            const centerY = (yExtent[0] + yExtent[1]) / 2;
            const width = xExtent[1] - xExtent[0];
            const height = yExtent[1] - yExtent[0];
            
            const scale = Math.min(
              config.width / (width * 1.5),
              config.height / (height * 1.5),
              4 // Max scale
            );
            
            targetTransform = d3.zoomIdentity
              .translate(config.width / 2, config.height / 2)
              .scale(scale)
              .translate(-centerX, -centerY);
            newZoomState.scale = scale;
          } else {
            targetTransform = d3.zoomIdentity.scale(3);
            newZoomState.scale = 3;
          }
        } else {
          targetTransform = d3.zoomIdentity.scale(3);
          newZoomState.scale = 3;
        }
        break;
        
      default:
        targetTransform = d3.zoomIdentity;
    }

    // Apply zoom transformation with animation
    zoomTo(svg, zoomBehavior, targetTransform, { 
      duration: config.animationDuration 
    });

    setZoomState(newZoomState);
    
    if (onZoomChange) {
      onZoomChange(newZoomState);
    }
  }, [layout, svgRef, config, zoomBehavior, onZoomChange]);

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
    
    if (onZoomChange) {
      onZoomChange(newZoomState);
    }

    // Apply transform to visualization group
    const svg = d3.select(svgRef.current);
    svg.select('.visualization-group')
       .attr('transform', transform.toString());
  }, [layout, svgRef, zoomState, onZoomChange]);

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
    
    // Configure zoom behavior
    zoomBehavior.on('zoom', handleZoom);
    
    // Apply zoom behavior to SVG
    svg.call(zoomBehavior);

    // Prevent default double-click zoom (we handle rotation double-click)
    svg.on('dblclick.zoom', null);

    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef, config.enableZoom, zoomBehavior, handleZoom]);

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