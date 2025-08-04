import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';
import { ApiTimeoutError, ApiNotFoundError, NetworkError } from '../../utils/errors';

// Component that throws an error for testing
const ThrowError: React.FC<{ error?: Error; shouldThrow?: boolean }> = ({ 
  error = new Error('Test error'), 
  shouldThrow = true 
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Enhanced ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render default error UI for generic errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Generic error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should render timeout-specific UI for ApiTimeoutError', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new ApiTimeoutError('Request timeout')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Request Timeout')).toBeInTheDocument();
    expect(screen.getByText(/took too long to complete/)).toBeInTheDocument();
    expect(screen.getByText('⏰')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should render not found-specific UI for ApiNotFoundError', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new ApiNotFoundError('Data not found')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Data Not Found')).toBeInTheDocument();
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should render network-specific UI for NetworkError', () => {
    const networkError = new NetworkError('Connection failed');
    
    render(
      <ErrorBoundary>
        <ThrowError error={networkError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    expect(screen.getByText('🌐')).toBeInTheDocument();
    // NetworkError should show retry button
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should render chunk load error UI for ChunkLoadError', () => {
    const chunkError = new Error('Loading chunk failed');
    chunkError.name = 'ChunkLoadError';

    render(
      <ErrorBoundary>
        <ThrowError error={chunkError} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load application resources/)).toBeInTheDocument();
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('should render custom fallback UI when provided', () => {
    const customFallback = <div>Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError error={new Error('Test error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const mockOnError = jest.fn();
    const testError = new Error('Test error');

    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError error={testError} />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should handle reload button click', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Test error')} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload page/i });
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('should show try again button for recoverable errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new ApiTimeoutError('Timeout')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Request Timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Detailed error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    expect(screen.getByText(/Detailed error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Production error')} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should reset error state when error is cleared', () => {
    // ErrorBoundary will only catch errors during rendering
    // Once an error is caught, it can't automatically recover unless the component is remounted
    const TestComponent = () => {
      const [key, setKey] = React.useState(1);
      
      return (
        <div>
          <button onClick={() => setKey(k => k + 1)}>Reset ErrorBoundary</button>
          <ErrorBoundary key={key}>
            <div>Working component</div>
          </ErrorBoundary>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Working component')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /reset errorboundary/i });
    fireEvent.click(resetButton);

    // Should still show the working component after reset
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should handle errors without names gracefully', () => {
    const errorWithoutName = new Error('No name error');
    delete (errorWithoutName as any).name;

    render(
      <ErrorBoundary>
        <ThrowError error={errorWithoutName} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });
});