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
        <div className="font-display flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex flex-col gap-2">
            <p className="font-handwriting text-4xl font-bold">
              오류가 발생했습니다.
            </p>
            <p className="font-display text-2xl text-gray-500">
              다시 시도 버튼을 눌러주세요.
              <br />
              여러 번의 다시 시도에도 실패한다면 홈으로 이동하여 게임을
              재시작해주세요.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="font-handwriting cursor-pointer rounded-lg bg-[#111318] px-5 py-2 text-2xl text-white transition-colors hover:bg-[#2d3139]"
            >
              다시 시도
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="font-handwriting cursor-pointer rounded-lg border border-gray-300 px-5 py-2 text-2xl text-gray-600 transition-colors hover:bg-gray-100"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
