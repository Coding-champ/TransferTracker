import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

export interface D3ContainerConfig {
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  backgroundColor?: string;
  className?: string;
}

export interface D3Container {
  svgRef: React.RefObject<SVGSVGElement>;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
  g: d3.Selection<any, unknown, null, undefined> | null;
  innerWidth: number;
  innerHeight: number;
  clearSvg: () => void;
  appendGroup: (className?: string) => d3.Selection<SVGGElement, unknown, null, undefined>;
}

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

export const useD3Container = (config: D3ContainerConfig): D3Container => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height, margin = defaultMargin, backgroundColor = 'white', className = '' } = config;
  
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const clearSvg = useCallback(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
    }
  }, []);

  const appendGroup = useCallback((groupClassName = '') => {
    if (!svgRef.current) {
      throw new Error('SVG element not ready');
    }
    const svg = d3.select(svgRef.current);
    return svg.append('g')
      .attr('class', groupClassName)
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
  }, [margin.left, margin.top]);

  // Initialize SVG on mount or config change
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.attr('width', width)
       .attr('height', height)
       .attr('class', className)
       .style('background-color', backgroundColor);

  }, [width, height, backgroundColor, className]);

  const svg = svgRef.current ? d3.select(svgRef.current) : null;
  const g = null; // Will be set by appendGroup

  return {
    svgRef,
    svg,
    g,
    innerWidth,
    innerHeight,
    clearSvg,
    appendGroup,
  };
};