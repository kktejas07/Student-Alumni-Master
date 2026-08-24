import React, { memo } from 'react';
import { Platform, View, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: 'primary' | 'secondary' | 'utility';
}

const WEB_SHADOW: Record<string, any> = Platform.OS === 'web'
  ? {
      primary: { boxShadow: '0 4px 28px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset' },
      secondary: { boxShadow: '0 2px 16px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.04) inset' },
      utility: { boxShadow: '0 1px 8px rgba(0,0,0,0.24)' },
    }
  : {};

const ELEVATION_BG: Record<string, string> = {
  primary: '#16192a',
  secondary: '#131624',
  utility: '#0f1220',
};

const ELEVATION_BORDER: Record<string, string> = {
  primary: 'rgba(255,255,255,0.09)',
  secondary: 'rgba(255,255,255,0.06)',
  utility: 'rgba(255,255,255,0.05)',
};

export const CareerSectionCard = memo(function CareerSectionCard({
  children, style, elevation = 'secondary',
}: Props) {
  return (
    <View
      className="border rounded-xl p-5 overflow-hidden"
      style={{
        backgroundColor: ELEVATION_BG[elevation],
        borderColor: ELEVATION_BORDER[elevation],
        ...(WEB_SHADOW[elevation] || {}),
        ...style,
      }}
    >
      {children}
    </View>
  );
});
