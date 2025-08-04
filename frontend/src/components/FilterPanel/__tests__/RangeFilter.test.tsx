import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RangeFilter from '../components/RangeFilter';

describe('RangeFilter', () => {
  const mockOnMinChange = jest.fn();
  const mockOnMaxChange = jest.fn();
  const defaultProps = {
    title: 'Test Range',
    onMinChange: mockOnMinChange,
    onMaxChange: mockOnMaxChange,
  };

  beforeEach(() => {
    mockOnMinChange.mockClear();
    mockOnMaxChange.mockClear();
  });

  test('renders title and input fields', () => {
    render(<RangeFilter {...defaultProps} />);
    
    expect(screen.getByText('Test Range')).toBeInTheDocument();
    expect(screen.getByLabelText(/min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max/i)).toBeInTheDocument();
  });

  test('displays current values in inputs', () => {
    render(
      <RangeFilter 
        {...defaultProps} 
        minValue={10} 
        maxValue={100} 
      />
    );
    
    const minInput = screen.getByLabelText(/min/i) as HTMLInputElement;
    const maxInput = screen.getByLabelText(/max/i) as HTMLInputElement;
    
    expect(minInput.value).toBe('10');
    expect(maxInput.value).toBe('100');
  });

  test('calls onMinChange when min input changes', () => {
    render(<RangeFilter {...defaultProps} />);
    
    const minInput = screen.getByLabelText(/min/i);
    fireEvent.change(minInput, { target: { value: '25' } });
    
    expect(mockOnMinChange).toHaveBeenCalledWith(25);
  });

  test('calls onMaxChange when max input changes', () => {
    render(<RangeFilter {...defaultProps} />);
    
    const maxInput = screen.getByLabelText(/max/i);
    fireEvent.change(maxInput, { target: { value: '75' } });
    
    expect(mockOnMaxChange).toHaveBeenCalledWith(75);
  });

  test('handles empty input values', () => {
    render(<RangeFilter {...defaultProps} minValue={25} />);
    
    const minInput = screen.getByLabelText(/min/i);
    // Clear the input by setting empty value
    fireEvent.change(minInput, { target: { value: '' } });
    
    expect(mockOnMinChange).toHaveBeenCalledWith(undefined);
  });

  test('displays unit in labels when provided', () => {
    render(<RangeFilter {...defaultProps} unit="€" />);
    
    expect(screen.getByText(/min \(€\)/i)).toBeInTheDocument();
    expect(screen.getByText(/max \(€\)/i)).toBeInTheDocument();
  });

  test('uses custom placeholder text', () => {
    const placeholder = { min: "0", max: "∞" };
    render(<RangeFilter {...defaultProps} placeholder={placeholder} />);
    
    const minInput = screen.getByLabelText(/min/i) as HTMLInputElement;
    const maxInput = screen.getByLabelText(/max/i) as HTMLInputElement;
    
    expect(minInput.placeholder).toBe('0');
    expect(maxInput.placeholder).toBe('∞');
  });

  test('displays formatted values when formatValue is provided', () => {
    const formatValue = (value: number) => `$${value.toLocaleString()}`;
    
    render(
      <RangeFilter 
        {...defaultProps} 
        minValue={1000} 
        maxValue={5000}
        formatValue={formatValue}
      />
    );
    
    expect(screen.getByText('Min: $1,000')).toBeInTheDocument();
    expect(screen.getByText('Max: $5,000')).toBeInTheDocument();
  });

  test('applies correct step and min/max attributes', () => {
    render(
      <RangeFilter 
        {...defaultProps} 
        step="0.1" 
        min="0" 
        max="10" 
      />
    );
    
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('step', '0.1');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '10');
    });
  });
});