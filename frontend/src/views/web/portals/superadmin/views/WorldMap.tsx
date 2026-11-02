/**
 * Choropleth world map for geographic analytics.
 * Uses react-svg-worldmap on web, falls back to a styled list on native.
 */
import React, { useMemo } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { SAC, useSAC, FONTS } from '../tokens';

type CountryDatum = { country: string; code: string; count: number; pct?: number };

interface WorldMapProps {
  data: CountryDatum[];
  title?: string;
  color?: string;
  maxItems?: number;
}

// Equirectangular color scale (5 stops from light to dark)
const colorScale = (count: number, max: number, base: string): string => {
  if (max === 0) return base + '15';
  const ratio = count / max;
  if (ratio > 0.8) return base;
  if (ratio > 0.6) return base + 'CC';
  if (ratio > 0.4) return base + '99';
  if (ratio > 0.2) return base + '66';
  return base + '33';
};

// Normalize country code to lowercase ISO-2 (react-svg-worldmap expects lowercase)
const normalizeCode = (code: string): string => {
  const c = (code || '').trim().toUpperCase();
  if (c.length !== 2) return '';
  return c.toLowerCase();
};

// ── Web renderer (react-svg-worldmap) ──────────────────────────────────────
function WebMap({ data, color, title }: { data: CountryDatum[]; color: string; title?: string }) {
  // Dynamic import to avoid bundling react-dom on native
  const [WorldMapComp, setWorldMapComp] = React.useState<any>(null);
  React.useEffect(() => {
    import('react-svg-worldmap').then((mod) => setWorldMapComp(() => mod.default || mod)).catch(() => {});
  }, []);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const mapData = useMemo(() => {
    return data
      .map((d) => ({ country: normalizeCode(d.code), value: d.count }))
      .filter((d) => d.country);
  }, [data]);

  if (!WorldMapComp || mapData.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim }}>
          {mapData.length === 0 ? 'No geographic data available' : 'Loading map...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16, alignItems: 'center' }}>
      {title ? <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6', marginBottom: 12 }}>{title}</Text> : null}
      <View style={{ width: '100%', maxWidth: 600 }}>
        <WorldMapComp
          data={mapData}
          color={color}
          size="responsive"
          frame={false}
          strokeOpacity={0.3}
          backgroundColor="transparent"
        />
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: T.dim }}>Low</Text>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
          <View key={i} style={{ width: 18, height: 8, borderRadius: 2, backgroundColor: color + ['33', '66', '99', 'CC', ''][i] }} />
        ))}
        <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: T.dim }}>High</Text>
      </View>
    </View>
  );
}

// ── Native fallback (styled bar list) ───────────────────────────────────────
function NativeList({ data, color, maxItems }: { data: CountryDatum[]; color: string; maxItems: number }) {
  const maxCount = Math.max(...data.slice(0, maxItems).map((d) => d.count), 1);
  return (
    <View style={{ gap: 6 }}>
      {data.slice(0, maxItems).map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(d.count / maxCount) * 100}%`, maxWidth: 120, borderRadius: 3, backgroundColor: color, opacity: 1 - i * 0.06 }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: T.muted, flex: 1 }}>{d.country}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color }}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function WorldMap({ data, title, color = '#1D4AFF', maxItems = 10 }: WorldMapProps) {
  const T = useSAC();
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // On web, try to render the world map; fall back to list on failure
  if (Platform.OS === 'web') {
    return <WebMap data={data} color={color} title={title} />;
  }

  return (
    <View style={{ gap: 8 }}>
      {title ? <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>{title}</Text> : null}
      <NativeList data={data} color={color} maxItems={maxItems} />
    </View>
  );
}
