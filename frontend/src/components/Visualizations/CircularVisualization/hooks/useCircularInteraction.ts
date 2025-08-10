import { useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { 
  CircularInteractionState,
  CircularNode,
  CircularArc,
  UseCircularInteractionProps 
} from '../types';
import { snapToAngle, getAngleBetweenPoints } from '../../shared/utils/d3-helpers';
import { useTooltip } from '../../shared/hooks/useTooltip';

export const useCircularInteraction = ({
  layout,
  svgRef,
  config,
  onNodeClick,
  onLeagueFilter,
  onRotationChange
}: UseCircularInteractionProps) => {
  
  const [interactionState, setInteractionState] = useState<CircularInteractionState>({
    hoveredNode: null,
    hoveredArc: null,
    selectedNode: null,
    selectedLeague: null,
    isDragging: false,
    rotation: 0
  });

  const tooltip = useTooltip({
    delay: 300,
    followMouse: true
  });

  // Handle node hover
  const handleNodeMouseOver = useCallback((node: CircularNode, event: MouseEvent) => {
    setInteractionState(prev => ({ ...prev, hoveredNode: node }));
    
    const tooltipContent = `${node.name}\nLeague: ${node.league}\nTier: ${node.tier}\nTransfers: ${node.transferCount}\nTotal Value: €${(node.totalValue / 1000000).toFixed(1)}M`;

    tooltip.showTooltip({
      title: 'Club Details',
      content: tooltipContent
    }, event);
  }, [tooltip]);

  const handleNodeMouseOut = useCallback(() => {
    setInteractionState(prev => ({ ...prev, hoveredNode: null }));
    tooltip.hideTooltip();
  }, [tooltip]);

  // Handle node click
  const handleNodeClick = useCallback((node: CircularNode) => {
    setInteractionState(prev => ({ 
      ...prev, 
      selectedNode: node,
      selectedLeague: node.league
    }));
    
    if (onNodeClick) {
      onNodeClick(node);
    }
    
    if (onLeagueFilter) {
      onLeagueFilter(node.league);
    }
  }, [onNodeClick, onLeagueFilter]);

  // Handle arc hover
  const handleArcMouseOver = useCallback((arc: CircularArc, event: MouseEvent) => {
    setInteractionState(prev => ({ ...prev, hoveredArc: arc }));
    
    const tooltipContent = `${arc.source.name} → ${arc.target.name}\nTransfers: ${arc.count}\nTotal Value: €${(arc.value / 1000000).toFixed(1)}M\nType: ${arc.type}`;

    tooltip.showTooltip({
      title: 'Transfer Flow',
      content: tooltipContent
    }, event);
  }, [tooltip]);

  const handleArcMouseOut = useCallback(() => {
    setInteractionState(prev => ({ ...prev, hoveredArc: null }));
    tooltip.hideTooltip();
  }, [tooltip]);

  // Handle rotation drag
  const handleRotationStart = useCallback((event: MouseEvent) => {
    if (!layout || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const centerX = layout.centerX + rect.left;
    const centerY = layout.centerY + rect.top;
    const startAngle = getAngleBetweenPoints(
      { x: centerX, y: centerY },
      { x: event.clientX, y: event.clientY }
    );
    
    setInteractionState(prev => ({ ...prev, isDragging: true }));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = getAngleBetweenPoints(
        { x: centerX, y: centerY },
        { x: moveEvent.clientX, y: moveEvent.clientY }
      );
      
      const deltaAngle = currentAngle - startAngle;
      const newRotation = interactionState.rotation + deltaAngle;
      
      setInteractionState(prev => ({ ...prev, rotation: newRotation }));
      
      if (onRotationChange) {
        onRotationChange(newRotation);
      }
    };

    const handleMouseUp = () => {
      setInteractionState(prev => {
        const snappedRotation = config.snapAngle > 0 
          ? snapToAngle(prev.rotation, config.snapAngle)
          : prev.rotation;
        
        if (onRotationChange && snappedRotation !== prev.rotation) {
          onRotationChange(snappedRotation);
        }
        
        return {
          ...prev,
          isDragging: false,
          rotation: snappedRotation
        };
      });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [layout, svgRef, config.snapAngle, interactionState.rotation, onRotationChange]);

  // Handle double-click to reset rotation
  const handleDoubleClick = useCallback(() => {
    setInteractionState(prev => ({ ...prev, rotation: 0 }));
    if (onRotationChange) {
      onRotationChange(0);
    }
  }, [onRotationChange]);

  // Setup event listeners
  useEffect(() => {
    if (!svgRef.current || !layout) return;

    const svg = d3.select(svgRef.current);
    
    // Clear existing listeners
    svg.selectAll('*').on('mouseover', null)
                     .on('mouseout', null)
                     .on('click', null);

    // Add node event listeners with enhanced interactions
    svg.selectAll('.club-node')
       .on('mouseover', function(event, d) {
         const node = d as CircularNode;
         const currentNode = d3.select(this);
         const currentRadius = +currentNode.attr('r');
         
         // Scale node to 1.2x size (not 1.3x to be more subtle)
         currentNode.transition()
           .duration(200)
           .attr('r', currentRadius * 1.2)
           .attr('stroke-width', 3);
         
         // Highlight all transfer lines connected to this node
         svg.selectAll('.transfer-arc')
           .transition()
           .duration(200)
           .attr('opacity', function(arcData: any) {
             const arc = arcData as CircularArc;
             return (arc.source.id === node.id || arc.target.id === node.id) ? 1 : 0.1;
           })
           .attr('stroke-width', function(arcData: any) {
             const arc = arcData as CircularArc;
             const baseWidth = Math.max(1, Math.log(arc.value / 1000000 + 1) * 2);
             return (arc.source.id === node.id || arc.target.id === node.id) ? baseWidth * 1.5 : baseWidth;
           });
         
         // Dim other nodes
         svg.selectAll('.club-node')
           .filter(function() { return this !== currentNode.node(); })
           .transition()
           .duration(200)
           .attr('opacity', 0.3);
         
         handleNodeMouseOver(node, event);
       })
       .on('mouseout', function(event, d) {
         const currentNode = d3.select(this);
         const currentRadius = +currentNode.attr('r');
         
         // Reset node size
         currentNode.transition()
           .duration(200)
           .attr('r', currentRadius / 1.2)
           .attr('stroke-width', 2);
         
         // Reset all transfer lines
         svg.selectAll('.transfer-arc')
           .transition()
           .duration(200)
           .attr('opacity', 0.6)
           .attr('stroke-width', function(arcData: any) {
             const arc = arcData as CircularArc;
             return Math.max(1, Math.log(arc.value / 1000000 + 1) * 2);
           });
         
         // Reset other nodes
         svg.selectAll('.club-node')
           .transition()
           .duration(200)
           .attr('opacity', 1);
         
         handleNodeMouseOut();
       })
       .on('click', function(event, d) {
         const node = d as CircularNode;
         event.stopPropagation();
         handleNodeClick(node);
       });

    // Add arc event listeners
    svg.selectAll('.transfer-arc')
       .on('mouseover', function(event, d) {
         d3.select(this).transition().duration(200).attr('opacity', 1);
         handleArcMouseOver(d as any, event);
       })
       .on('mouseout', function() {
         d3.select(this).transition().duration(200).attr('opacity', 0.6);
         handleArcMouseOut();
       });

    // Add rotation drag listeners
    if (config.enableRotation) {
      svg.on('mousedown', function(event) {
        // Only start rotation if clicking on empty space
        if (event.target === this) {
          handleRotationStart(event);
        }
      })
      .on('dblclick', handleDoubleClick);
    }

    return () => {
      svg.selectAll('*').on('mouseover', null)
                       .on('mouseout', null)
                       .on('click', null);
      svg.on('mousedown', null).on('dblclick', null);
    };
  }, [layout, svgRef, config.enableRotation, handleNodeMouseOver, handleNodeMouseOut, 
      handleNodeClick, handleArcMouseOver, handleArcMouseOut, handleRotationStart, handleDoubleClick]);

  // Handle mouse move for tooltip following
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      tooltip.updateTooltipPosition(event);
    };

    if (interactionState.hoveredNode || interactionState.hoveredArc) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [interactionState.hoveredNode, interactionState.hoveredArc, tooltip]);

  return {
    interactionState,
    setInteractionState,
    tooltip: tooltip.renderTooltip(),
    // Expose handlers for manual use if needed
    handleNodeMouseOver,
    handleNodeMouseOut,
    handleNodeClick,
    handleArcMouseOver,
    handleArcMouseOut
  };
};