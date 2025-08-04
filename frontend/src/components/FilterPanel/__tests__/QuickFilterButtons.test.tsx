import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickFilterButtons from '../components/QuickFilterButtons';

// Mock the updateFilter function
const mockUpdateFilter = jest.fn();

describe('QuickFilterButtons', () => {
  beforeEach(() => {
    mockUpdateFilter.mockClear();
  });

  test('renders Quick Filters section title', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    expect(screen.getByText('Quick Filters')).toBeInTheDocument();
  });

  test('renders all quick filter buttons', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    expect(screen.getByText('Bundesliga Only')).toBeInTheDocument();
    expect(screen.getByText('European Leagues')).toBeInTheDocument();
    expect(screen.getByText('Sales Only')).toBeInTheDocument();
    expect(screen.getByText('Big Transfers (€10M+)')).toBeInTheDocument();
    expect(screen.getByText('Successful Only')).toBeInTheDocument();
  });

  test('Bundesliga Only button updates filters correctly', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const bundesligaButton = screen.getByText('Bundesliga Only');
    fireEvent.click(bundesligaButton);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('leagues', ['Bundesliga']);
    expect(mockUpdateFilter).toHaveBeenCalledWith('continents', []);
    expect(mockUpdateFilter).toHaveBeenCalledWith('countries', []);
  });

  test('European Leagues button updates filters correctly', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const europeanButton = screen.getByText('European Leagues');
    fireEvent.click(europeanButton);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('leagues', ['Premier League']);
    expect(mockUpdateFilter).toHaveBeenCalledWith('continents', []);
    expect(mockUpdateFilter).toHaveBeenCalledWith('countries', []);
  });

  test('Sales Only button updates filters correctly', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const salesButton = screen.getByText('Sales Only');
    fireEvent.click(salesButton);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('transferTypes', ['sale']);
    expect(mockUpdateFilter).toHaveBeenCalledWith('excludeLoans', true);
  });

  test('Big Transfers button updates filters correctly', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const bigTransfersButton = screen.getByText('Big Transfers (€10M+)');
    fireEvent.click(bigTransfersButton);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('minTransferFee', 10000000);
    expect(mockUpdateFilter).toHaveBeenCalledWith('hasTransferFee', true);
  });

  test('Successful Only button updates filters correctly', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const successfulButton = screen.getByText('Successful Only');
    fireEvent.click(successfulButton);
    
    expect(mockUpdateFilter).toHaveBeenCalledWith('onlySuccessfulTransfers', true);
  });

  test('buttons have correct CSS classes', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('px-3', 'py-1', 'text-sm', 'rounded-md', 'transition-colors');
    });
  });

  test('buttons have different color schemes', () => {
    render(<QuickFilterButtons updateFilter={mockUpdateFilter} />);
    
    const bundesligaButton = screen.getByText('Bundesliga Only');
    expect(bundesligaButton).toHaveClass('bg-red-100', 'hover:bg-red-200', 'text-red-800');
    
    const europeanButton = screen.getByText('European Leagues');
    expect(europeanButton).toHaveClass('bg-purple-100', 'hover:bg-purple-200', 'text-purple-800');
    
    const salesButton = screen.getByText('Sales Only');
    expect(salesButton).toHaveClass('bg-green-100', 'hover:bg-green-200', 'text-green-800');
    
    const bigTransfersButton = screen.getByText('Big Transfers (€10M+)');
    expect(bigTransfersButton).toHaveClass('bg-yellow-100', 'hover:bg-yellow-200', 'text-yellow-800');
    
    const successfulButton = screen.getByText('Successful Only');
    expect(successfulButton).toHaveClass('bg-emerald-100', 'hover:bg-emerald-200', 'text-emerald-800');
  });
});