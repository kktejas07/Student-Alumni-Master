/**
 * SkillsRadarChart.tsx
 * Sleek, thin, modern SVG Radar Chart for the Skills Breakdown section.
 * Renders the 6 core competency dimensions with glowing polygon fill,
 * concentric hexagonal grids, and crystal-clear typography.
 */
import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  skillScores: Record<string, number>;
}

const AXES = [
  { key: 'Technical Excellence',       label: 'Technical',     angle: -90 },
  { key: 'Professional Communication', label: 'Communication', angle: -30 },
  { key: 'Personal Brand',             label: 'Brand',         angle: 30 },
  { key: 'Leadership & Collaboration', label: 'Leadership',    angle: 90 },
  { key: 'Career Preparation',         label: 'Preparation',   angle: 150 },
  { key: 'Industry Presence',          label: 'Presence',      angle: 210 },
] as const;

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export const SkillsRadarChart = memo(function SkillsRadarChart({ skillScores }: Props) {
  const CX = 140;
  const CY = 105;
  const R  = 65;

  // Generate grid hexagons (33%, 66%, 100%)
  const gridLevels = [0.33, 0.66, 1.0].map((level) => {
    const points = AXES.map((axis) => {
      const { x, y } = polarToCartesian(CX, CY, R * level, axis.angle);
      return `${x},${y}`;
    }).join(' ');
    return { level, points };
  });

  // Generate data polygon points
  const dataPoints = AXES.map((axis) => {
    const raw = skillScores[axis.key] ?? 50;
    const norm = Math.max(0.1, Math.min(1.0, raw / 100));
    const { x, y } = polarToCartesian(CX, CY, R * norm, axis.angle);
    return { x, y, score: raw };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={s.container}>
      <Svg width={280} height={210} viewBox="0 0 280 210">
        <G>
          {/* Concentric Hexagon Grid */}
          {gridLevels.map((g, idx) => (
            <Polygon
              key={idx}
              points={g.points}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          ))}

          {/* Spokes from center to outer vertices */}
          {AXES.map((axis, i) => {
            const outer = polarToCartesian(CX, CY, R, axis.angle);
            return (
              <Line
                key={i}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            );
          })}

          {/* Data Polygon */}
          <Polygon
            points={polygonPointsStr}
            fill="rgba(129,140,248,0.22)"
            stroke={COLORS.purpleL}
            strokeWidth={2}
          />

          {/* Data Vertices */}
          {dataPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={COLORS.purpleL}
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}

          {/* Labels */}
          {AXES.map((axis, i) => {
            const labelPos = polarToCartesian(CX, CY, R + 22, axis.angle);
            const anchor =
              axis.angle === -90 || axis.angle === 90
                ? 'middle'
                : axis.angle > -90 && axis.angle < 90
                ? 'start'
                : 'end';

            // Adjust vertical nudge for top / bottom labels
            const dy = axis.angle === -90 ? -4 : axis.angle === 90 ? 12 : 4;

            return (
              <SvgText
                key={axis.label}
                x={labelPos.x}
                y={labelPos.y + dy}
                fill={COLORS.text2}
                fontSize={11}
                fontFamily={FONT_FAMILIES.bold}
                textAnchor={anchor}
                letterSpacing={0.2}
              >
                {axis.label}
              </SvgText>
            );
          })}
        </G>
      </Svg>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
  },
});
