import { useState, useCallback } from 'react';
import { DrillDownState, HeatmapCell, UseDrillDownProps } from '../types';

const DEFAULT_DRILL_DOWN_STATE: DrillDownState = {
  level: 'league'
};

export const useDrillDown = ({
  initialState = DEFAULT_DRILL_DOWN_STATE,
  onStateChange
}: UseDrillDownProps = {}) => {
  const [state, setState] = useState<DrillDownState>(initialState);
  const [history, setHistory] = useState<DrillDownState[]>([initialState]);

  const updateState = useCallback((newState: DrillDownState) => {
    setState(newState);
    setHistory(prev => [...prev, newState]);
    onStateChange?.(newState);
  }, [onStateChange]);

  // Navigate to club level from league level
  const drillToClubs = useCallback((sourceLeague?: string, targetLeague?: string) => {
    const newState: DrillDownState = {
      level: 'club',
      sourceFilter: sourceLeague,
      targetFilter: targetLeague
    };
    updateState(newState);
  }, [updateState]);

  // Navigate to transfer details level
  const drillToTransfers = useCallback((cell: HeatmapCell) => {
    const newState: DrillDownState = {
      level: 'transfer',
      sourceFilter: cell.source,
      targetFilter: cell.target,
      selectedCell: cell
    };
    updateState(newState);
  }, [updateState]);

  // Navigate back to league level
  const drillToLeagues = useCallback(() => {
    const newState: DrillDownState = {
      level: 'league'
    };
    updateState(newState);
  }, [updateState]);

  // Navigate back one level
  const goBack = useCallback(() => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const previousState = newHistory[newHistory.length - 1];
      
      setState(previousState);
      setHistory(newHistory);
      onStateChange?.(previousState);
    }
  }, [history, onStateChange]);

  // Reset to initial state
  const reset = useCallback(() => {
    setState(initialState);
    setHistory([initialState]);
    onStateChange?.(initialState);
  }, [initialState, onStateChange]);

  // Check if we can go back
  const canGoBack = history.length > 1;

  // Get current level info
  const getCurrentLevelInfo = useCallback(() => {
    switch (state.level) {
      case 'league':
        return {
          title: 'League Transfer Matrix',
          description: 'Transfer activity between leagues',
          level: 1,
          maxLevel: 3
        };
      case 'club':
        return {
          title: 'Club Transfer Matrix',
          description: state.sourceFilter || state.targetFilter 
            ? `Clubs in ${state.sourceFilter || state.targetFilter}${
                state.sourceFilter && state.targetFilter && state.sourceFilter !== state.targetFilter 
                  ? ` and ${state.targetFilter}` 
                  : ''
              }` 
            : 'Transfer activity between clubs',
          level: 2,
          maxLevel: 3
        };
      case 'transfer':
        return {
          title: 'Transfer Details',
          description: `Transfers from ${state.sourceFilter} to ${state.targetFilter}`,
          level: 3,
          maxLevel: 3
        };
      default:
        return {
          title: 'Transfer Matrix',
          description: 'Transfer data visualization',
          level: 1,
          maxLevel: 3
        };
    }
  }, [state]);

  // Get breadcrumb path
  const getBreadcrumbs = useCallback(() => {
    const breadcrumbs = [];
    
    breadcrumbs.push({
      label: 'Leagues',
      level: 'league' as const,
      isActive: state.level === 'league',
      onClick: () => drillToLeagues()
    });

    if (state.level === 'club' || state.level === 'transfer') {
      const clubLabel = state.sourceFilter && state.targetFilter && state.sourceFilter !== state.targetFilter
        ? `${state.sourceFilter} ↔ ${state.targetFilter}`
        : state.sourceFilter || state.targetFilter || 'Clubs';
        
      breadcrumbs.push({
        label: clubLabel,
        level: 'club' as const,
        isActive: state.level === 'club',
        onClick: () => drillToClubs(state.sourceFilter, state.targetFilter)
      });
    }

    if (state.level === 'transfer') {
      breadcrumbs.push({
        label: 'Transfers',
        level: 'transfer' as const,
        isActive: true,
        onClick: () => {} // Already at this level
      });
    }

    return breadcrumbs;
  }, [state, drillToLeagues, drillToClubs]);

  // Handle cell click based on current level
  const handleCellClick = useCallback((cell: HeatmapCell) => {
    switch (state.level) {
      case 'league':
        // Drill down to clubs in selected leagues
        drillToClubs(cell.source, cell.target);
        break;
      case 'club':
        // Drill down to transfer details
        drillToTransfers(cell);
        break;
      case 'transfer':
        // At deepest level, could show additional details
        console.log('Transfer details for:', cell);
        break;
    }
  }, [state.level, drillToClubs, drillToTransfers]);

  return {
    state,
    canGoBack,
    goBack,
    reset,
    drillToLeagues,
    drillToClubs,
    drillToTransfers,
    handleCellClick,
    getCurrentLevelInfo,
    getBreadcrumbs
  };
};