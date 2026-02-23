import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '@/shared/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    captureException(error, {
      fingerprint: ['error-boundary'],
      tags: { error_type: 'error_boundary' },
      extra: { componentStack: info.componentStack },
      level: 'fatal',
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            오류가 발생했습니다.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {this.state.error?.message ?? '알 수 없는 오류'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              background: '#111318',
              color: '#fff',
              cursor: 'pointer',
              border: 'none',
              fontSize: '0.875rem',
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
