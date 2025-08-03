import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error specifically for network visualization
    console.error('NetworkErrorBoundary caught an error in D3 visualization:', error, errorInfo);
    
    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Network-specific error UI
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg border-2 border-red-200">
          <div className="text-center text-red-600 p-6">
            <div className="text-5xl mb-4">🔧</div>
            <div className="text-lg font-semibold mb-2">Visualization Error</div>
            <div className="text-sm text-gray-600 mb-4 max-w-md">
              The network visualization encountered an error. This might be due to:
              <ul className="list-disc list-inside mt-2 text-left">
                <li>Invalid or corrupted data</li>
                <li>D3.js rendering issues</li>
                <li>Browser compatibility problems</li>
              </ul>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-4 p-4 bg-red-50 rounded border">
                <summary className="cursor-pointer font-medium text-red-800">
                  Technical Details
                </summary>
                <pre className="mt-2 text-xs overflow-auto text-red-700">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry Visualization
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;