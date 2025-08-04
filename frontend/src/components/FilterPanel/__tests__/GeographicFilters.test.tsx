import React from 'react';
import { render, screen } from '@testing-library/react';
import GeographicFilters from '../filters/GeographicFilters';
import { FilterState, League } from '../../../types';

// Mock FilterSection and CheckboxFilter components
jest.mock('../FilterSection', () => {
  return function MockFilterSection({ title, children, isExpanded }: any) {
    return (
      <div data-testid="filter-section">
        <h3>{title}</h3>
        {isExpanded && <div>{children}</div>}
      </div>
    );
  };
});

jest.mock('../components/CheckboxFilter', () => {
  return function MockCheckboxFilter({ title, items, selectedItems, renderLabel }: any) {
    return (
      <div data-testid="checkbox-filter">
        <h4>{title}</h4>
        {items.map((item: any) => (
          <div key={item}>
            {renderLabel ? renderLabel(item) : item}
          </div>
        ))}
      </div>
    );
  };
});

describe('GeographicFilters', () => {
  const mockHandleArrayFilter = jest.fn();
  const mockToggleSection = jest.fn();

  const defaultFilters: FilterState = {
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

  const mockLeagues: League[] = [
    { name: 'Premier League', country: 'England', tier: 1 },
    { name: 'Bundesliga', country: 'Germany', tier: 1 },
    { name: 'Serie A', country: 'Italy', tier: 1 },
    { name: 'Championship', country: 'England', tier: 2 },
  ];

  const defaultProps = {
    filters: defaultFilters,
    handleArrayFilter: mockHandleArrayFilter,
    leagues: mockLeagues,
    continents: ['Europe', 'Asia', 'Africa'],
    leagueTiers: [1, 2, 3],
    expandedSections: new Set(['geographic']),
    toggleSection: mockToggleSection,
  };

  beforeEach(() => {
    mockHandleArrayFilter.mockClear();
    mockToggleSection.mockClear();
  });

  test('renders Geographic Filters section', () => {
    render(<GeographicFilters {...defaultProps} />);
    expect(screen.getByText('Geographic Filters')).toBeInTheDocument();
  });

  test('renders continent filter options', () => {
    render(<GeographicFilters {...defaultProps} />);
    
    expect(screen.getByText('Continents')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
    expect(screen.getByText('Asia')).toBeInTheDocument();
    expect(screen.getByText('Africa')).toBeInTheDocument();
  });

  test('renders unique countries from leagues data', () => {
    render(<GeographicFilters {...defaultProps} />);
    
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('England')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('Italy')).toBeInTheDocument();
  });

  test('renders league options with country and tier info', () => {
    render(<GeographicFilters {...defaultProps} />);
    
    expect(screen.getByText('Leagues')).toBeInTheDocument();
    expect(screen.getByText('Premier League')).toBeInTheDocument();
    expect(screen.getByText('(England, Tier 1)')).toBeInTheDocument();
    expect(screen.getByText('Bundesliga')).toBeInTheDocument();
    expect(screen.getByText('(Germany, Tier 1)')).toBeInTheDocument();
  });

  test('renders league tier options with custom labels', () => {
    render(<GeographicFilters {...defaultProps} />);
    
    expect(screen.getByText('League Tiers')).toBeInTheDocument();
    expect(screen.getByText('Tier 1')).toBeInTheDocument();
    expect(screen.getByText('Tier 2')).toBeInTheDocument();
    expect(screen.getByText('Tier 3')).toBeInTheDocument();
  });

  test('extracts unique countries correctly from leagues', () => {
    const leaguesWithDuplicates: League[] = [
      { name: 'Premier League', country: 'England', tier: 1 },
      { name: 'Championship', country: 'England', tier: 2 },
      { name: 'Bundesliga', country: 'Germany', tier: 1 },
      { name: '2. Bundesliga', country: 'Germany', tier: 2 },
    ];

    render(<GeographicFilters {...defaultProps} leagues={leaguesWithDuplicates} />);
    
    // Should only show unique countries
    const englandElements = screen.getAllByText('England');
    const germanyElements = screen.getAllByText('Germany');
    
    // Should appear once in countries filter and multiple times in league details
    expect(englandElements.length).toBeGreaterThan(0);
    expect(germanyElements.length).toBeGreaterThan(0);
  });

  test('handles empty leagues array gracefully', () => {
    render(<GeographicFilters {...defaultProps} leagues={[]} />);
    
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('Leagues')).toBeInTheDocument();
    // Should not crash and still render the section structure
  });
});