import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterSection from '../FilterSection';

describe('FilterSection', () => {
  const mockOnToggle = jest.fn();
  const defaultProps = {
    title: 'Test Section',
    sectionKey: 'test-section',
    isExpanded: false,
    onToggle: mockOnToggle,
  };

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  test('renders title correctly', () => {
    render(
      <FilterSection {...defaultProps}>
        <div>Test content</div>
      </FilterSection>
    );
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  test('shows + icon when collapsed', () => {
    render(
      <FilterSection {...defaultProps}>
        <div>Test content</div>
      </FilterSection>
    );
    
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.queryByText('−')).not.toBeInTheDocument();
  });

  test('shows − icon when expanded', () => {
    render(
      <FilterSection {...defaultProps} isExpanded={true}>
        <div>Test content</div>
      </FilterSection>
    );
    
    expect(screen.getByText('−')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  test('shows content when expanded', () => {
    render(
      <FilterSection {...defaultProps} isExpanded={true}>
        <div>Test content</div>
      </FilterSection>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('hides content when collapsed', () => {
    render(
      <FilterSection {...defaultProps} isExpanded={false}>
        <div>Test content</div>
      </FilterSection>
    );
    
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
  });

  test('calls onToggle with correct sectionKey when clicked', () => {
    render(
      <FilterSection {...defaultProps}>
        <div>Test content</div>
      </FilterSection>
    );
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith('test-section');
  });

  test('applies correct CSS classes', () => {
    render(
      <FilterSection {...defaultProps}>
        <div>Test content</div>
      </FilterSection>
    );
    
    const container = screen.getByText('Test Section').closest('div');
    expect(container).toHaveClass('border', 'border-gray-200', 'rounded-lg');
  });
});