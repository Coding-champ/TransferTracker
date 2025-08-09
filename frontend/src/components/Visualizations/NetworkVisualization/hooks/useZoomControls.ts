import { useRef, useCallback, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Hook for managing zoom behavior in D3 visualizations
 */
export const useZoomControls = (svgRef: React.RefObject<SVGSVGElement>) => {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  /**
   * Initialize zoom behavior for the SVG element
   */
  const initializeZoom = useCallback((options: {
    zoomGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
    minZoom?: number;
    maxZoom?: number;
    onZoom?: (transform: d3.ZoomTransform) => void;
    onZoomStart?: () => void;
    onZoomEnd?: () => void;
    preventWheelDefault?: boolean;
  } = {}) => {
    if (!svgRef.current) return null;

    const {
      zoomGroup,
      minZoom = 0.1,
      maxZoom = 5,
      onZoom,
      onZoomStart,
      onZoomEnd,
      preventWheelDefault = true
    } = options;

    // Create and configure zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .filter((event) => {
        // Allow zoom on wheel events unless they're from nodes being dragged
        if (event.type === 'wheel') {
          if (preventWheelDefault) event.preventDefault();
          return true;
        }
        
        // For mouse events, check if target is a node (which should be draggable instead)
        if (event.type === 'mousedown') {
          const target = event.target as Element;
          const isNode = target.classList.contains('node') || 
                         target.closest('.node') !== null;
          return !isNode;
        }
        
        return true;
      })
      .on('start', () => {
        if (onZoomStart) onZoomStart();
      })
      .on('zoom', (event) => {
        // Update the transform reference
        transformRef.current = event.transform;
        
        // Apply transform to the zoom group if provided
        if (zoomGroup) {
          zoomGroup.attr('transform', event.transform);
        }
        
        // Call custom zoom handler if provided
        if (onZoom) onZoom(event.transform);
      })
      .on('end', () => {
        if (onZoomEnd) onZoomEnd();
      });

    // Apply zoom behavior to SVG
    const svg = d3.select(svgRef.current);
    svg.call(zoom);
    
    // Store zoom reference
    zoomRef.current = zoom;
    
    return zoom;
  }, [svgRef]);

  /**
   * Clean up zoom behavior when component unmounts
   */
  useEffect(() => {
    const currentSvg = svgRef.current;
    const currentZoom = zoomRef.current;
    
    return () => {
      if (currentSvg && currentZoom) {
        const svg = d3.select(currentSvg);
        svg.on('.zoom', null);
      }
    };
  }, [svgRef]);

  /**
   * Zoom to a specific level
   */
  const zoomTo = useCallback((scale: number, duration: number = 300) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(duration)
      .call(zoomRef.current.scaleTo as any, scale);
  }, [svgRef]);

  /**
   * Zoom in by a factor
   */
  const zoomIn = useCallback((factor: number = 1.5, duration: number = 300) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(duration)
      .call(zoomRef.current.scaleBy as any, factor);
  }, [svgRef]);

  /**
   * Zoom out by a factor
   */
  const zoomOut = useCallback((factor: number = 0.67, duration: number = 300) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(duration)
      .call(zoomRef.current.scaleBy as any, factor);
  }, [svgRef]);

  /**
   * Reset zoom to initial state
   */
  const resetZoom = useCallback((duration: number = 500) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(duration)
      .call(zoomRef.current.transform as any, d3.zoomIdentity);
  }, [svgRef]);

  /**
   * Center and fit content
   */
  const fitContent = useCallback((
    nodeBounds: { x: number, y: number, width: number, height: number },
    padding: number = 40,
    duration: number = 500
  ) => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Calculate scale to fit content
    const scale = Math.min(
      width / (nodeBounds.width + padding * 2),
      height / (nodeBounds.height + padding * 2)
    );
    
    // Calculate transform to center content
    const transform = d3.zoomIdentity
      .translate(
        width / 2 - (nodeBounds.x + nodeBounds.width / 2) * scale,
        height / 2 - (nodeBounds.y + nodeBounds.height / 2) * scale
      )
      .scale(scale);
    
    svg.transition()
      .duration(duration)
      .call(zoomRef.current.transform as any, transform);
  }, [svgRef]);

  return {
    zoomRef,
    transformRef,
    initializeZoom,
    zoomTo,
    zoomIn,
    zoomOut,
    resetZoom,
    fitContent,
    getCurrentTransform: () => transformRef.current
  };
};