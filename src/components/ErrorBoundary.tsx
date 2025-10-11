import React from 'react';
import { Button } from '@/components/design-system';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to your error reporting service here if you have one
    if (import.meta.env.DEV) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error!} resetError={this.handleReset} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg)] text-[var(--ui-text)]">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="mb-6">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
              <p className="text-[var(--ui-text-dim)] mb-4">
                The app encountered an unexpected error. This usually happens due to a bad import or runtime bug.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left bg-[var(--ui-panel)] rounded-[var(--r-md)] p-4">
                <summary className="cursor-pointer text-sm font-mono text-[var(--ui-text-dim)] mb-2">
                  Error Details (Dev Mode)
                </summary>
                <div className="text-xs font-mono text-[var(--ui-danger)] whitespace-pre-wrap break-all">
                  <strong>Message:</strong> {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      <br /><br />
                      <strong>Stack:</strong><br />
                      {this.state.error.stack}
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-[var(--ui-text-dim)] mt-4">
              If this keeps happening, check the console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;