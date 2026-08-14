/**
 * frontend/src/analytics/components/TrackedCard.tsx
 *
 * Card component wrapper with automatic impression and optional click tracking.
 */

import React from 'react';
import { View, ViewProps } from 'react-native';
import { Trackable } from './Trackable';

export interface TrackedCardProps extends ViewProps {
  id: string;
  label?: string;
  analyticsProps?: Record<string, any>;
  onPress?: () => void;
  children: React.ReactNode;
}

export const TrackedCard: React.FC<TrackedCardProps> = ({
  id,
  label,
  analyticsProps,
  onPress,
  children,
  ...rest
}) => {
  return (
    <Trackable id={id} label={label} props={analyticsProps} impression onPress={onPress}>
      <View {...rest}>{children}</View>
    </Trackable>
  );
};
