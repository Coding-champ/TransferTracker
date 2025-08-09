import * as d3 from 'd3';

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  ease?: (t: number) => number;
}

const defaultConfig: Required<AnimationConfig> = {
  duration: 500,
  delay: 0,
  ease: d3.easeLinear,
};

// Standard fade in/out animations
export const fadeIn = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .style('opacity', 1);
};

export const fadeOut = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .style('opacity', 0);
};

// Scale animations
export const scaleIn = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .style('transform', 'scale(0)')
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .style('transform', 'scale(1)');
};

export const scaleOut = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .style('transform', 'scale(0)');
};

// Rotation animations
export const rotate = (
  selection: d3.Selection<any, any, any, any>,
  fromAngle: number,
  toAngle: number,
  centerX: number = 0,
  centerY: number = 0,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .style('transform-origin', `${centerX}px ${centerY}px`)
    .style('transform', `rotate(${fromAngle}deg)`)
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .style('transform', `rotate(${toAngle}deg)`);
};

// Zoom animations
export const zoomTo = (
  selection: d3.Selection<any, any, any, any>,
  zoomBehavior: d3.ZoomBehavior<any, any>,
  transform: d3.ZoomTransform,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .call(zoomBehavior.transform, transform);
};

// Path morphing animation
export const morphPath = (
  selection: d3.Selection<SVGPathElement, any, any, any>,
  newPath: string,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attr('d', newPath);
};

// Color transition animation
export const colorTransition = (
  selection: d3.Selection<any, any, any, any>,
  fromColor: string,
  toColor: string,
  attribute: string = 'fill',
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .attr(attribute, fromColor)
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attr(attribute, toColor);
};

// Staggered animations for multiple elements
export const staggeredFadeIn = (
  selection: d3.Selection<any, any, any, any>,
  staggerDelay: number = 50,
  config: AnimationConfig = {}
) => {
  const { duration, ease } = { ...defaultConfig, ...config };
  
  return selection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .delay((d, i) => i * staggerDelay + (config.delay || 0))
    .ease(ease)
    .style('opacity', 1);
};

export const staggeredScaleIn = (
  selection: d3.Selection<any, any, any, any>,
  staggerDelay: number = 50,
  config: AnimationConfig = {}
) => {
  const { duration, ease } = { ...defaultConfig, ...config };
  
  return selection
    .style('transform', 'scale(0)')
    .transition()
    .duration(duration)
    .delay((d, i) => i * staggerDelay + (config.delay || 0))
    .ease(ease)
    .style('transform', 'scale(1)');
};

// Spring-like animations using d3-ease
export const springIn = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  return fadeIn(selection, { ...config, ease: d3.easeElastic.period(0.4) });
};

export const bounceIn = (
  selection: d3.Selection<any, any, any, any>,
  config: AnimationConfig = {}
) => {
  return scaleIn(selection, { ...config, ease: d3.easeBounce });
};

// Smooth radius animation for circles
export const animateRadius = (
  selection: d3.Selection<SVGCircleElement, any, any, any>,
  newRadius: number,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attr('r', newRadius);
};

// Position animation
export const animatePosition = (
  selection: d3.Selection<any, any, any, any>,
  x: number,
  y: number,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attr('transform', `translate(${x}, ${y})`);
};

// Arc animation for pie charts/circular layouts
export const animateArc = (
  selection: d3.Selection<SVGPathElement, any, any, any>,
  arcGenerator: d3.Arc<any, any>,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate(
        { startAngle: 0, endAngle: 0 },
        d
      );
      return (t: number) => arcGenerator(interpolate(t))!;
    });
};

// Chained animations utility
export class AnimationChain {
  private animations: (() => d3.Transition<any, any, any, any>)[] = [];
  
  add(animationFunc: () => d3.Transition<any, any, any, any>) {
    this.animations.push(animationFunc);
    return this;
  }
  
  run() {
    if (this.animations.length === 0) return Promise.resolve();
    
    return this.animations.reduce((promise, animationFunc, index) => {
      return promise.then(() => {
        return new Promise<void>((resolve) => {
          const transition = animationFunc();
          transition.on('end', () => resolve());
        });
      });
    }, Promise.resolve());
  }
}

// Utility to create smooth interpolated animations
export const interpolateAttribute = (
  selection: d3.Selection<any, any, any, any>,
  attribute: string,
  fromValue: any,
  toValue: any,
  config: AnimationConfig = {}
) => {
  const { duration, delay, ease } = { ...defaultConfig, ...config };
  
  return selection
    .attr(attribute, fromValue)
    .transition()
    .duration(duration)
    .delay(delay)
    .ease(ease)
    .attrTween(attribute, () => d3.interpolate(fromValue, toValue));
};

// Easing functions for different animation types
export const easings = {
  // Standard
  linear: d3.easeLinear,
  quad: d3.easeQuad,
  cubic: d3.easeCubic,
  
  // Smooth
  sin: d3.easeSin,
  exp: d3.easeExp,
  circle: d3.easeCircle,
  
  // Bouncy
  elastic: d3.easeElastic,
  bounce: d3.easeBounce,
  back: d3.easeBack,
  
  // Stepped
  polyIn: d3.easePolyIn,
  polyOut: d3.easePolyOut,
  polyInOut: d3.easePolyInOut,
};