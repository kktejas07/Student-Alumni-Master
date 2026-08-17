import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

export type DoodleType =
  | 'sparkle'
  | 'underline'
  | 'arrow'
  | 'star'
  | 'idea'
  | 'highlight-circle'
  | 'cap-doodle'
  | 'burst';

export interface DoodleIllustrationProps {
  /** Type of hand-drawn doodle preset */
  type?: DoodleType;
  /** Primary stroke color (default: #6366F1) */
  color?: string;
  /** Width of the doodle (default: 48) */
  width?: number;
  /** Height of the doodle (default: 48) */
  height?: number;
  /** Stroke width for doodle lines (default: 2.5) */
  strokeWidth?: number;
}

export const DoodleIllustration: React.FC<DoodleIllustrationProps> = ({
  type = 'sparkle',
  color = '#6366F1',
  width = 48,
  height = 48,
  strokeWidth = 2.5,
}) => {
  switch (type) {
    case 'underline':
      return (
        <Svg width={width} height={height} viewBox="0 0 120 20" fill="none">
          <Path
            d="M5 12C25 5 55 15 85 7C100 3 110 8 115 11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M15 16C35 11 65 18 95 12"
            stroke={color}
            strokeWidth={Math.max(1, strokeWidth - 1)}
            strokeOpacity={0.6}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'arrow':
      return (
        <Svg width={width} height={height} viewBox="0 0 60 60" fill="none">
          <Path
            d="M10 45C22 42 38 30 45 15M45 15C38 18 32 20 28 20M45 15C42 22 40 28 40 32"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'star':
      return (
        <Svg width={width} height={height} viewBox="0 0 40 40" fill="none">
          <Path
            d="M20 3L24.5 14.5L37 16L27.5 24L30.5 36L20 29.5L9.5 36L12.5 24L3 16L15.5 14.5L20 3Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'highlight-circle':
      return (
        <Svg width={width} height={height} viewBox="0 0 80 80" fill="none">
          <Path
            d="M40 8C20 8 8 22 8 40C8 60 22 72 42 72C65 72 74 54 72 36C70 18 52 10 36 12"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'idea':
      return (
        <Svg width={width} height={height} viewBox="0 0 50 50" fill="none">
          <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
            {/* Bulb outline */}
            <Path d="M18 38H32M21 44H29M25 10C17.268 10 11 16.268 11 24C11 29 14 33.5 18 36V38H32V36C36 33.5 39 29 39 24C39 16.268 32.732 10 25 10Z" />
            {/* Rays */}
            <Path d="M25 3V6M8 12L11 14.5M3 24H6M42 24H45M39 12L36 14.5" />
          </G>
        </Svg>
      );

    case 'burst':
      return (
        <Svg width={width} height={height} viewBox="0 0 50 50" fill="none">
          <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
            <Path d="M25 5V15M25 35V45M5 25H15M35 25H45M10.86 10.86L17.93 17.93M32.07 32.07L39.14 39.14M10.86 39.14L17.93 32.07M32.07 17.93L39.14 10.86" />
          </G>
        </Svg>
      );

    case 'cap-doodle':
      return (
        <Svg width={width} height={height} viewBox="0 0 60 40" fill="none">
          <Path
            d="M5 16L30 6L55 16L30 26L5 16ZM30 26V35M14 20V28C14 31 21 34 30 34C39 34 46 31 46 28V20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'sparkle':
    default:
      return (
        <Svg width={width} height={height} viewBox="0 0 40 40" fill="none">
          <Path
            d="M20 2C20 12 28 20 38 20C28 20 20 28 20 38C20 28 12 20 2 20C12 20 20 12 20 2Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="32" cy="8" r="2" fill={color} />
          <Circle cx="8" cy="32" r="1.5" fill={color} />
        </Svg>
      );
  }
};
