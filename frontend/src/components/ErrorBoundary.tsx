import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleError, isApiTimeoutError, isApiNotFoundError, isNetworkError } from '../utils/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorType?: string;
  canRetry?: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const processedError = handleError(error);
    
    // Determine if the error can be retried
    const canRetry = isApiTimeoutError(processedError) || 
                     isNetworkError(processedError) ||
                     isApiNotFoundError(processedError);
    
    return { 
      hasError: true, 
      error: processedError,
      errorType: processedError.name,
      canRetry
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced logging with structured error information
    const errorDetails = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorBoundary: Component Error Caught');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Details:', errorDetails);
      console.groupEnd();
    }

    // Send to external error tracking in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, errorDetails);
      console.error('Production Error:', errorDetails);
    }

    this.setState({
      error,
      errorInfo,
      errorType: error.name
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  private getErrorMessage(): { title: string; description: string; icon: string } {
    const { error, errorType } = this.state;

    if (isApiTimeoutError(error)) {
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please check your connection and try again.',
        icon: '⏰'
      };
    }

    if (isApiNotFoundError(error)) {
      return {
        title: 'Data Not Found',
        description: 'The requested data could not be found. Please try refreshing or contact support.',
        icon: '🔍'
      };
    }

    if (isNetworkError(error)) {
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        icon: '🌐'
      };
    }

    if (errorType === 'ChunkLoadError') {
      return {
        title: 'Loading Error',
        description: 'Failed to load application resources. Please refresh the page.',
        icon: '📦'
      };
    }

    return {
      title: 'Something went wrong',
      description: 'An unexpected error occurred while rendering this component.',
      icon: '⚠️'
    };
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, icon } = this.getErrorMessage();
      const { canRetry } = this.state;

      // Enhanced error UI with better UX
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
          <div className="text-center text-red-600 p-6 max-w-md">
            <div className="text-6xl mb-4">{icon}</div>
            <div className="text-lg font-semibold mb-2 text-gray-900">{title}</div>
            <div className="text-sm text-gray-600 mb-6">
              {description}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-6 p-4 bg-gray-100 rounded">
                <summary className="cursor-pointer font-medium text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs overflow-auto text-gray-800 max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;