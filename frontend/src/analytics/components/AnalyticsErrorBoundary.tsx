/**
 * frontend/src/analytics/components/AnalyticsErrorBoundary.tsx
 *
 * React Error Boundary that automatically captures UI rendering errors
 * and dispatches 'app_error' events to Firebase Analytics and PostHog.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, ScrollView, Text } from 'react-native';
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
      // Rendered with React Native primitives so the fallback itself works on
      // iOS/Android as well as web (an HTML fallback here turned every native
      // crash into a second crash).
      return (
        <ScrollView
          style={{ margin: 16, borderRadius: 12, backgroundColor: '#1A0B0B', borderWidth: 1, borderColor: '#7F1D1D' }}
          contentContainerStyle={{ padding: 24 }}
        >
          <Text style={{ marginBottom: 8, fontSize: 16, color: '#EF4444', fontWeight: '600' }}>Something went wrong</Text>
          <Text style={{ marginBottom: 12, fontSize: 13, color: '#FCA5A5' }}>
            {this.state.error?.message || 'A user interface error occurred.'}
          </Text>
          {this.state.error?.stack ? (
            <Text style={{ fontSize: 11, color: '#9CA3AF', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }} numberOfLines={30}>
              {this.state.error.stack}
            </Text>
          ) : null}
        </ScrollView>
      );
    }

    return this.props.children;
  }
}
