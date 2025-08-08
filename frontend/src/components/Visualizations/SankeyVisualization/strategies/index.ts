import { SankeyStrategy, NetworkData, SankeyData } from '../../../../types';
import { transformNetworkDataToSankey } from '../../../../utils/sankeyTransformations';

/**
 * All available Sankey strategies
 */
export const SANKEY_STRATEGIES: SankeyStrategy[] = [
  {
    id: 'bidirectional_club',
    name: 'Bidirectional Club Flows',
    description: 'Shows club-to-club transfers as separate incoming and outgoing flows (A→B and B→A separately)',
    aggregationLevel: 'club',
    flowType: 'bidirectional',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'club', 'bidirectional', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'club'
      };
    }
  },
  {
    id: 'net_club',
    name: 'Net Club Flows',
    description: 'Shows club-to-club transfers as net flows (A↔B combined, showing only net difference)',
    aggregationLevel: 'club',
    flowType: 'net',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'club', 'net', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'club'
      };
    }
  },
  {
    id: 'bidirectional_league',
    name: 'Bidirectional League Flows',
    description: 'Shows league-to-league transfers as separate incoming and outgoing flows',
    aggregationLevel: 'league',
    flowType: 'bidirectional',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'league', 'bidirectional', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'league'
      };
    }
  },
  {
    id: 'net_league',
    name: 'Net League Flows',
    description: 'Shows league-to-league transfers as net flows (combined bidirectional flows)',
    aggregationLevel: 'league',
    flowType: 'net',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'league', 'net', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'league'
      };
    }
  },
  {
    id: 'bidirectional_country',
    name: 'Bidirectional Country Flows',
    description: 'Shows country-to-country transfers as separate incoming and outgoing flows',
    aggregationLevel: 'country',
    flowType: 'bidirectional',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'country', 'bidirectional', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'country'
      };
    }
  },
  {
    id: 'net_country',
    name: 'Net Country Flows',
    description: 'Shows country-to-country transfers as net flows (combined bidirectional flows)',
    aggregationLevel: 'country',
    flowType: 'net',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'country', 'net', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'country'
      };
    }
  },
  {
    id: 'bidirectional_continent',
    name: 'Bidirectional Continent Flows',
    description: 'Shows continent-to-continent transfers as separate incoming and outgoing flows',
    aggregationLevel: 'continent',
    flowType: 'bidirectional',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'continent', 'bidirectional', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'continent'
      };
    }
  },
  {
    id: 'net_continent',
    name: 'Net Continent Flows',
    description: 'Shows continent-to-continent transfers as net flows (combined bidirectional flows)',
    aggregationLevel: 'continent',
    flowType: 'net',
    transform: (data: NetworkData, valueType: 'sum' | 'count' = 'sum'): SankeyData => {
      const result = transformNetworkDataToSankey(data, 'continent', 'net', valueType);
      return {
        nodes: result.nodes,
        links: result.links,
        groupBy: 'continent'
      };
    }
  }
];

/**
 * Default strategy to use when none is selected
 */
export const DEFAULT_STRATEGY = SANKEY_STRATEGIES[3]; // Net League Flows

/**
 * Find strategy by ID
 */
export const getStrategyById = (id: string): SankeyStrategy | undefined => {
  return SANKEY_STRATEGIES.find(strategy => strategy.id === id);
};

/**
 * Get strategies by aggregation level
 */
export const getStrategiesByLevel = (level: 'club' | 'league' | 'country' | 'continent'): SankeyStrategy[] => {
  return SANKEY_STRATEGIES.filter(strategy => strategy.aggregationLevel === level);
};

/**
 * Get strategies by flow type
 */
export const getStrategiesByFlowType = (flowType: 'bidirectional' | 'net'): SankeyStrategy[] => {
  return SANKEY_STRATEGIES.filter(strategy => strategy.flowType === flowType);
};