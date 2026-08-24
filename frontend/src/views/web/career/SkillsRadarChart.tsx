import React, { memo } from 'react';
import {View} from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';

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

  const gridLevels = [0.33, 0.66, 1.0].map((level) => {
    const points = AXES.map((axis) => {
      const { x, y } = polarToCartesian(CX, CY, R * level, axis.angle);
      return `${x},${y}`;
    }).join(' ');
    return { level, points };
  });

  const dataPoints = AXES.map((axis) => {
    const raw = skillScores[axis.key] ?? 50;
    const norm = Math.max(0.1, Math.min(1.0, raw / 100));
    const { x, y } = polarToCartesian(CX, CY, R * norm, axis.angle);
    return { x, y, score: raw };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View className="items-center justify-center py-1 mb-1 rounded-xl bg-white/[0.015] border border-white/[0.05]">
      <Svg width={280} height={210} viewBox="0 0 280 210">
        <G>
          {gridLevels.map((g, idx) => (
            <Polygon
              key={idx}
              points={g.points}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={1}
            />
          ))}
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
          <Polygon
            points={polygonPointsStr}
            fill="rgba(129,140,248,0.22)"
            stroke="#818CF8"
            strokeWidth={2}
          />
          {dataPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#818CF8"
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}
          {AXES.map((axis, i) => {
            const labelPos = polarToCartesian(CX, CY, R + 22, axis.angle);
            const anchor =
              axis.angle === -90 || axis.angle === 90
                ? 'middle'
                : axis.angle > -90 && axis.angle < 90
                ? 'start'
                : 'end';
            const dy = axis.angle === -90 ? -4 : axis.angle === 90 ? 12 : 4;
            return (
              <SvgText
                key={axis.label}
                x={labelPos.x}
                y={labelPos.y + dy}
                fill="rgba(238,240,255,0.5)"
                fontSize={11}
                fontFamily="DMSans_700Bold"
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
