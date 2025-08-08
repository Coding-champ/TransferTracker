import { useState, useEffect } from 'react';
import { League } from '../../../types';
import apiService from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';

/**
 * Interface for the filter data returned by the hook
 */
interface FilterData {
  leagues: League[];
  seasons: string[];
  transferTypes: string[];
  transferWindows: string[];
  positions: string[];
  nationalities: string[];
  continents: string[];
  leagueTiers: number[];
  loading: boolean;
}

/**
 * Custom hook to fetch and manage filter data
 * Centralizes all filter option data fetching logic via ApiService
 * Adds toast-based warning feedback on non-fatal errors
 * @returns Filter data and loading state
 */
export const useFilterData = (): FilterData => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [transferTypes, setTransferTypes] = useState<string[]>([]);
  const [transferWindows, setTransferWindows] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [continents, setContinents] = useState<string[]>([]);
  const [leagueTiers, setLeagueTiers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const { warning } = useToast();

  useEffect(() => {
    let mounted = true;

    const fetchFilterData = async () => {
      setLoading(true);
      try {
        const data = await apiService.loadAllFilterData();

        if (!mounted) return;

        setLeagues(data.leagues || []);
        setSeasons(data.seasons || []);
        setTransferTypes(data.transferTypes || []);
        setTransferWindows(data.transferWindows || []);
        setPositions(data.positions || []);
        setNationalities(data.nationalities || []);
        setContinents(data.continents || []);
        setLeagueTiers(data.leagueTiers || []);
      } catch (error: any) {
        if (!mounted) return;
        // Show a non-blocking warning toast instead of console.error
        const msg = error?.message || 'Failed to load filter data';
        warning(`Some filter data could not be loaded. ${msg}`);
        // Keep UI usable with whatever data may have loaded before failure (defaults are empty arrays)
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFilterData();
    return () => { mounted = false; };
  }, [warning]);

  return {
    leagues,
    seasons,
    transferTypes,
    transferWindows,
    positions,
    nationalities,
    continents,
    leagueTiers,
    loading
  };
};