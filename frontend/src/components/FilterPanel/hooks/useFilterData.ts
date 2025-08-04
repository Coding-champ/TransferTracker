import { useState, useEffect } from 'react';
import { League } from '../../../types';
import { API_BASE_URL } from '../../../utils';

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
 * Centralizes all filter option data fetching logic
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

  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(true);
      try {
        const [
          leaguesRes,
          seasonsRes,
          transferTypesRes,
          transferWindowsRes,
          positionsRes,
          nationalitiesRes,
          continentsRes,
          leagueTiersRes
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/leagues`),
          fetch(`${API_BASE_URL}/seasons`),
          fetch(`${API_BASE_URL}/transfer-types`),
          fetch(`${API_BASE_URL}/transfer-windows`),
          fetch(`${API_BASE_URL}/positions`),
          fetch(`${API_BASE_URL}/nationalities`),
          fetch(`${API_BASE_URL}/continents`),
          fetch(`${API_BASE_URL}/league-tiers`)
        ]);

        const [
          leaguesData,
          seasonsData,
          transferTypesData,
          transferWindowsData,
          positionsData,
          nationalitiesData,
          continentsData,
          leagueTiersData
        ] = await Promise.all([
          leaguesRes.json(),
          seasonsRes.json(),
          transferTypesRes.json(),
          transferWindowsRes.json(),
          positionsRes.json(),
          nationalitiesRes.json(),
          continentsRes.json(),
          leagueTiersRes.json()
        ]);

        if (leaguesData.success) setLeagues(leaguesData.data);
        if (seasonsData.success) setSeasons(seasonsData.data);
        if (transferTypesData.success) setTransferTypes(transferTypesData.data);
        if (transferWindowsData.success) setTransferWindows(transferWindowsData.data);
        if (positionsData.success) setPositions(positionsData.data);
        if (nationalitiesData.success) setNationalities(nationalitiesData.data);
        if (continentsData.success) setContinents(continentsData.data);
        if (leagueTiersData.success) setLeagueTiers(leagueTiersData.data);

      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, []);

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