import { NetworkNode } from '../../../types';

export interface CircularPosition {
  x: number;
  y: number;
  angle: number;
}

/**
 * Groups network nodes by their tier
 */
export const groupNodesByTier = (nodes: NetworkNode[]): Map<number, NetworkNode[]> => {
  return nodes.reduce((groups, node) => {
    const tier = node.leagueTier || 1;
    if (!groups.has(tier)) {
      groups.set(tier, []);
    }
    groups.get(tier)!.push(node);
    return groups;
  }, new Map<number, NetworkNode[]>());
};

/**
 * Calculates circular positions for a given number of nodes
 */
export const calculateCircularPositions = (
  nodeCount: number,
  radius: number,
  centerX: number,
  centerY: number,
  rotationOffset: number = 0
): CircularPosition[] => {
  if (nodeCount === 0) return [];
  
  const angleStep = (2 * Math.PI) / nodeCount;
  const rotationRadians = (rotationOffset * Math.PI) / 180;
  
  return Array.from({ length: nodeCount }, (_, index) => {
    const angle = index * angleStep + rotationRadians;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return {
      x,
      y,
      angle: (angle * 180) / Math.PI
    };
  });
};

/**
 * Calculates optimal radius distribution for multiple tiers
 */
export const calculateTierRadii = (
  tierCount: number,
  minRadius: number,
  maxRadius: number,
  distribution: 'linear' | 'exponential' | 'logarithmic' = 'linear'
): number[] => {
  if (tierCount <= 0) return [];
  if (tierCount === 1) return [minRadius];
  
  const radii: number[] = [];
  
  switch (distribution) {
    case 'linear':
      const step = (maxRadius - minRadius) / (tierCount - 1);
      for (let i = 0; i < tierCount; i++) {
        radii.push(minRadius + i * step);
      }
      break;
      
    case 'exponential':
      for (let i = 0; i < tierCount; i++) {
        const t = i / (tierCount - 1);
        const exponentialT = Math.pow(t, 2);
        radii.push(minRadius + exponentialT * (maxRadius - minRadius));
      }
      break;
      
    case 'logarithmic':
      for (let i = 0; i < tierCount; i++) {
        const t = i / (tierCount - 1);
        const logT = Math.log(1 + t * (Math.E - 1)) / Math.log(Math.E);
        radii.push(minRadius + logT * (maxRadius - minRadius));
      }
      break;
  }
  
  return radii;
};

/**
 * Calculates the optimal spacing angle between nodes to avoid overlap
 */
export const calculateMinimumSpacing = (
  nodeRadius: number,
  circleRadius: number
): number => {
  // Calculate minimum angle needed to prevent node overlap
  const chordLength = 2 * nodeRadius;
  const angle = 2 * Math.asin(chordLength / (2 * circleRadius));
  return (angle * 180) / Math.PI;
};

/**
 * Distributes nodes evenly with optimal spacing
 */
export const distributeNodesWithSpacing = (
  nodeCount: number,
  nodeRadius: number,
  circleRadius: number
): { canFit: boolean; recommendedRadius?: number; spacing: number } => {
  const minSpacing = calculateMinimumSpacing(nodeRadius, circleRadius);
  const totalAngleNeeded = nodeCount * minSpacing;
  
  if (totalAngleNeeded <= 360) {
    return {
      canFit: true,
      spacing: 360 / nodeCount
    };
  } else {
    // Calculate recommended radius to fit all nodes
    const recommendedRadius = (nodeCount * nodeRadius) / Math.PI;
    return {
      canFit: false,
      recommendedRadius,
      spacing: minSpacing
    };
  }
};

/**
 * Calculates arc path for connecting two circular points
 */
export const calculateArcPath = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  curvature: number = 0.7
): string => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * curvature;
  
  return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
};

/**
 * Calculates Bezier curve path for smoother arcs
 */
export const calculateBezierArcPath = (
  source: { x: number; y: number },
  target: { x: number; y: number },
  centerX: number,
  centerY: number,
  curvature: number = 0.3
): string => {
  // Calculate control point based on center and curvature
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  
  // Vector from center to midpoint
  const toCenterX = midX - centerX;
  const toCenterY = midY - centerY;
  
  // Normalize and apply curvature
  const length = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
  const normalizedX = toCenterX / length;
  const normalizedY = toCenterY / length;
  
  // Control point
  const controlX = midX + normalizedX * length * curvature;
  const controlY = midY + normalizedY * length * curvature;
  
  return `M${source.x},${source.y}Q${controlX},${controlY} ${target.x},${target.y}`;
};

/**
 * Determines if an arc should curve inward or outward based on tier relationship
 */
export const calculateArcDirection = (
  sourceTier: number,
  targetTier: number,
  sourceRadius: number,
  targetRadius: number,
  centerX: number,
  centerY: number
): 'inward' | 'outward' | 'around' => {
  if (sourceTier === targetTier) {
    return 'around'; // Same tier - curve around the outside
  } else if (sourceTier < targetTier) {
    return 'outward'; // From inner to outer tier
  } else {
    return 'inward'; // From outer to inner tier
  }
};

/**
 * Calculates the angle between two points relative to a center
 */
export const calculateAngleBetweenPoints = (
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  center: { x: number; y: number }
): number => {
  const angle1 = Math.atan2(point1.y - center.y, point1.x - center.x);
  const angle2 = Math.atan2(point2.y - center.y, point2.x - center.x);
  
  let diff = angle2 - angle1;
  
  // Normalize to [-π, π]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  
  return (diff * 180) / Math.PI;
};

/**
 * Finds the optimal layout for circular tiers to minimize overlap
 */
export const optimizeCircularLayout = (
  tiers: Array<{ nodeCount: number; nodeRadius: number }>,
  minRadius: number,
  maxRadius: number
): Array<{ radius: number; canFit: boolean }> => {
  const results: Array<{ radius: number; canFit: boolean }> = [];
  const radii = calculateTierRadii(tiers.length, minRadius, maxRadius);
  
  tiers.forEach((tier, index) => {
    const radius = radii[index];
    const { canFit } = distributeNodesWithSpacing(tier.nodeCount, tier.nodeRadius, radius);
    results.push({ radius, canFit });
  });
  
  return results;
};

/**
 * Calculates smooth interpolated positions for animation between states
 */
export const interpolateCircularPositions = (
  startPositions: CircularPosition[],
  endPositions: CircularPosition[],
  t: number // interpolation factor [0, 1]
): CircularPosition[] => {
  const minLength = Math.min(startPositions.length, endPositions.length);
  const result: CircularPosition[] = [];
  
  for (let i = 0; i < minLength; i++) {
    const start = startPositions[i];
    const end = endPositions[i];
    
    // Handle angle interpolation (shortest path)
    let angleDiff = end.angle - start.angle;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    result.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      angle: start.angle + angleDiff * t
    });
  }
  
  return result;
};