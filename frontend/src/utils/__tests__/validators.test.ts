import { validateFilterCombination, countActiveFilters } from '../validators';
import { FilterState } from '../../types';

describe('Validation Utilities', () => {
  const baseFilters: FilterState = {
    seasons: ['2023/24'],
    leagues: [],
    countries: [],
    continents: [],
    transferTypes: ['sale'],
    transferWindows: [],
    positions: [],
    nationalities: [],
    clubs: [],
    leagueTiers: [],
    minTransferFee: undefined,
    maxTransferFee: undefined,
    minPlayerAge: undefined,
    maxPlayerAge: undefined,
    minContractDuration: undefined,
    maxContractDuration: undefined,
    minROI: undefined,
    maxROI: undefined,
    minPerformanceRating: undefined,
    maxPerformanceRating: undefined,
    hasTransferFee: false,
    excludeLoans: false,
    isLoanToBuy: false,
    onlySuccessfulTransfers: false
  };

  describe('validateFilterCombination', () => {
    it('should return no warnings for valid filter combinations', () => {
      const warnings = validateFilterCombination(baseFilters);
      expect(warnings).toEqual([]);
    });

    it('should detect excludeLoans and isLoanToBuy conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        excludeLoans: true,
        isLoanToBuy: true
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Conflicting filters: "Exclude loans" and "Loan-to-buy only" cannot both be active'
      );
    });

    it('should detect min > max transfer fee conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        minTransferFee: 100000,
        maxTransferFee: 50000
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Minimum transfer fee cannot be higher than maximum transfer fee'
      );
    });

    it('should detect min > max player age conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        minPlayerAge: 30,
        maxPlayerAge: 25
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Minimum player age cannot be higher than maximum player age'
      );
    });

    it('should detect min > max contract duration conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        minContractDuration: 5,
        maxContractDuration: 2
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Minimum contract duration cannot be higher than maximum contract duration'
      );
    });

    it('should detect min > max ROI conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        minROI: 50,
        maxROI: 10
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Minimum ROI cannot be higher than maximum ROI'
      );
    });

    it('should detect min > max performance rating conflict', () => {
      const conflictedFilters: FilterState = {
        ...baseFilters,
        minPerformanceRating: 8.5,
        maxPerformanceRating: 7.0
      };

      const warnings = validateFilterCombination(conflictedFilters);
      expect(warnings).toContain(
        'Minimum performance rating cannot be higher than maximum performance rating'
      );
    });

    it('should warn about leagues and continents intersection', () => {
      const intersectionFilters: FilterState = {
        ...baseFilters,
        leagues: ['Bundesliga'],
        continents: ['Europe']
      };

      const warnings = validateFilterCombination(intersectionFilters);
      expect(warnings).toContain(
        'Both league and continent filters are active - results will show intersection'
      );
    });

    it('should detect multiple conflicts at once', () => {
      const multiConflictFilters: FilterState = {
        ...baseFilters,
        excludeLoans: true,
        isLoanToBuy: true,
        minTransferFee: 100000,
        maxTransferFee: 50000,
        minPlayerAge: 30,
        maxPlayerAge: 25
      };

      const warnings = validateFilterCombination(multiConflictFilters);
      expect(warnings).toHaveLength(3);
      expect(warnings).toContain(
        'Conflicting filters: "Exclude loans" and "Loan-to-buy only" cannot both be active'
      );
      expect(warnings).toContain(
        'Minimum transfer fee cannot be higher than maximum transfer fee'
      );
      expect(warnings).toContain(
        'Minimum player age cannot be higher than maximum player age'
      );
    });

    it('should handle edge cases with zero and undefined values', () => {
      const edgeCaseFilters: FilterState = {
        ...baseFilters,
        minTransferFee: 0,
        maxTransferFee: 0,
        minPlayerAge: undefined,
        maxPlayerAge: 25,
        minROI: 0,
        maxROI: undefined
      };

      const warnings = validateFilterCombination(edgeCaseFilters);
      expect(warnings).toEqual([]);
    });
  });

  describe('countActiveFilters', () => {
    it('should count array filters correctly', () => {
      const filtersWithArrays: FilterState = {
        ...baseFilters,
        seasons: ['2023/24', '2022/23'],
        leagues: ['Bundesliga', 'Premier League'],
        countries: ['Germany']
      };

      const count = countActiveFilters(filtersWithArrays);
      expect(count).toBe(6); // 2 seasons + 2 leagues + 1 country + 1 transferType
    });

    it('should count numeric filters correctly', () => {
      const filtersWithNumbers: FilterState = {
        ...baseFilters,
        minTransferFee: 1000000,
        maxTransferFee: 50000000,
        minPlayerAge: 18,
        maxPlayerAge: 35
      };

      const count = countActiveFilters(filtersWithNumbers);
      expect(count).toBe(6); // 1 season + 1 transferType + 4 numeric values
    });

    it('should count boolean filters correctly', () => {
      const filtersWithBooleans: FilterState = {
        ...baseFilters,
        hasTransferFee: true,
        excludeLoans: true,
        onlySuccessfulTransfers: true
      };

      const count = countActiveFilters(filtersWithBooleans);
      expect(count).toBe(5); // 1 season + 1 transferType + 3 booleans
    });

    it('should not count undefined or false values', () => {
      const minimalFilters: FilterState = {
        ...baseFilters,
        seasons: [],
        transferTypes: [],
        hasTransferFee: false,
        excludeLoans: false,
        minTransferFee: undefined,
        maxTransferFee: undefined
      };

      const count = countActiveFilters(minimalFilters);
      expect(count).toBe(0);
    });

    it('should handle mixed filter types correctly', () => {
      const mixedFilters: FilterState = {
        ...baseFilters,
        seasons: ['2023/24', '2022/23', '2021/22'],
        leagues: ['Bundesliga'],
        transferTypes: ['sale', 'loan'],
        minTransferFee: 1000000,
        hasTransferFee: true,
        excludeLoans: true
      };

      const count = countActiveFilters(mixedFilters);
      expect(count).toBe(9); // 3 seasons + 1 league + 2 transferTypes + 1 numeric + 2 booleans
    });

    it('should handle zero values in numeric filters', () => {
      const zeroFilters: FilterState = {
        ...baseFilters,
        minTransferFee: 0,
        maxTransferFee: 0,
        minPlayerAge: 0,
        minROI: 0
      };

      const count = countActiveFilters(zeroFilters);
      expect(count).toBe(6); // 1 season + 1 transferType + 4 zero values (treated as active)
    });

    it('should handle empty filter state', () => {
      const emptyFilters: FilterState = {
        seasons: [],
        leagues: [],
        countries: [],
        continents: [],
        transferTypes: [],
        transferWindows: [],
        positions: [],
        nationalities: [],
        clubs: [],
        leagueTiers: [],
        minTransferFee: undefined,
        maxTransferFee: undefined,
        minPlayerAge: undefined,
        maxPlayerAge: undefined,
        minContractDuration: undefined,
        maxContractDuration: undefined,
        minROI: undefined,
        maxROI: undefined,
        minPerformanceRating: undefined,
        maxPerformanceRating: undefined,
        hasTransferFee: false,
        excludeLoans: false,
        isLoanToBuy: false,
        onlySuccessfulTransfers: false
      };

      const warnings = validateFilterCombination(emptyFilters);
      const count = countActiveFilters(emptyFilters);

      expect(warnings).toEqual([]);
      expect(count).toBe(0);
    });
  });

  describe('Integration tests', () => {
    it('should validate and count complex filter combinations', () => {
      const complexFilters: FilterState = {
        ...baseFilters,
        seasons: ['2023/24', '2022/23'],
        leagues: ['Bundesliga', 'Premier League'],
        continents: ['Europe'],
        transferTypes: ['sale', 'loan', 'free'],
        minTransferFee: 1000000,
        maxTransferFee: 50000000,
        minPlayerAge: 18,
        maxPlayerAge: 35,
        hasTransferFee: true,
        onlySuccessfulTransfers: true
      };

      const warnings = validateFilterCombination(complexFilters);
      const count = countActiveFilters(complexFilters);

      expect(warnings).toContain(
        'Both league and continent filters are active - results will show intersection'
      );
      expect(count).toBe(14); // 2+2+1+3+4+2 filters = 14
    });
  });
});