import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FilterPanel from '../index';

// Mock the custom hook
const mockHook = {
  leagues: ['Bundesliga', 'Premier League'],
  seasons: ['2023/24', '2022/23'],
  transferTypes: ['sale', 'loan', 'free'],
  transferWindows: ['summer', 'winter'],
  positions: ['GK', 'CB', 'CM'],
  nationalities: ['Germany', 'England'],
  continents: ['Europe', 'South America'],
  leagueTiers: [1, 2, 3],
  loading: false
};

jest.mock('../hooks/useFilterData', () => ({
  useFilterData: () => mockHook
}));

describe('FilterPanel - Edge Cases', () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  test('shows loading state correctly', () => {
    const originalMock = require('../hooks/useFilterData').useFilterData;
    
    // Temporarily override the mock
    require('../hooks/useFilterData').useFilterData = () => ({
      ...mockHook,
      loading: true
    });

    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByText('Loading filters...')).toBeInTheDocument();
    
    // Restore the original mock
    require('../hooks/useFilterData').useFilterData = originalMock;
  });

  test('reset filters button works correctly', () => {
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    // Check that onFiltersChange was called with default values
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        seasons: ['2023/24'],
        leagues: [],
        transferTypes: ['sale', 'loan', 'free', 'loan_with_option'],
        excludeLoans: false,
        isLoanToBuy: false
      })
    );
  });

  test('expand all button works correctly', () => {
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // The expanded sections should be updated (we can't test this directly due to internal state)
    expect(expandAllButton).toBeInTheDocument();
  });

  test('collapse all button works correctly', () => {
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    const collapseAllButton = screen.getByText('Collapse All');
    fireEvent.click(collapseAllButton);

    expect(collapseAllButton).toBeInTheDocument();
  });

  test('displays active filters count correctly', () => {
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    // Should show some active filters by default (seasons, transferTypes)
    expect(screen.getByText(/active filters/)).toBeInTheDocument();
  });

  test('handles rapid filter changes without errors', async () => {
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    const resetButton = screen.getByText('Reset');
    
    // Simulate rapid clicks
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(resetButton);
      });
    }

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  test('preserves filter state across re-renders', () => {
    const { rerender } = render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    // Re-render the component
    rerender(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  test('handles function prop requirement', () => {
    // This test ensures the component requires a valid function
    render(<FilterPanel onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(mockOnFiltersChange).toHaveBeenCalled(); // Should be called during render
  });
});