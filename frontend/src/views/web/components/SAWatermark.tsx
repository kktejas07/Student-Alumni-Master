import React, { useId } from 'react';
import { View, Platform } from 'react-native';
import Svg, { Path, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

export interface SAWatermarkProps {
  opacity?: number;
  rotation?: string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  size?: number;
  fixed?: boolean;
  zIndex?: number;
  glow?: boolean;
}

export function SAWatermark({
  opacity = 0.15,
  rotation = '0deg',
  top = 40,
  right = -20,
  bottom,
  left,
  size = 780,
  fixed = false,
  zIndex = 0,
  glow = true,
}: SAWatermarkProps) {
  const height = Math.round(size * 1.16);
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '_');
  const shieldGradId = `saShieldGrad_${uid}`;
  const textGradId = `saTextGrad_${uid}`;

  if (Platform.OS === 'web') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: fixed ? 'fixed' : 'absolute',
          top: top !== undefined ? (typeof top === 'number' ? `${top}px` : top) : undefined,
          right: right !== undefined ? (typeof right === 'number' ? `${right}px` : right) : undefined,
          bottom: bottom !== undefined ? (typeof bottom === 'number' ? `${bottom}px` : bottom) : undefined,
          left: left !== undefined ? (typeof left === 'number' ? `${left}px` : left) : undefined,
          opacity,
          transform: `rotate(${rotation})`,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex,
          filter: glow ? 'drop-shadow(0 0 60px rgba(154, 92, 232, 0.4))' : undefined,
          transition: 'opacity 0.4s ease',
        }}
      >
        {glow && (
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '20%',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(147,51,234,0.3) 0%, rgba(99,102,241,0.12) 50%, transparent 70%)',
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />
        )}
        <svg
          viewBox="0 0 300 350"
          width={size}
          height={height}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={shieldGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E9D5FF" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#A855F7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#6B21A8" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id={textGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="55%" stopColor="#EDEAF6" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          <path
            d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
            fill={`url(#${shieldGradId})`}
          />
          <path
            d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z"
            fill="#05060F"
            fillOpacity="0.82"
          />
          <text
            x="150"
            y="215"
            textAnchor="middle"
            fontFamily="'Manrope', sans-serif"
            fontSize="128"
            fontWeight="800"
            letterSpacing="-4"
            fill={`url(#${textGradId})`}
          >
            SA
          </text>
        </svg>
      </div>
    );
  }

  return (
    <View
      style={[
        styles.watermarkWrap,
        {
          top: top as any,
          right: right as any,
          bottom: bottom as any,
          left: left as any,
          opacity,
          zIndex,
          transform: [{ rotate: rotation }],
        },
      ]}
      pointerEvents="none"
    >
      <Svg viewBox="0 0 300 350" width={size} height={height}>
        <Defs>
          <SvgGrad id={shieldGradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#E9D5FF" stopOpacity="0.95" />
            <Stop offset="0.45" stopColor="#A855F7" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#6B21A8" stopOpacity="0.65" />
          </SvgGrad>
        </Defs>
        <Path
          d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z"
          fill={`url(#${shieldGradId})`}
        />
        <Path
          d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z"
          fill="#05060F"
          fillOpacity="0.82"
        />
        <SvgText
          x="150"
          y="215"
          textAnchor="middle"
          fontFamily="'Manrope', sans-serif"
          fontSize="128"
          fontWeight="800"
          letterSpacing="-4"
          fill="#FFFFFF"
        >
          SA
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = {
  watermarkWrap: {
    position: 'absolute',
    zIndex: 0,
  },
} as const;

