import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logServer } from '@/lib/errorLogger';

interface Props {
  children: React.ReactNode;
  stepName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class StepErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error.message || 'Unknown error';
    const firstLine = errorMessage.split('\n')[0];

    // Log full error to console in DEV
    if (import.meta.env.DEV) {
      console.error(`[${this.props.stepName}] Error caught:`, error);
      console.error(`[${this.props.stepName}] Error info:`, errorInfo);
    }

    // Send error to API in production
    if (import.meta.env.PROD) {
      logServer('error', `[${this.props.stepName}] ${firstLine}`, {
        step: this.props.stepName,
        error: errorMessage,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleToggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const errorMessage = this.state.error.message || 'Unknown error';
      const firstLine = errorMessage.split('\n')[0];

      return (
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="bg-[var(--ui-danger)]/10 border border-[var(--ui-danger)]/20 rounded-[var(--r-md)] p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[var(--ui-danger)]">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--ui-danger)] mb-1">
                    Something went wrong in {this.props.stepName}
                  </div>
                  <div className="text-sm text-[var(--ui-danger)]/80">
                    {firstLine}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleToggleDetails}
                  className="text-sm text-[var(--ui-danger)] hover:text-[var(--ui-danger)]/80 underline-offset-2 hover:underline"
                >
                  {this.state.showDetails ? 'Hide' : 'Details'}
                </button>
                <button
                  onClick={this.handleReset}
                  className="text-sm bg-[var(--ui-danger)] text-white px-3 py-1 rounded-[var(--r-sm)] hover:bg-[var(--ui-danger-press)] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>

            <AnimatePresence>
              {this.state.showDetails && (
                <motion.div
                  className="mt-3 pt-3 border-t border-[var(--ui-danger)]/20"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-xs font-mono text-[var(--ui-danger)]/80 whitespace-pre-wrap break-all bg-[var(--ui-danger)]/5 rounded-[var(--r-sm)] p-4">
                    <strong>Error:</strong> {errorMessage}
                    {this.state.error.stack && (
                      <>
                        <br /><br />
                        <strong>Stack:</strong><br />
                        {this.state.error.stack}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default StepErrorBoundary;
