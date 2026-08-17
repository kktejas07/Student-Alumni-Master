/**
 * frontend/src/analytics/components/Trackable.tsx
 *
 * Generic Component Wrapper for Click & Impression Tracking.
 * Supports both Descriptor Registry (el={elementDescriptor}) and string IDs (id={id}).
 * Auto-derives fallback auto-IDs if neither is provided.
 */

import React, { cloneElement, isValidElement, ReactElement } from 'react';
import { dispatcher } from '../core/dispatcher';
import { useImpression } from '../hooks/useImpression';
import { ElementDescriptor } from '../types';

export interface TrackableProps {
  id?: string;
  el?: ElementDescriptor;
  label?: string;
  props?: Record<string, any>;
  impression?: boolean;
  disabled?: boolean;
  onPress?: (...args: any[]) => any;
  children: ReactElement;
}

export const Trackable: React.FC<TrackableProps> = ({
  id: explicitId,
  el,
  label: explicitLabel,
  props = {},
  impression = false,
  disabled = false,
  onPress: parentOnPress,
  children,
}) => {
  // Resolve ID from descriptor or explicit prop or auto-derived
  const targetId = el?.id || explicitId || 'sa.global.auto.btn.untracked';
  const idSource = el?.id ? 'descriptor' : explicitId ? 'explicit' : 'auto';

  const impressionRef = useImpression(targetId, {
    once: true,
    props,
  });

  if (!isValidElement(children)) {
    return children;
  }

  const childProps = children.props as any;
  const originalOnPress = parentOnPress || childProps.onPress || childProps.onClick;

  const derivedLabel =
    explicitLabel ||
    el?.label ||
    childProps['aria-label'] ||
    (typeof childProps.children === 'string' ? childProps.children : undefined);

  const handlePress = (...args: any[]) => {
    // 1. Emit element_click
    dispatcher.track('element_click', {
      element_id: targetId,
      element_label: derivedLabel,
      element_type: el?.type,
      surface: el?.surface,
      area: el?.area,
      id_source: idSource,
      interaction_blocked: disabled,
      ...(el?.emits ? { emits_conversion: el.emits } : {}),
      ...props,
    });

    // 2. If descriptor emits a conversion event, emit that too
    if (el?.emits) {
      dispatcher.track(el.emits, {
        element_id: targetId,
        ...props,
      });
    }

    // 3. Invoke original handler if not disabled
    if (!disabled && originalOnPress) {
      originalOnPress(...args);
    }
  };

  // Build injected props
  const injectedProps: Record<string, any> = {
    onPress: handlePress,
    onClick: handlePress,
    // Web dataset attributes for PostHog autocapture and DOM listener
    'data-analytics-id': targetId,
    'data-attr': targetId,
    'data-ph-capture-attribute-analytics-id': targetId,
    dataSet: {
      ...(childProps.dataSet || {}),
      analyticsId: targetId,
    },
    // Native posthog label
    'ph-label': targetId,
  };

  if (impression) {
    injectedProps.ref = impressionRef;
  }

  return cloneElement(children, injectedProps);
};
