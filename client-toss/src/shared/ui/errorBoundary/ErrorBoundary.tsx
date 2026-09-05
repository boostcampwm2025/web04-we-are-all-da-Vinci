import { captureError } from "@/shared/lib";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, {
      level: "fatal",
      tags: { error_type: "error_boundary" },
      fingerprint: ["error-boundary"],
      extra: { componentStack: info.componentStack },
    });
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) return this.props.fallback(this.retry);
    return this.props.children;
  }
}

const ErrorBoundary = (props: ErrorBoundaryProps) => (
  <ErrorBoundaryClass {...props} />
);

export default ErrorBoundary;
