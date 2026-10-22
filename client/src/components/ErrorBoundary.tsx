import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true, error: _error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-0 p-4">
          <div className="bg-surface-1 rounded-lg border border-line p-8 text-center">
            <h2 className="font-display font-semibold text-lg text-ink mb-2">Something went wrong</h2>
            <p className="text-sm text-ink-muted mb-4">{this.state.error ?? 'Unknown error'}</p>
            <button onClick={this.handleRetry} className="py-2 px-4 rounded-md bg-accent text-surface-0 text-sm font-medium hover:bg-accent-hover">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };
}
