/**
 * Lucide React Native compatibility & fallback shim
 * Prevents React Error #130 (Element type is invalid: got undefined)
 * and provides smooth backward-compatibility for Lucide v0 -> v1 icon renames.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon, Polyline, Line } from 'react-native-svg';
import * as LucideActual from 'lucide-react-native/dist/esm/lucide-react-native.mjs';

// Safe universal fallback icon component so React never crashes on undefined
const createFallbackIcon = (name) => {
  const Fallback = React.forwardRef((props, ref) => {
    const size = props.size || 24;
    const color = props.color || '#94A3B8';
    return (
      <Svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={props.strokeWidth || 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="8" x2="12" y2="12" />
        <Line x1="12" y1="16" x2="12.01" y2="16" />
      </Svg>
    );
  });
  Fallback.displayName = name || 'LucideFallback';
  return Fallback;
};

// Aliases mapping old Lucide icon names to new Lucide v1 names
const ALIASES = {
  AlertTriangle: LucideActual.TriangleAlert || createFallbackIcon('AlertTriangle'),
  AlertCircle: LucideActual.CircleAlert || createFallbackIcon('AlertCircle'),
  CheckCircle: LucideActual.CircleCheck || createFallbackIcon('CheckCircle'),
  CheckCircle2: LucideActual.CircleCheckBig || LucideActual.CircleCheck || createFallbackIcon('CheckCircle2'),
  XCircle: LucideActual.CircleX || createFallbackIcon('XCircle'),
  CheckSquare: LucideActual.SquareCheck || createFallbackIcon('CheckSquare'),
  BarChart3: LucideActual.ChartBar || LucideActual.ChartColumn || createFallbackIcon('BarChart3'),
  BarChart: LucideActual.ChartBar || createFallbackIcon('BarChart'),
  HelpCircle: LucideActual.CircleQuestionMark || createFallbackIcon('HelpCircle'),
  PlusCircle: LucideActual.CirclePlus || createFallbackIcon('PlusCircle'),
  MinusCircle: LucideActual.CircleMinus || createFallbackIcon('MinusCircle'),
  MoreVertical: LucideActual.EllipsisVertical || createFallbackIcon('MoreVertical'),
  MoreHorizontal: LucideActual.Ellipsis || createFallbackIcon('MoreHorizontal'),
  Sliders: LucideActual.SlidersHorizontal || createFallbackIcon('Sliders'),
  Edit2: LucideActual.Pencil || createFallbackIcon('Edit2'),
  Edit3: LucideActual.SquarePen || LucideActual.Pencil || createFallbackIcon('Edit3'),
  History: LucideActual.Clock || createFallbackIcon('History'),
  Home: LucideActual.House || createFallbackIcon('Home'),
  Filter: LucideActual.ListFilter || createFallbackIcon('Filter'),
  Code2: LucideActual.CodeXml || LucideActual.Code || createFallbackIcon('Code2'),
  Layout: LucideActual.LayoutGrid || LucideActual.LayoutDashboard || createFallbackIcon('Layout'),
  PlayCircle: LucideActual.CirclePlay || createFallbackIcon('PlayCircle'),
  Mic2: LucideActual.Mic || createFallbackIcon('Mic2'),
  Github: createFallbackIcon('Github'),
  Linkedin: createFallbackIcon('Linkedin'),
};

const combined = { ...LucideActual, ...ALIASES };

// Export a Proxy that intercepts any missing icon name and returns a safe fallback
const safeExports = new Proxy(combined, {
  get(target, prop) {
    if (typeof prop === 'string') {
      if (prop in target && target[prop] !== undefined) {
        return target[prop];
      }
      if (prop === '__esModule' || prop === 'default') {
        return target;
      }
      // Return a generated fallback component for any missing icon
      const generated = createFallbackIcon(prop);
      target[prop] = generated;
      return generated;
    }
    return target[prop];
  },
});

export default safeExports;
module.exports = safeExports;
