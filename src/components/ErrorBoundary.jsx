import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

function isChunkLoadError(error) {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    (error.message && (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Unable to preload CSS')
    ))
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" data-testid="error-boundary-fallback">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-huttle-primary/10 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-7 h-7 text-huttle-primary" />
            </div>
            {isChunkError ? (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-2">New version available</h1>
                <p className="text-gray-600 mb-6 text-sm">
                  Huttle has been updated. Refresh to load the latest version.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-600 mb-6 text-sm">
                  The application encountered an unexpected error. Please try refreshing the page.
                </p>
              </>
            )}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500 mb-2">
                  Error details (dev only)
                </summary>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48 text-left">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2.5 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-semibold text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

