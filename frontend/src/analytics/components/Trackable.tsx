/**
 * frontend/src/analytics/components/Trackable.tsx
 *
 * Generic Component Wrapper for Click & Impression Tracking.
 * Intercepts onPress/onClick handlers and injects web dataset + native ph-label attributes.
 */

import React, { cloneElement, isValidElement, ReactElement } from 'react';
import { dispatcher } from '../core/dispatcher';
import { useImpression } from '../hooks/useImpression';

export interface TrackableProps {
  id: string;
  label?: string;
  props?: Record<string, any>;
  impression?: boolean;
  disabled?: boolean;
  onPress?: (...args: any[]) => any;
  children: ReactElement;
}

export const Trackable: React.FC<TrackableProps> = ({
  id,
  label,
  props = {},
  impression = false,
  disabled = false,
  onPress: parentOnPress,
  children,
}) => {
  const impressionRef = useImpression(id, {
    once: true,
    props,
  });

  if (!isValidElement(children)) {
    return children;
  }

  const childProps = children.props as any;
  const originalOnPress = parentOnPress || childProps.onPress || childProps.onClick;

  const derivedLabel =
    label ||
    childProps['aria-label'] ||
    (typeof childProps.children === 'string' ? childProps.children : undefined);

  const handlePress = (...args: any[]) => {
    // 1. Emit element_click
    dispatcher.track('element_click', {
      element_id: id,
      element_label: derivedLabel,
      interaction_blocked: disabled,
      ...props,
    });

    // 2. Invoke original handler if not disabled
    if (!disabled && originalOnPress) {
      originalOnPress(...args);
    }
  };

  // Build injected props
  const injectedProps: Record<string, any> = {
    onPress: handlePress,
    onClick: handlePress,
    // Web dataset attributes for PostHog autocapture and DOM listener
    'data-analytics-id': id,
    'data-attr': id,
    'data-ph-capture-attribute-analytics-id': id,
    dataSet: {
      ...(childProps.dataSet || {}),
      analyticsId: id,
    },
    // Native posthog label
    'ph-label': id,
  };

  if (impression) {
    injectedProps.ref = impressionRef;
  }

  return cloneElement(children, injectedProps);
};
