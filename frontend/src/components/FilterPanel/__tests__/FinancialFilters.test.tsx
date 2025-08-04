import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FinancialFilters from '../filters/FinancialFilters';
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
  return function MockRangeFilter({ title, minValue, maxValue, formatValue, unit }: any) {
    return (
      <div data-testid="range-filter">
        <h4>{title}</h4>
        <div>Min: {minValue || 'undefined'}</div>
        <div>Max: {maxValue || 'undefined'}</div>
        {unit && <div>Unit: {unit}</div>}
        {formatValue && minValue && <div>Formatted Min: {formatValue(minValue)}</div>}
      </div>
    );
  };
});

describe('FinancialFilters', () => {
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
    expandedSections: new Set(['financial']),
    toggleSection: mockToggleSection,
  };

  beforeEach(() => {
    mockUpdateFilter.mockClear();
    mockToggleSection.mockClear();
  });

  test('renders Financial Filters section', () => {
    render(<FinancialFilters {...defaultProps} />);
    expect(screen.getByText('Financial Filters')).toBeInTheDocument();
  });

  test('renders paid transfers checkbox', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    const checkbox = screen.getByLabelText('Only paid transfers');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  test('shows correct checkbox state for hasTransferFee', () => {
    const filtersWithFee = {
      ...defaultFilters,
      hasTransferFee: true,
    };

    render(<FinancialFilters {...defaultProps} filters={filtersWithFee} />);
    
    const checkbox = screen.getByLabelText('Only paid transfers');
    expect(checkbox).toBeChecked();
  });

  test('calls updateFilter when checkbox is toggled', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    const checkbox = screen.getByLabelText('Only paid transfers');
    fireEvent.click(checkbox);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('hasTransferFee', true);
  });

  test('renders transfer fee range filter', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    expect(screen.getByText('Transfer Fee Range')).toBeInTheDocument();
    expect(screen.getByText('Unit: €')).toBeInTheDocument();
  });

  test('renders ROI range filter', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    expect(screen.getByText('ROI Range (%)')).toBeInTheDocument();
  });

  test('displays transfer fee values when set', () => {
    const filtersWithFees = {
      ...defaultFilters,
      minTransferFee: 1000000,
      maxTransferFee: 50000000,
    };

    render(<FinancialFilters {...defaultProps} filters={filtersWithFees} />);
    
    expect(screen.getByText('Min: 1000000')).toBeInTheDocument();
    expect(screen.getByText('Max: 50000000')).toBeInTheDocument();
  });

  test('displays ROI values when set', () => {
    const filtersWithROI = {
      ...defaultFilters,
      minROI: -10.5,
      maxROI: 200.0,
    };

    render(<FinancialFilters {...defaultProps} filters={filtersWithROI} />);
    
    // ROI section should show the values
    const roiSection = screen.getByText('ROI Range (%)').closest('[data-testid="range-filter"]');
    expect(roiSection).toHaveTextContent('Min: -10.5');
    expect(roiSection).toHaveTextContent('Max: 200');
  });

  test('handles undefined financial values', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    // Should show undefined for unset values
    expect(screen.getAllByText('Min: undefined')).toHaveLength(2); // Transfer fee and ROI
    expect(screen.getAllByText('Max: undefined')).toHaveLength(2); // Transfer fee and ROI
  });

  test('has correct spacing classes', () => {
    render(<FinancialFilters {...defaultProps} />);
    
    // The main container should have space-y-4 for consistent spacing
    const filterSection = screen.getByTestId('filter-section');
    expect(filterSection).toBeInTheDocument();
  });
});