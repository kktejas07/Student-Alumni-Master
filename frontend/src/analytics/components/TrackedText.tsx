/**
 * frontend/src/analytics/components/TrackedText.tsx
 *
 * Text component wrapper for interactive/copyable text.
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { Trackable } from './Trackable';

export interface TrackedTextProps extends TextProps {
  id: string;
  label?: string;
  analyticsProps?: Record<string, any>;
}

export const TrackedText: React.FC<TrackedTextProps> = ({
  id,
  label,
  analyticsProps,
  onPress,
  children,
  ...rest
}) => {
  if (!onPress) {
    return <Text {...rest}>{children}</Text>;
  }

  return (
    <Trackable id={id} label={label} props={analyticsProps} onPress={onPress}>
      <Text {...rest}>{children}</Text>
    </Trackable>
  );
};
