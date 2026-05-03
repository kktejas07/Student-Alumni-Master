/**
 * TrendingCompaniesWidget — Material You styled widget on the Student
 * Dashboard. Reads from /api/jobs/trending-companies which aggregates from
 * the live cache populated by 5 free job APIs (RemoteOK / ArbeitNow /
 * The Muse / Remotive / Jobicy).
 *
 * Year-tier aware on the backend — Year 1/2 only sees companies hiring
 * interns, final-year + alumni see full-time hirers too.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { request } from '@/src/models/services/api';

interface TrendingCompany {
  company: string;
  open_jobs: number;
  logo_url?: string;
  primary_source?: string;
  primary_location?: string;
  dominant_type?: string;
}

const FT = { med: 'DMSans_500Medium', bold: 'DMSans_700Bold', xbold: 'DMSans_800ExtraBold' };
const PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#A78BFA', '#EC4899', '#F97316', '#06B6D4', '#84CC16'];
function pickColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function TrendingCompaniesWidget() {
  const router = useRouter();
  const [items, setItems] = useState<TrendingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await request('/jobs/trending-companies?limit=8');
      setItems(r.items || []);
      if (r.window_days) setWindowDays(r.window_days);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={s.card}>
      <LinearGradient
        colors={['rgba(167,139,250,0.10)', 'rgba(167,139,250,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.headerStrip}
      >
        <View style={s.headerLeft}>
          <View style={s.iconDisc}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Trending Companies</Text>
            <Text style={s.sub}>Hiring most this week · personalised to your tier</Text>
          </View>
        </View>
        <Pressable onPress={load} style={s.refreshBtn} testID="trending-refresh">
          <MaterialCommunityIcons name="refresh" size={13} color="#C4B5FD" />
        </Pressable>
      </LinearGradient>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="small" color="#A78BFA" />
          <Text style={s.loadingTxt}>Crunching the latest postings…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="domain" size={26} color="rgba(255,255,255,0.45)" />
          <Text style={s.emptyTxt}>No trending companies in your tier this week. Try refreshing the jobs feed.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {items.map((c, i) => (
            <Pressable
              key={`${c.company}-${i}`}
              onPress={() => router.push(`/student-portal?tab=internships&q=${encodeURIComponent(c.company)}` as any)}
              style={({ hovered }: any) => [s.row, hovered && { backgroundColor: 'rgba(167,139,250,0.06)' }]}
              testID={`trending-${i}`}
            >
              <View style={[s.logoBox, { backgroundColor: pickColor(c.company) }]}>
                <Text style={s.logoText}>{(c.company || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.companyName}>{c.company}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={10} color="rgba(255,255,255,0.55)" />
                  <Text numberOfLines={1} style={s.companyMeta}>{c.primary_location}</Text>
                  {c.primary_source ? (
                    <>
                      <Text style={s.dot}>·</Text>
                      <Text style={s.via}>via {c.primary_source}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View style={s.countPill}>
                <MaterialCommunityIcons name="briefcase-variant" size={10} color="#FCD34D" />
                <Text style={s.countText}>{c.open_jobs}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.45)" />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => router.push('/student-portal?tab=internships' as any)}
        style={({ hovered }: any) => [s.viewAll, hovered && { backgroundColor: 'rgba(167,139,250,0.10)' }]}
        testID="trending-view-all"
      >
        <Text style={s.viewAllText}>Browse all internships & jobs</Text>
        <MaterialCommunityIcons name="arrow-right" size={13} color="#C4B5FD" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  headerStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconDisc: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.18)',
    borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontFamily: FT.xbold, fontSize: 13.5 },
  sub: { color: 'rgba(255,255,255,0.55)', fontFamily: FT.med, fontSize: 11, marginTop: 1 },
  refreshBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  grid: { paddingVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  logoBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontFamily: FT.xbold, fontSize: 13 },
  companyName: { color: '#fff', fontFamily: FT.bold, fontSize: 12.5 },
  companyMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: FT.med, fontSize: 10.5, maxWidth: 140 },
  dot: { color: 'rgba(255,255,255,0.30)', fontFamily: FT.med, fontSize: 10 },
  via: { color: 'rgba(255,255,255,0.45)', fontFamily: FT.med, fontSize: 10, fontStyle: 'italic' },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderColor: 'rgba(245,158,11,0.40)', borderWidth: 1,
  },
  countText: { color: '#FCD34D', fontFamily: FT.xbold, fontSize: 10.5 },
  loadingBox: {
    paddingVertical: 30, alignItems: 'center', gap: 8,
  },
  loadingTxt: { color: 'rgba(255,255,255,0.55)', fontFamily: FT.med, fontSize: 11 },
  emptyBox: {
    paddingVertical: 30, alignItems: 'center', gap: 10, paddingHorizontal: 22,
  },
  emptyTxt: {
    color: 'rgba(255,255,255,0.55)', fontFamily: FT.med, fontSize: 11.5,
    textAlign: 'center', lineHeight: 16,
  },
  viewAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11,
    borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  viewAllText: { color: '#C4B5FD', fontFamily: FT.bold, fontSize: 12 },
});
