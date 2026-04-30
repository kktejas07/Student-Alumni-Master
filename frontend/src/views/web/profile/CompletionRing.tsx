/**
 * CompletionRing — circular progress ring with center percentage.
 * Pure SVG, works on web + native via react-native-svg.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  pct: number;          // 0-100
  size?: number;        // px
  stroke?: number;      // ring thickness
  color?: string;
  trackColor?: string;
}

export function CompletionRing({
  pct, size = 92, stroke = 8,
  color = '#A78BFA', trackColor = 'rgba(255,255,255,0.10)',
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - safe / 100);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={trackColor} strokeWidth={stroke} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.pct, { color }]}>{safe}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20 },
});
