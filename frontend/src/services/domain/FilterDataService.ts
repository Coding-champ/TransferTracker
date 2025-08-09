/**
 * FilterDataService - Handles filter combinations and validation
 * Specialized service for filter data with batch loading capabilities
 */

import { ApiResponse, League, Club } from '../../types';
import { createPerformanceTimer } from '../../utils';
import { masterDataService } from './MasterDataService';

export class FilterDataService {
  
  /**
   * Load all filter data in one batch request
   * Optimized for initial app loading
   */
  async loadAllFilterData(): Promise<{
    leagues: League[];
    clubs: Club[];
    seasons: string[];
    transferTypes: string[];
    transferWindows: string[];
    positions: string[];
    nationalities: string[];
    continents: string[];
    leagueTiers: number[];
  }> {
    const timer = createPerformanceTimer('Load All Filter Data');
    try {
      const [
        leaguesRes,
        clubsRes,
        seasonsRes,
        transferTypesRes,
        transferWindowsRes,
        positionsRes,
        nationalitiesRes,
        continentsRes,
        leagueTiersRes
      ] = await Promise.all([
        masterDataService.getLeagues(),
        masterDataService.getClubs(),
        masterDataService.getSeasons(),
        masterDataService.getTransferTypes(),
        masterDataService.getTransferWindows(),
        masterDataService.getPositions(),
        masterDataService.getNationalities(),
        masterDataService.getContinents(),
        masterDataService.getLeagueTiers()
      ]);

      return {
        leagues: leaguesRes.success ? leaguesRes.data : [],
        clubs: clubsRes.success ? clubsRes.data : [],
        seasons: seasonsRes.success ? seasonsRes.data : [],
        transferTypes: transferTypesRes.success ? transferTypesRes.data : [],
        transferWindows: transferWindowsRes.success ? transferWindowsRes.data : [],
        positions: positionsRes.success ? positionsRes.data : [],
        nationalities: nationalitiesRes.success ? nationalitiesRes.data : [],
        continents: continentsRes.success ? continentsRes.data : [],
        leagueTiers: leagueTiersRes.success ? leagueTiersRes.data : []
      };
    } finally {
      timer();
    }
  }

  /**
   * Load clubs for specific leagues (optimized for league filter changes)
   */
  async loadClubsForLeagues(leagueIds: number[]): Promise<{
    [leagueId: number]: Club[];
  }> {
    const timer = createPerformanceTimer('Load Clubs For Leagues');
    try {
      const clubRequests = leagueIds.map(async (leagueId) => {
        const result = await masterDataService.getClubs(leagueId);
        return {
          leagueId,
          clubs: result.success ? result.data : []
        };
      });

      const results = await Promise.all(clubRequests);
      
      return results.reduce((acc, { leagueId, clubs }) => {
        acc[leagueId] = clubs;
        return acc;
      }, {} as { [leagueId: number]: Club[] });
    } finally {
      timer();
    }
  }

  /**
   * Validate filter combinations
   * Ensures filter values are valid and consistent
   */
  async validateFilterCombination(filters: {
    leagues?: number[];
    clubs?: number[];
    seasons?: string[];
    positions?: string[];
    nationalities?: string[];
  }): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Load reference data for validation
    const [leaguesRes, clubsRes, seasonsRes, positionsRes, nationalitiesRes] = await Promise.all([
      masterDataService.getLeagues(),
      masterDataService.getClubs(),
      masterDataService.getSeasons(),
      masterDataService.getPositions(),
      masterDataService.getNationalities()
    ]);

    const availableLeagues = leaguesRes.success ? leaguesRes.data.map(l => l.id) : [];
    const availableClubs = clubsRes.success ? clubsRes.data.map(c => c.id) : [];
    const availableSeasons = seasonsRes.success ? seasonsRes.data : [];
    const availablePositions = positionsRes.success ? positionsRes.data : [];
    const availableNationalities = nationalitiesRes.success ? nationalitiesRes.data : [];

    // Validate leagues
    if (filters.leagues) {
      const invalidLeagues = filters.leagues.filter(id => !availableLeagues.includes(id));
      if (invalidLeagues.length > 0) {
        errors.push(`Invalid league IDs: ${invalidLeagues.join(', ')}`);
      }
    }

    // Validate clubs
    if (filters.clubs) {
      const invalidClubs = filters.clubs.filter(id => !availableClubs.includes(id));
      if (invalidClubs.length > 0) {
        errors.push(`Invalid club IDs: ${invalidClubs.join(', ')}`);
      }

      // Check if clubs belong to selected leagues
      if (filters.leagues && filters.leagues.length > 0) {
        const clubsData = clubsRes.success ? clubsRes.data : [];
        const clubsInSelectedLeagues = clubsData.filter(club => 
          club.league.id && filters.leagues!.includes(club.league.id)
        ).map(c => c.id);
        
        const clubsNotInLeagues = filters.clubs.filter(id => 
          !clubsInSelectedLeagues.includes(id)
        );
        
        if (clubsNotInLeagues.length > 0) {
          errors.push(`Selected clubs are not in the selected leagues: ${clubsNotInLeagues.join(', ')}`);
          suggestions.push('Remove clubs not in selected leagues or expand league selection');
        }
      }
    }

    // Validate seasons
    if (filters.seasons) {
      const invalidSeasons = filters.seasons.filter(season => !availableSeasons.includes(season));
      if (invalidSeasons.length > 0) {
        errors.push(`Invalid seasons: ${invalidSeasons.join(', ')}`);
      }
    }

    // Validate positions
    if (filters.positions) {
      const invalidPositions = filters.positions.filter(pos => !availablePositions.includes(pos));
      if (invalidPositions.length > 0) {
        errors.push(`Invalid positions: ${invalidPositions.join(', ')}`);
      }
    }

    // Validate nationalities
    if (filters.nationalities) {
      const invalidNationalities = filters.nationalities.filter(nat => !availableNationalities.includes(nat));
      if (invalidNationalities.length > 0) {
        errors.push(`Invalid nationalities: ${invalidNationalities.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Get filter suggestions based on current selection
   */
  async getFilterSuggestions(currentFilters: {
    leagues?: number[];
    clubs?: number[];
    seasons?: string[];
  }): Promise<{
    suggestedClubs: Club[];
    suggestedSeasons: string[];
    relatedLeagues: League[];
  }> {
    const suggestions = {
      suggestedClubs: [] as Club[],
      suggestedSeasons: [] as string[],
      relatedLeagues: [] as League[]
    };

    // Get clubs for selected leagues
    if (currentFilters.leagues && currentFilters.leagues.length > 0) {
      const clubsRes = await masterDataService.getClubs();
      if (clubsRes.success) {
        suggestions.suggestedClubs = clubsRes.data.filter(club => 
          club.league.id && currentFilters.leagues!.includes(club.league.id)
        );
      }
    }

    // Get related leagues if clubs are selected
    if (currentFilters.clubs && currentFilters.clubs.length > 0) {
      const [leaguesRes, clubsRes] = await Promise.all([
        masterDataService.getLeagues(),
        masterDataService.getClubs()
      ]);
      
      if (leaguesRes.success && clubsRes.success) {
        const selectedClubLeagues = clubsRes.data
          .filter(club => currentFilters.clubs!.includes(club.id))
          .map(club => club.league.id)
          .filter(Boolean) as number[];
        
        suggestions.relatedLeagues = leaguesRes.data.filter(league => 
          selectedClubLeagues.includes(league.id)
        );
      }
    }

    // Always suggest recent seasons
    const seasonsRes = await masterDataService.getSeasons();
    if (seasonsRes.success) {
      suggestions.suggestedSeasons = seasonsRes.data.slice(0, 5); // Most recent 5 seasons
    }

    return suggestions;
  }
}

// Export singleton instance
export const filterDataService = new FilterDataService();