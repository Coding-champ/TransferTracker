import * as d3 from 'd3';
import { HeatmapMode } from '../types';

export const createValueColorScale = (domain: [number, number]) => {
  return d3.scaleSequential(d3.interpolateReds)
    .domain(domain);
};

export const createCountColorScale = (domain: [number, number]) => {
  return d3.scaleSequential(d3.interpolateBlues)
    .domain(domain);
};

export const createSuccessRateColorScale = () => {
  return d3.scaleSequential(d3.interpolateGreens)
    .domain([0, 1]);
};

export const createHeatmapColorScale = (
  mode: HeatmapMode,
  values: number[]
): d3.ScaleSequential<string> => {
  const domain = d3.extent(values) as [number, number];
  
  switch (mode) {
    case 'value':
      return createValueColorScale(domain);
    case 'count':
      return createCountColorScale(domain);
    case 'success-rate':
      return createSuccessRateColorScale();
    default:
      return createValueColorScale(domain);
  }
};

export const getColorScaleInterpolator = (mode: HeatmapMode) => {
  switch (mode) {
    case 'value':
      return d3.interpolateReds;
    case 'count':
      return d3.interpolateBlues;
    case 'success-rate':
      return d3.interpolateGreens;
    default:
      return d3.interpolateReds;
  }
};

export const createCategoricalColorScale = (categories: string[]) => {
  return d3.scaleOrdinal(d3.schemeCategory10)
    .domain(categories);
};

export const createDivergingColorScale = (
  domain: [number, number, number],
  colors: [string, string, string] = ['#d73027', '#f7f7f7', '#1a9850']
) => {
  return d3.scaleDiverging()
    .domain(domain)
    .interpolator(d3.interpolateRdYlGn);
};

// Custom color scales for specific transfer data
export const createTransferValueScale = (maxValue: number) => {
  const breaks = [0, maxValue * 0.1, maxValue * 0.3, maxValue * 0.6, maxValue];
  const colors = ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#de2d26'];
  
  return d3.scaleThreshold<number, string>()
    .domain(breaks.slice(1))
    .range(colors);
};

export const createLeagueQualityScale = () => {
  // Based on common league tier classifications
  const leagues = [
    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', // Tier 1
    'Championship', 'Serie B', '2. Bundesliga', 'Ligue 2', // Tier 2
  ];
  
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', // Tier 1 - bright colors
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22' // Tier 2 - muted colors
  ];
  
  return d3.scaleOrdinal<string, string>()
    .domain(leagues)
    .range(colors);
};

export const formatColorScaleValue = (value: number, mode: HeatmapMode): string => {
  switch (mode) {
    case 'value':
      return value >= 1000000 
        ? `€${(value / 1000000).toFixed(1)}M`
        : `€${(value / 1000).toFixed(0)}K`;
    case 'count':
      return value.toString();
    case 'success-rate':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toString();
  }
};

export const getContrastTextColor = (backgroundColor: string): string => {
  // Convert color to RGB and calculate luminance
  const color = d3.color(backgroundColor);
  if (!color) return '#000000';
  
  const rgb = color.rgb();
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
};