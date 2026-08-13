import React, { Component, type ErrorInfo, type ReactNode } from "react";
import AppStatusPage from "./AppStatusPage";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught-Application-Error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AppStatusPage
          type="error"
          title="Application Anomaly Caught"
          subtitle="A runtime error occurred during rendering."
          description="We've contained the issue to prevent data corruption. You can safely return to your operational dashboard."
          errorMessage={this.state.error?.message}
          onRetry={this.handleReset}
          showBackButton={true}
          showHomeButton={true}
        />
      );
    }

    return this.props.children;
  }
}
