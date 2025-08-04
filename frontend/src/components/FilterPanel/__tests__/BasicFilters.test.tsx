import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BasicFilters from '../filters/BasicFilters';
import { FilterState } from '../../../types';

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
  return function MockCheckboxFilter({ title, items, selectedItems, onItemChange, renderLabel }: any) {
    return (
      <div data-testid="checkbox-filter">
        <h4>{title}</h4>
        {items.map((item: any) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={(e) => onItemChange(item, e.target.checked)}
            />
            {renderLabel ? renderLabel(item) : item}
          </label>
        ))}
      </div>
    );
  };
});

describe('BasicFilters', () => {
  const mockUpdateFilter = jest.fn();
  const mockHandleArrayFilter = jest.fn();
  const mockToggleSection = jest.fn();

  const defaultFilters: FilterState = {
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

  const defaultProps = {
    filters: defaultFilters,
    updateFilter: mockUpdateFilter,
    handleArrayFilter: mockHandleArrayFilter,
    seasons: ['2023/24', '2022/23', '2021/22'],
    transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
    transferWindows: ['summer', 'winter'],
    expandedSections: new Set(['seasons', 'transferTypes', 'transferWindows']),
    toggleSection: mockToggleSection,
  };

  beforeEach(() => {
    mockUpdateFilter.mockClear();
    mockHandleArrayFilter.mockClear();
    mockToggleSection.mockClear();
  });

  test('renders all filter sections', () => {
    render(<BasicFilters {...defaultProps} />);
    
    expect(screen.getByText('Seasons')).toBeInTheDocument();
    expect(screen.getByText('Transfer Types')).toBeInTheDocument();
    expect(screen.getByText('Transfer Windows')).toBeInTheDocument();
  });

  test('renders season options', () => {
    render(<BasicFilters {...defaultProps} />);
    
    expect(screen.getByText('2023/24')).toBeInTheDocument();
    expect(screen.getByText('2022/23')).toBeInTheDocument();
    expect(screen.getByText('2021/22')).toBeInTheDocument();
  });

  test('renders transfer type options with custom labels', () => {
    render(<BasicFilters {...defaultProps} />);
    
    expect(screen.getByText('Sale')).toBeInTheDocument();
    expect(screen.getByText('Loan')).toBeInTheDocument();
    expect(screen.getByText('Free Transfer')).toBeInTheDocument();
    expect(screen.getByText('Loan with Option')).toBeInTheDocument();
  });

  test('renders transfer window options with custom labels', () => {
    render(<BasicFilters {...defaultProps} />);
    
    expect(screen.getByText('Summer Window')).toBeInTheDocument();
    expect(screen.getByText('Winter Window')).toBeInTheDocument();
  });

  test('renders exclude loans checkbox', () => {
    render(<BasicFilters {...defaultProps} />);
    
    const excludeLoansCheckbox = screen.getByLabelText('Exclude all loans');
    expect(excludeLoansCheckbox).toBeInTheDocument();
    expect(excludeLoansCheckbox).not.toBeChecked();
  });

  test('renders loan-to-buy checkbox', () => {
    render(<BasicFilters {...defaultProps} />);
    
    const loanToBuyCheckbox = screen.getByLabelText('Only loan-to-buy transfers');
    expect(loanToBuyCheckbox).toBeInTheDocument();
    expect(loanToBuyCheckbox).not.toBeChecked();
  });

  test('calls updateFilter when exclude loans checkbox is toggled', () => {
    render(<BasicFilters {...defaultProps} />);
    
    const excludeLoansCheckbox = screen.getByLabelText('Exclude all loans');
    fireEvent.click(excludeLoansCheckbox);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('excludeLoans', true);
  });

  test('calls updateFilter when loan-to-buy checkbox is toggled', () => {
    render(<BasicFilters {...defaultProps} />);
    
    const loanToBuyCheckbox = screen.getByLabelText('Only loan-to-buy transfers');
    fireEvent.click(loanToBuyCheckbox);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('isLoanToBuy', true);
  });

  test('shows correct checkbox states for filter values', () => {
    const filtersWithLoans = {
      ...defaultFilters,
      excludeLoans: true,
      isLoanToBuy: false,
    };

    render(<BasicFilters {...defaultProps} filters={filtersWithLoans} />);
    
    const excludeLoansCheckbox = screen.getByLabelText('Exclude all loans');
    const loanToBuyCheckbox = screen.getByLabelText('Only loan-to-buy transfers');
    
    expect(excludeLoansCheckbox).toBeChecked();
    expect(loanToBuyCheckbox).not.toBeChecked();
  });
});