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
    console.error('[UI ERROR BOUNDARY]', error, errorInfo);
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
            background: '#1A0B0B',
            border: '1px solid #7F1D1D',
            color: '#FCA5A5',
            fontFamily: 'sans-serif',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#EF4444' }}>Something went wrong</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#FCA5A5' }}>
            {this.state.error?.message || 'A user interface error occurred.'}
          </p>
          {this.state.error?.stack ? (
            <pre style={{ fontSize: 11, color: '#9CA3AF', overflowX: 'auto', maxHeight: 200 }}>
              {this.state.error.stack}
            </pre>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}
