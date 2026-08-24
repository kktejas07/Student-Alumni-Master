/**
 * frontend/src/analytics/components/AnalyticsErrorBoundary.tsx
 *
 * React Error Boundary that automatically captures UI rendering errors
 * and dispatches 'app_error' events to Firebase Analytics and PostHog.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { dispatcher } from '../core/dispatcher';
import { EVENTS } from '../constants/events';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    dispatcher.track(EVENTS.APP_ERROR, {
      error_message: error.message || 'Unknown React rendering error',
      error_name: error.name || 'Error',
      component_stack: errorInfo.componentStack ? errorInfo.componentStack.slice(0, 300) : '',
      screen: this.props.screenName || 'unknown_screen',
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: 24,
            margin: 16,
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontFamily: 'sans-serif',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Something went wrong</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d' }}>
            A user interface error occurred. Our team has been automatically notified.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
