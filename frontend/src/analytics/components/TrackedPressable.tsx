/**
 * frontend/src/analytics/components/TrackedPressable.tsx
 *
 * Pressable wrapper with built-in analytics.
 */

import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import { Trackable } from './Trackable';

export interface TrackedPressableProps extends PressableProps {
  id: string;
  label?: string;
  analyticsProps?: Record<string, any>;
  impression?: boolean;
}

export const TrackedPressable: React.FC<TrackedPressableProps> = ({
  id,
  label,
  analyticsProps,
  impression,
  disabled,
  onPress,
  children,
  ...rest
}) => {
  return (
    <Trackable
      id={id}
      label={label}
      props={analyticsProps}
      impression={impression}
      disabled={Boolean(disabled)}
      onPress={onPress}
    >
      <Pressable disabled={disabled} {...rest}>
        {children}
      </Pressable>
    </Trackable>
  );
};
