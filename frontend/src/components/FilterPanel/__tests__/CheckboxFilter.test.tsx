import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckboxFilter from '../components/CheckboxFilter';

describe('CheckboxFilter', () => {
  const mockOnItemChange = jest.fn();
  const defaultProps = {
    title: 'Test Filter',
    items: ['item1', 'item2', 'item3'],
    selectedItems: ['item1'],
    onItemChange: mockOnItemChange,
  };

  beforeEach(() => {
    mockOnItemChange.mockClear();
  });

  test('renders title and items correctly', () => {
    render(<CheckboxFilter {...defaultProps} />);
    
    expect(screen.getByText('Test Filter')).toBeInTheDocument();
    expect(screen.getByText('item1')).toBeInTheDocument();
    expect(screen.getByText('item2')).toBeInTheDocument();
    expect(screen.getByText('item3')).toBeInTheDocument();
  });

  test('shows correct checked state', () => {
    render(<CheckboxFilter {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // item1 is selected
    expect(checkboxes[1]).not.toBeChecked(); // item2 is not selected
    expect(checkboxes[2]).not.toBeChecked(); // item3 is not selected
  });

  test('calls onItemChange when checkbox is clicked', () => {
    render(<CheckboxFilter {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Click item2
    
    expect(mockOnItemChange).toHaveBeenCalledWith('item2', true);
  });

  test('uses custom renderLabel when provided', () => {
    const customRenderLabel = (item: string) => `Custom ${item}`;
    
    render(
      <CheckboxFilter 
        {...defaultProps} 
        renderLabel={customRenderLabel}
      />
    );
    
    expect(screen.getByText('Custom item1')).toBeInTheDocument();
    expect(screen.getByText('Custom item2')).toBeInTheDocument();
    expect(screen.getByText('Custom item3')).toBeInTheDocument();
  });
});