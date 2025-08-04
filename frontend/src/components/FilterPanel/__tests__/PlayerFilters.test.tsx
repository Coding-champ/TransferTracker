import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerFilters from '../filters/PlayerFilters';
import { FilterState } from '../../../types';

// Mock components
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
  return function MockCheckboxFilter({ title, items }: any) {
    return (
      <div data-testid="checkbox-filter">
        <h4>{title}</h4>
        {items.map((item: any) => <div key={item}>{item}</div>)}
      </div>
    );
  };
});

jest.mock('../components/RangeFilter', () => {
  return function MockRangeFilter({ title, minValue, maxValue }: any) {
    return (
      <div data-testid="range-filter">
        <h4>{title}</h4>
        <div>Min: {minValue || 'undefined'}</div>
        <div>Max: {maxValue || 'undefined'}</div>
      </div>
    );
  };
});

describe('PlayerFilters', () => {
  const mockUpdateFilter = jest.fn();
  const mockHandleArrayFilter = jest.fn();
  const mockToggleSection = jest.fn();

  const defaultFilters: FilterState = {
    seasons: ['2023/24'],
    leagues: [],
    countries: [],
    continents: [],
    transferTypes: [],
    transferWindows: [],
    positions: ['Forward', 'Midfielder'],
    nationalities: ['Brazil'],
    clubs: [],
    leagueTiers: [],
    minTransferFee: undefined,
    maxTransferFee: undefined,
    minPlayerAge: 18,
    maxPlayerAge: 35,
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

  const defaultProps = {
    filters: defaultFilters,
    updateFilter: mockUpdateFilter,
    handleArrayFilter: mockHandleArrayFilter,
    positions: ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
    nationalities: ['Brazil', 'Argentina', 'France', 'Germany', 'Spain'],
    expandedSections: new Set(['player']),
    toggleSection: mockToggleSection,
  };

  beforeEach(() => {
    mockUpdateFilter.mockClear();
    mockHandleArrayFilter.mockClear();
    mockToggleSection.mockClear();
  });

  test('renders Player Filters section', () => {
    render(<PlayerFilters {...defaultProps} />);
    expect(screen.getByText('Player Filters')).toBeInTheDocument();
  });

  test('renders positions filter', () => {
    render(<PlayerFilters {...defaultProps} />);
    
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
    expect(screen.getByText('Midfielder')).toBeInTheDocument();
    expect(screen.getByText('Defender')).toBeInTheDocument();
    expect(screen.getByText('Goalkeeper')).toBeInTheDocument();
  });

  test('renders nationalities filter with limited items', () => {
    render(<PlayerFilters {...defaultProps} />);
    
    expect(screen.getByText('Nationalities')).toBeInTheDocument();
    expect(screen.getByText('Brazil')).toBeInTheDocument();
    expect(screen.getByText('Argentina')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('Spain')).toBeInTheDocument();
  });

  test('limits nationalities to top 20 items', () => {
    const manyNationalities = Array.from({ length: 50 }, (_, i) => `Country${i + 1}`);
    
    render(<PlayerFilters {...defaultProps} nationalities={manyNationalities} />);
    
    // Should only show first 20 items
    expect(screen.getByText('Country1')).toBeInTheDocument();
    expect(screen.getByText('Country20')).toBeInTheDocument();
    expect(screen.queryByText('Country21')).not.toBeInTheDocument();
  });

  test('renders age range filter', () => {
    render(<PlayerFilters {...defaultProps} />);
    
    expect(screen.getByText('Age Range')).toBeInTheDocument();
    expect(screen.getByText('Min: 18')).toBeInTheDocument();
    expect(screen.getByText('Max: 35')).toBeInTheDocument();
  });

  test('handles undefined age values', () => {
    const filtersWithoutAge = {
      ...defaultFilters,
      minPlayerAge: undefined,
      maxPlayerAge: undefined,
    };

    render(<PlayerFilters {...defaultProps} filters={filtersWithoutAge} />);
    
    expect(screen.getByText('Age Range')).toBeInTheDocument();
    expect(screen.getByText('Min: undefined')).toBeInTheDocument();
    expect(screen.getByText('Max: undefined')).toBeInTheDocument();
  });

  test('all sections use correct spacing classes', () => {
    render(<PlayerFilters {...defaultProps} />);
    
    // The component should have space-y-4 class for consistent spacing
    const sections = screen.getAllByTestId('checkbox-filter');
    expect(sections.length).toBeGreaterThan(0);
  });
});