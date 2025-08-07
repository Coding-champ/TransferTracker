import { useState, useCallback, useRef, useEffect } from 'react';
import React from 'react';
import * as d3 from 'd3';

export interface TooltipConfig {
  className?: string;
  offset?: { x: number; y: number };
  followMouse?: boolean;
  delay?: number;
}

export interface TooltipData {
  title?: string;
  content: string;
  position: { x: number; y: number };
}

export interface UseTooltipReturn {
  tooltipData: TooltipData | null;
  showTooltip: (data: Omit<TooltipData, 'position'>, event: MouseEvent | React.MouseEvent) => void;
  hideTooltip: () => void;
  updateTooltipPosition: (event: MouseEvent | React.MouseEvent) => void;
  renderTooltip: () => React.ReactElement | null;
}

const defaultConfig: Required<TooltipConfig> = {
  className: 'tooltip',
  offset: { x: 10, y: -10 },
  followMouse: false,
  delay: 0,
};

export const useTooltip = (config: TooltipConfig = {}): UseTooltipReturn => {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const finalConfig = { ...defaultConfig, ...config };

  const getTooltipPosition = useCallback((event: MouseEvent | React.MouseEvent) => {
    return {
      x: event.clientX + finalConfig.offset.x,
      y: event.clientY + finalConfig.offset.y,
    };
  }, [finalConfig.offset]);

  const showTooltip = useCallback((
    data: Omit<TooltipData, 'position'>, 
    event: MouseEvent | React.MouseEvent
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const showTooltipImmediate = () => {
      const position = getTooltipPosition(event);
      setTooltipData({ ...data, position });
    };

    if (finalConfig.delay > 0) {
      timeoutRef.current = setTimeout(showTooltipImmediate, finalConfig.delay);
    } else {
      showTooltipImmediate();
    }
  }, [getTooltipPosition, finalConfig.delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setTooltipData(null);
  }, []);

  const updateTooltipPosition = useCallback((event: MouseEvent | React.MouseEvent) => {
    if (tooltipData && finalConfig.followMouse) {
      const position = getTooltipPosition(event);
      setTooltipData(prev => prev ? { ...prev, position } : null);
    }
  }, [tooltipData, finalConfig.followMouse, getTooltipPosition]);

  const renderTooltip = useCallback((): React.ReactElement | null => {
    if (!tooltipData) return null;

    return React.createElement('div', {
      className: `fixed z-50 pointer-events-none bg-black text-white text-sm rounded px-2 py-1 shadow-lg ${finalConfig.className}`,
      style: {
        left: tooltipData.position.x,
        top: tooltipData.position.y,
        transform: 'translate(-50%, -100%)',
      },
    }, [
      tooltipData.title && React.createElement('div', {
        key: 'title',
        className: 'font-semibold border-b border-gray-600 pb-1 mb-1'
      }, tooltipData.title),
      React.createElement('div', {
        key: 'content',
        style: { whiteSpace: 'pre-line' }
      }, tooltipData.content)
    ].filter(Boolean));
  }, [tooltipData, finalConfig.className]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    tooltipData,
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
    renderTooltip,
  };
};

// D3-specific tooltip hook for SVG elements
export const useD3Tooltip = (svgSelection: d3.Selection<SVGSVGElement, unknown, null, undefined> | null) => {
  const createTooltip = useCallback((content: string | string[]) => {
    if (!svgSelection) return null;

    const tooltip = svgSelection.append('g')
      .attr('class', 'tooltip')
      .style('pointer-events', 'none');

    const rect = tooltip.append('rect')
      .attr('fill', 'black')
      .attr('opacity', 0.9)
      .attr('rx', 4)
      .attr('ry', 4);

    const text = tooltip.append('text')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('text-anchor', 'middle')
      .attr('y', -5);

    // Handle single string or array of strings
    const lines = Array.isArray(content) ? content : [content];
    lines.forEach((line, i) => {
      text.append('tspan')
        .attr('x', 0)
        .attr('dy', i === 0 ? 0 : 16)
        .text(line);
    });

    // Size the background rectangle to fit the text
    const bbox = text.node()!.getBBox();
    rect.attr('x', bbox.x - 4)
        .attr('y', bbox.y - 4)
        .attr('width', bbox.width + 8)
        .attr('height', bbox.height + 8);

    return {
      tooltip,
      move: (x: number, y: number) => {
        tooltip.attr('transform', `translate(${x}, ${y})`);
      },
      remove: () => {
        tooltip.remove();
      }
    };
  }, [svgSelection]);

  const removeAllTooltips = useCallback(() => {
    if (svgSelection) {
      svgSelection.selectAll('.tooltip').remove();
    }
  }, [svgSelection]);

  return {
    createTooltip,
    removeAllTooltips,
  };
};