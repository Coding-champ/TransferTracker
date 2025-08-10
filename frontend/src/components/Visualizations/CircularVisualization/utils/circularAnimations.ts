import * as d3 from 'd3';
import { CircularNode, CircularArc, CircularLayout } from '../types';
import { 
  staggeredFadeIn,
  AnimationConfig 
} from '../../shared/utils/animation-utils';

// Simple rotation function
const rotate = (
  selection: d3.Selection<any, any, any, any>,
  fromAngle: number,
  toAngle: number,
  centerX: number = 0,
  centerY: number = 0,
  config: AnimationConfig = {}
) => {
  const { duration = 500, ease = d3.easeLinear } = config;
  
  return selection
    .style('transform-origin', `${centerX}px ${centerY}px`)
    .style('transform', `rotate(${fromAngle}deg)`)
    .transition()
    .duration(duration)
    .ease(ease)
    .style('transform', `rotate(${toAngle}deg)`);
};

/**
 * Animates the entire circular layout rotation
 */
export const animateRotation = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fromAngle: number,
  toAngle: number,
  centerX: number,
  centerY: number,
  config: AnimationConfig = {}
) => {
  const visualizationGroup = svg.select('.visualization-group');
  
  return rotate(
    visualizationGroup,
    fromAngle,
    toAngle,
    centerX,
    centerY,
    { duration: 800, ease: d3.easeBackOut, ...config }
  );
};

/**
 * Animates nodes appearing in their circular positions
 */
export const animateNodesEnter = (
  nodeSelection: d3.Selection<SVGCircleElement, CircularNode, any, any>,
  config: AnimationConfig = {}
) => {
  return staggeredFadeIn(
    nodeSelection,
    50, // 50ms stagger between nodes
    { duration: 600, ease: d3.easeBackOut, ...config }
  ).attr('r', 0)
   .transition()
   .duration(600)
   .delay((d, i) => i * 50 + (config.delay || 0))
   .ease(d3.easeBackOut)
   .attr('r', d => d.originalData ? 
     Math.max(4, Math.log(d.originalData.stats.transfersIn + d.originalData.stats.transfersOut + 1) * 3) : 8
   );
};

/**
 * Animates nodes exiting
 */
export const animateNodesExit = (
  nodeSelection: d3.Selection<SVGCircleElement, CircularNode, any, any>,
  config: AnimationConfig = {}
) => {
  return nodeSelection
    .transition()
    .duration(300)
    .ease(d3.easeBackIn)
    .attr('r', 0)
    .style('opacity', 0)
    .remove();
};

/**
 * Animates node position updates
 */
export const animateNodePositions = (
  nodeSelection: d3.Selection<SVGCircleElement, CircularNode, any, any>,
  config: AnimationConfig = {}
) => {
  return nodeSelection
    .transition()
    .duration(800)
    .ease(d3.easeBackInOut)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
};

/**
 * Animates arcs appearing
 */
export const animateArcsEnter = (
  arcSelection: d3.Selection<SVGPathElement, CircularArc, any, any>,
  config: AnimationConfig = {}
) => {
  return arcSelection
    .style('opacity', 0)
    .attr('stroke-dasharray', function() {
      const totalLength = (this as SVGPathElement).getTotalLength();
      return `${totalLength} ${totalLength}`;
    })
    .attr('stroke-dashoffset', function() {
      return (this as SVGPathElement).getTotalLength();
    })
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .delay((d, i) => i * 20)
    .style('opacity', 0.6)
    .attr('stroke-dashoffset', 0)
    .on('end', function() {
      d3.select(this).attr('stroke-dasharray', null);
    });
};

/**
 * Animates tier circles appearing
 */
export const animateTierCircles = (
  tierSelection: d3.Selection<SVGCircleElement, any, any, any>,
  config: AnimationConfig = {}
) => {
  return tierSelection
    .attr('r', 0)
    .style('opacity', 0)
    .transition()
    .duration(800)
    .ease(d3.easeBackOut)
    .delay((d, i) => i * 100)
    .attr('r', d => d.radius)
    .style('opacity', 0.3);
};

/**
 * Animates zoom level transitions
 */
export const animateZoomTransition = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  transform: d3.ZoomTransform,
  config: AnimationConfig = {}
) => {
  const visualizationGroup = svg.select('.visualization-group');
  
  return visualizationGroup
    .transition()
    .duration(1000)
    .ease(d3.easeBackInOut)
    .attr('transform', transform.toString());
};

/**
 * Highlight animation for selected nodes
 */
export const animateNodeHighlight = (
  node: d3.Selection<SVGCircleElement, CircularNode, any, any>,
  highlight: boolean = true,
  config: AnimationConfig = {}
) => {
  const duration = 300;
  
  if (highlight) {
    return node
      .transition()
      .duration(duration)
      .ease(d3.easeBackOut)
      .attr('stroke-width', 4)
      .attr('stroke', '#fbbf24')
      .attr('r', function() {
        const currentR = +d3.select(this).attr('r');
        return currentR * 1.5;
      });
  } else {
    return node
      .transition()
      .duration(duration)
      .ease(d3.easeBackOut)
      .attr('stroke-width', 2)
      .attr('stroke', 'white')
      .attr('r', function(d) {
        return d.originalData ? 
          Math.max(4, Math.log(d.originalData.stats.transfersIn + d.originalData.stats.transfersOut + 1) * 3) : 8;
      });
  }
};

/**
 * Pulse animation for active elements
 */
export const animatePulse = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  const pulse = () => {
    selection
      .transition()
      .duration(800)
      .ease(d3.easeSinInOut)
      .style('opacity', 0.3)
      .transition()
      .duration(800)
      .ease(d3.easeSinInOut)
      .style('opacity', 1)
      .on('end', pulse);
  };
  
  pulse();
};

/**
 * Enhanced league filter animation with glow effect
 */
export const animateFilterTransition = (
  layout: CircularLayout,
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  filteredLeague?: string,
  config: AnimationConfig = {}
) => {
  const nodes = svg.selectAll('.club-node');
  const arcs = svg.selectAll('.transfer-arc');
  
  if (filteredLeague) {
    // Fade out and gray out non-matching elements
    nodes
      .filter((d: any) => d.league !== filteredLeague)
      .transition()
      .duration(500)
      .style('opacity', 0.15)
      .attr('fill', '#9ca3af') // Gray color
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1);
    
    // Add prominent glow effect to selected league nodes
    nodes
      .filter((d: any) => d.league === filteredLeague)
      .transition()
      .duration(500)
      .style('opacity', 1)
      .attr('stroke', '#fbbf24') // Golden ring
      .attr('stroke-width', 6) // Thicker ring
      .style('filter', 'drop-shadow(0 0 8px #fbbf24) drop-shadow(0 0 16px #fbbf24)')
      .attr('r', function(d: any) {
        const currentR = +d3.select(this).attr('r');
        return currentR * 1.3; // Slightly larger size
      });
    
    // Filter arcs - completely hide non-relevant ones
    arcs
      .filter((d: any) => d.source.league !== filteredLeague && d.target.league !== filteredLeague)
      .transition()
      .duration(500)
      .style('opacity', 0.02)
      .attr('stroke', '#e5e7eb');
      
    // Highlight relevant arcs with glow
    arcs
      .filter((d: any) => d.source.league === filteredLeague || d.target.league === filteredLeague)
      .transition()
      .duration(500)
      .style('opacity', 0.9)
      .style('filter', 'drop-shadow(0 0 4px #fbbf24)');
  } else {
    // Reset all elements with smooth transitions
    nodes
      .transition()
      .duration(500)
      .style('opacity', 1)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('filter', 'none')
      .attr('fill', function(d: any) {
        // Restore original color from the data
        const uniqueLeagues = Array.from(new Set(layout.nodes.map(node => node.league)));
        const leagueColorScale = d3.scaleOrdinal(d3.schemeSet3).domain(uniqueLeagues);
        return leagueColorScale(d.league) as string;
      })
      .attr('r', function(d: any) {
        // Reset to original size
        const transferCount = d.transferCount || 1;
        const sizeScale = d3.scaleLinear().domain([1, 10]).range([4, 12]);
        return sizeScale(transferCount);
      });
    
    arcs
      .transition()
      .duration(500)
      .style('opacity', 0.6)
      .style('filter', 'none')
      .attr('stroke', function(d: any) {
        // Restore original arc color
        const valueExtent = d3.extent(layout.arcs, arc => arc.value) as [number, number];
        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain(valueExtent);
        return colorScale(d.value);
      });
  }
};

/**
 * Spring-loaded hover animation
 */
export const animateHover = (
  element: d3.Selection<any, any, any, any>,
  isHovered: boolean,
  config: AnimationConfig = {}
) => {
  if (isHovered) {
    return element
      .transition()
      .duration(200)
      .ease(d3.easeBackOut.overshoot(1.7))
      .style('transform', 'scale(1.3)')
      .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');
  } else {
    return element
      .transition()
      .duration(300)
      .ease(d3.easeBackOut)
      .style('transform', 'scale(1)')
      .style('filter', 'none');
  }
};

/**
 * Smooth arc width animation based on transfer volume
 */
export const animateArcWidth = (
  arcSelection: d3.Selection<SVGPathElement, CircularArc, any, any>,
  config: AnimationConfig = {}
) => {
  return arcSelection
    .transition()
    .duration(600)
    .ease(d3.easeBackInOut)
    .attr('stroke-width', d => {
      // Calculate width based on transfer value
      const minWidth = 1;
      const maxWidth = 8;
      const logValue = Math.log(d.value / 1000000 + 1);
      return Math.max(minWidth, Math.min(maxWidth, logValue * 2));
    });
};

/**
 * Creates a breathing animation for tier circles
 */
export const animateBreathing = (
  tierSelection: d3.Selection<SVGCircleElement, any, any, any>,
  config: AnimationConfig = {}
) => {
  const breathe = () => {
    tierSelection
      .transition()
      .duration(3000)
      .ease(d3.easeSinInOut)
      .attr('stroke-width', 3)
      .transition()
      .duration(3000)
      .ease(d3.easeSinInOut)
      .attr('stroke-width', 1)
      .on('end', breathe);
  };
  
  breathe();
};

/**
 * Animation for layout mode changes (e.g., changing from tier-based to league-based)
 */
export const animateLayoutChange = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  fromLayout: CircularLayout,
  toLayout: CircularLayout,
  config: AnimationConfig = {}
) => {
  const duration = 1200;
  
  // Animate node positions
  const nodes = svg.selectAll('.club-node');
  nodes
    .data(toLayout.nodes, (d: any) => d.id)
    .transition()
    .duration(duration)
    .ease(d3.easeBackInOut)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
  
  // Re-draw arcs with new positions
  const arcs = svg.selectAll('.transfer-arc');
  arcs
    .data(toLayout.arcs, (d: any) => `${d.source.id}-${d.target.id}`)
    .transition()
    .duration(duration)
    .ease(d3.easeBackInOut)
    .attr('d', d => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 0.7;
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });
};

/**
 * Creates a ripple effect animation from a point
 */
export const animateRipple = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  centerX: number,
  centerY: number,
  maxRadius: number = 100,
  config: AnimationConfig = {}
) => {
  const ripple = svg.append('circle')
    .attr('cx', centerX)
    .attr('cy', centerY)
    .attr('r', 0)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2)
    .style('opacity', 1);
  
  ripple
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr('r', maxRadius)
    .style('opacity', 0)
    .on('end', function() {
      d3.select(this).remove();
    });
};