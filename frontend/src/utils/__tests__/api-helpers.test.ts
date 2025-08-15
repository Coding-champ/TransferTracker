import { 
  API_BASE_URL, 
  API_RETRY_MAX, 
  API_RETRY_BASE_MS, 
  bigIntToNumber, 
  buildQueryParams, 
  filtersToApiParams 
} from '../api-helpers';
import { FilterState } from '../../types';

describe('API Helper Utilities', () => {
  const mockFilters: FilterState = {
    seasons: ['2023/24', '2022/23'],
    leagues: ['Bundesliga', 'Premier League'],
    countries: ['Germany', 'England'],
    continents: ['Europe'],
    transferTypes: ['sale', 'loan'],
    transferWindows: ['summer'],
    positions: ['Forward', 'Midfielder'],
    nationalities: ['German', 'English'],
    clubs: [1, 2, 3],
    leagueTiers: [1, 2],
    minTransferFee: 1000000,
    maxTransferFee: 50000000,
    minPlayerAge: 18,
    maxPlayerAge: 35,
    minContractDuration: 1,
    maxContractDuration: 5,
    minROI: -50,
    maxROI: 200,
    minPerformanceRating: 6.0,
    maxPerformanceRating: 10.0,
    hasTransferFee: true,
    excludeLoans: false,
    isLoanToBuy: true,
    onlySuccessfulTransfers: false
  };

  describe('Constants', () => {
    it('should have default API_BASE_URL', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(typeof API_BASE_URL).toBe('string');
      expect(API_BASE_URL).toBe('http://localhost:3001/api');
    });

    it('should have default API_RETRY_MAX', () => {
      expect(API_RETRY_MAX).toBeDefined();
      expect(typeof API_RETRY_MAX).toBe('number');
      expect(API_RETRY_MAX).toBe(2);
    });

    it('should have default API_RETRY_BASE_MS', () => {
      expect(API_RETRY_BASE_MS).toBeDefined();
      expect(typeof API_RETRY_BASE_MS).toBe('number');
      expect(API_RETRY_BASE_MS).toBe(300);
    });
  });

  describe('bigIntToNumber', () => {
    it('should convert BigInt to number', () => {
      expect(bigIntToNumber(BigInt(123))).toBe(123);
      expect(bigIntToNumber(BigInt(0))).toBe(0);
      expect(bigIntToNumber(BigInt(999999))).toBe(999999);
    });

    it('should return null for null input', () => {
      expect(bigIntToNumber(null)).toBe(null);
    });

    it('should handle large BigInt values', () => {
      expect(bigIntToNumber(BigInt(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('buildQueryParams', () => {
    it('should build query params from filter state', () => {
      const params = buildQueryParams(mockFilters);

      expect(params.get('seasons')).toBe('2023/24,2022/23');
      expect(params.get('leagues')).toBe('Bundesliga,Premier League');
      expect(params.get('countries')).toBe('Germany,England');
      expect(params.get('continents')).toBe('Europe');
      expect(params.get('transferTypes')).toBe('sale,loan');
      expect(params.get('transferWindows')).toBe('summer');
      expect(params.get('positions')).toBe('Forward,Midfielder');
      expect(params.get('nationalities')).toBe('German,English');
      expect(params.get('clubs')).toBe('1,2,3');
      expect(params.get('leagueTiers')).toBe('1,2');
    });

    it('should include numeric parameters', () => {
      const params = buildQueryParams(mockFilters);

      expect(params.get('minTransferFee')).toBe('1000000');
      expect(params.get('maxTransferFee')).toBe('50000000');
      expect(params.get('minPlayerAge')).toBe('18');
      expect(params.get('maxPlayerAge')).toBe('35');
      expect(params.get('minContractDuration')).toBe('1');
      expect(params.get('maxContractDuration')).toBe('5');
      expect(params.get('minROI')).toBe('-50');
      expect(params.get('maxROI')).toBe('200');
      expect(params.get('minPerformanceRating')).toBe('6');
      expect(params.get('maxPerformanceRating')).toBe('10');
    });

    it('should include boolean parameters when true', () => {
      const params = buildQueryParams(mockFilters);

      expect(params.get('hasTransferFee')).toBe('true');
      expect(params.get('isLoanToBuy')).toBe('true');
      expect(params.get('excludeLoans')).toBe(null); // false, not included
      expect(params.get('onlySuccessfulTransfers')).toBe(null); // false, not included
    });

    it('should handle empty filters', () => {
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

      const params = buildQueryParams(emptyFilters);
      expect(params.toString()).toBe('');
    });

    it('should handle zero values in numeric filters', () => {
      const filtersWithZeros: FilterState = {
        ...mockFilters,
        minTransferFee: 0,
        maxTransferFee: 0,
        minROI: 0
      };

      const params = buildQueryParams(filtersWithZeros);
      expect(params.get('minTransferFee')).toBe('0');
      expect(params.get('maxTransferFee')).toBe('0');
      expect(params.get('minROI')).toBe('0');
    });
  });

  describe('filtersToApiParams', () => {
    it('should convert filter state to API params format', () => {
      const apiParams = filtersToApiParams(mockFilters);

      expect(apiParams.seasons).toEqual(['2023/24', '2022/23']);
      expect(apiParams.leagues).toEqual(['Bundesliga', 'Premier League']);
      expect(apiParams.countries).toEqual(['Germany', 'England']);
      expect(apiParams.continents).toEqual(['Europe']);
      expect(apiParams.transferTypes).toEqual(['sale', 'loan']);
      expect(apiParams.clubs).toEqual([1, 2, 3]);
      expect(apiParams.leagueTiers).toEqual([1, 2]);
    });

    it('should include numeric parameters', () => {
      const apiParams = filtersToApiParams(mockFilters);

      expect(apiParams.minTransferFee).toBe(1000000);
      expect(apiParams.maxTransferFee).toBe(50000000);
      expect(apiParams.minPlayerAge).toBe(18);
      expect(apiParams.maxPlayerAge).toBe(35);
      expect(apiParams.minContractDuration).toBe(1);
      expect(apiParams.maxContractDuration).toBe(5);
      expect(apiParams.minROI).toBe(-50);
      expect(apiParams.maxROI).toBe(200);
      expect(apiParams.minPerformanceRating).toBe(6);
      expect(apiParams.maxPerformanceRating).toBe(10);
    });

    it('should include boolean parameters', () => {
      const apiParams = filtersToApiParams(mockFilters);

      expect(apiParams.hasTransferFee).toBe(true);
      expect(apiParams.isLoanToBuy).toBe(true);
      expect(apiParams.excludeLoans).toBe(false);
      expect(apiParams.onlySuccessfulTransfers).toBe(false);
    });

    it('should exclude undefined and null values', () => {
      const partialFilters: FilterState = {
        seasons: ['2023/24'],
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
        maxTransferFee: null as any,
        minPlayerAge: 18,
        maxPlayerAge: undefined,
        minContractDuration: undefined,
        maxContractDuration: undefined,
        minROI: undefined,
        maxROI: undefined,
        minPerformanceRating: undefined,
        maxPerformanceRating: undefined,
        hasTransferFee: true,
        excludeLoans: false,
        isLoanToBuy: false,
        onlySuccessfulTransfers: false
      };

      const apiParams = filtersToApiParams(partialFilters);

      expect(apiParams.seasons).toEqual(['2023/24']);
      expect(apiParams.minPlayerAge).toBe(18);
      expect(apiParams.hasTransferFee).toBe(true);
      expect(apiParams.excludeLoans).toBe(false);
      expect('minTransferFee' in apiParams).toBe(false);
      expect('maxTransferFee' in apiParams).toBe(false);
      expect('maxPlayerAge' in apiParams).toBe(false);
    });

    it('should exclude empty arrays', () => {
      const filtersWithEmptyArrays: FilterState = {
        seasons: [],
        leagues: ['Bundesliga'],
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

      const apiParams = filtersToApiParams(filtersWithEmptyArrays);

      expect(apiParams.leagues).toEqual(['Bundesliga']);
      expect('seasons' in apiParams).toBe(false);
      expect('countries' in apiParams).toBe(false);
      expect('transferTypes' in apiParams).toBe(false);
    });

    it('should handle zero values correctly', () => {
      const filtersWithZeros: FilterState = {
        ...mockFilters,
        minTransferFee: 0,
        maxROI: 0
      };

      const apiParams = filtersToApiParams(filtersWithZeros);

      expect(apiParams.minTransferFee).toBe(0);
      expect(apiParams.maxROI).toBe(0);
    });
  });

  describe('Integration tests', () => {
    it('should work with both buildQueryParams and filtersToApiParams', () => {
      const queryParams = buildQueryParams(mockFilters);
      const apiParams = filtersToApiParams(mockFilters);

      // Both should include the same data, just in different formats
      expect(queryParams.get('leagues')).toBe('Bundesliga,Premier League');
      expect(apiParams.leagues).toEqual(['Bundesliga', 'Premier League']);

      expect(queryParams.get('minTransferFee')).toBe('1000000');
      expect(apiParams.minTransferFee).toBe(1000000);

      expect(queryParams.get('hasTransferFee')).toBe('true');
      expect(apiParams.hasTransferFee).toBe(true);
    });
  });
});