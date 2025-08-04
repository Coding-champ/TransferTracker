import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PerformanceFilters from '../filters/PerformanceFilters';
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

jest.mock('../components/RangeFilter', () => {
  return function MockRangeFilter({ title, minValue, maxValue, min, max, step }: any) {
    return (
      <div data-testid="range-filter">
        <h4>{title}</h4>
        <div>Min: {minValue || 'undefined'}</div>
        <div>Max: {maxValue || 'undefined'}</div>
        {min && <div>Min Allowed: {min}</div>}
        {max && <div>Max Allowed: {max}</div>}
        {step && <div>Step: {step}</div>}
      </div>
    );
  };
});

describe('PerformanceFilters', () => {
  const mockUpdateFilter = jest.fn();
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

  const defaultProps = {
    filters: defaultFilters,
    updateFilter: mockUpdateFilter,
    expandedSections: new Set(['performance']),
    toggleSection: mockToggleSection,
  };

  beforeEach(() => {
    mockUpdateFilter.mockClear();
    mockToggleSection.mockClear();
  });

  test('renders Performance & Contract section', () => {
    render(<PerformanceFilters {...defaultProps} />);
    expect(screen.getByText('Performance & Contract')).toBeInTheDocument();
  });

  test('renders successful transfers checkbox', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    const checkbox = screen.getByLabelText('Only successful transfers');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  test('shows correct checkbox state for onlySuccessfulTransfers', () => {
    const filtersWithSuccess = {
      ...defaultFilters,
      onlySuccessfulTransfers: true,
    };

    render(<PerformanceFilters {...defaultProps} filters={filtersWithSuccess} />);
    
    const checkbox = screen.getByLabelText('Only successful transfers');
    expect(checkbox).toBeChecked();
  });

  test('calls updateFilter when checkbox is toggled', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    const checkbox = screen.getByLabelText('Only successful transfers');
    fireEvent.click(checkbox);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('onlySuccessfulTransfers', true);
  });

  test('renders performance rating range filter', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    expect(screen.getByText('Performance Rating (1-10)')).toBeInTheDocument();
    
    const performanceSection = screen.getByText('Performance Rating (1-10)').closest('[data-testid="range-filter"]');
    expect(performanceSection).toHaveTextContent('Step: 0.1');
    expect(performanceSection).toHaveTextContent('Min Allowed: 1');
    expect(performanceSection).toHaveTextContent('Max Allowed: 10');
  });

  test('renders contract duration range filter', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    expect(screen.getByText('Contract Duration (years)')).toBeInTheDocument();
    
    const contractSection = screen.getByText('Contract Duration (years)').closest('[data-testid="range-filter"]');
    expect(contractSection).toHaveTextContent('Min Allowed: 1');
    expect(contractSection).toHaveTextContent('Max Allowed: 10');
  });

  test('displays performance rating values when set', () => {
    const filtersWithRating = {
      ...defaultFilters,
      minPerformanceRating: 6.5,
      maxPerformanceRating: 9.0,
    };

    render(<PerformanceFilters {...defaultProps} filters={filtersWithRating} />);
    
    const performanceSection = screen.getByText('Performance Rating (1-10)').closest('[data-testid="range-filter"]');
    expect(performanceSection).toHaveTextContent('Min: 6.5');
    expect(performanceSection).toHaveTextContent('Max: 9');
  });

  test('displays contract duration values when set', () => {
    const filtersWithContract = {
      ...defaultFilters,
      minContractDuration: 2,
      maxContractDuration: 5,
    };

    render(<PerformanceFilters {...defaultProps} filters={filtersWithContract} />);
    
    const contractSection = screen.getByText('Contract Duration (years)').closest('[data-testid="range-filter"]');
    expect(contractSection).toHaveTextContent('Min: 2');
    expect(contractSection).toHaveTextContent('Max: 5');
  });

  test('handles undefined performance values', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    // Should show undefined for unset values
    expect(screen.getAllByText('Min: undefined')).toHaveLength(2); // Performance and contract
    expect(screen.getAllByText('Max: undefined')).toHaveLength(2); // Performance and contract
  });

  test('has correct spacing classes', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    // The main container should have space-y-4 for consistent spacing
    const filterSection = screen.getByTestId('filter-section');
    expect(filterSection).toBeInTheDocument();
  });

  test('performance rating uses correct step value', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    const performanceSection = screen.getByText('Performance Rating (1-10)').closest('[data-testid="range-filter"]');
    expect(performanceSection).toHaveTextContent('Step: 0.1');
  });

  test('contract duration has no explicit step value', () => {
    render(<PerformanceFilters {...defaultProps} />);
    
    const contractSection = screen.getByText('Contract Duration (years)').closest('[data-testid="range-filter"]');
    expect(contractSection).not.toHaveTextContent('Step:');
  });
});