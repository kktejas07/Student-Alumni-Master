import React, { useCallback, useEffect, useState, useContext } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { request } from '@/src/models/services/api';
import { StudentPortalNavContext } from '../StudentPortalNavContext';

interface TrendingCompany {
  company: string;
  open_jobs: number;
  logo_url?: string;
  primary_source?: string;
  primary_location?: string;
  dominant_type?: string;
}

const PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#A78BFA', '#EC4899', '#F97316', '#06B6D4', '#84CC16'];
function pickColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function TrendingCompaniesWidget() {
  const router = useRouter();
  const portalNav = useContext(StudentPortalNavContext);
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
    <View className="bg-glass-subtle border border-glass-medium rounded-lg overflow-hidden">
      <LinearGradient
        colors={['rgba(167,139,250,0.10)', 'rgba(167,139,250,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        className="flex-row items-center gap-sm px-[14px] py-3 border-b border-glass-light"
      >
        <View className="flex-1 flex-row items-center gap-sm">
          <View className="w-8 h-8 rounded-full bg-[rgba(167,139,250,0.18)] border border-purple-light/40 items-center justify-center">
            <MaterialCommunityIcons name="trending-up" size={16} color="#A78BFA" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-display font-extrabold text-[13.5px]">Trending Companies</Text>
            <Text className="text-white/55 font-body font-medium text-xs mt-0.5">Hiring most this week · personalised to your tier</Text>
          </View>
        </View>
        <Pressable
          onPress={load}
          className="w-7 h-7 rounded-sm items-center justify-center bg-[rgba(167,139,250,0.10)] border border-[rgba(167,139,250,0.30)]"
          style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
          testID="trending-refresh"
        >
          <MaterialCommunityIcons name="refresh" size={13} color="#C4B5FD" />
        </Pressable>
      </LinearGradient>

      {loading ? (
        <View className="py-[30px] items-center gap-s">
          <ActivityIndicator size="small" color="#A78BFA" />
          <Text className="text-white/55 font-body font-medium text-xs">Crunching the latest postings…</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="py-[30px] items-center gap-sm px-[22px]">
          <MaterialCommunityIcons name="domain" size={26} color="rgba(255,255,255,0.45)" />
          <Text className="text-white/55 font-body font-medium text-[11.5px] text-center leading-4">No trending companies in your tier this week. Try refreshing the jobs feed.</Text>
        </View>
      ) : (
        <View className="py-1">
          {items.map((c, i) => (
            <Pressable
              key={`${c.company}-${i}`}
              onPress={() => {
                if (portalNav) {
                  portalNav.navigate('internships', { q: c.company });
                } else {
                  router.push(`/student-portal?tab=internships&q=${encodeURIComponent(c.company)}` as any);
                }
              }}
              className="flex-row items-center gap-[12px] px-[14px] py-[9px]"
              style={({ hovered }: any) => ({ cursor: 'pointer', backgroundColor: hovered ? 'rgba(167,139,250,0.06)' : undefined })}
              testID={`trending-${i}`}
            >
              <View className="w-8 h-8 rounded-sm items-center justify-center" style={{ backgroundColor: pickColor(c.company) }}>
                <Text className="text-white font-display font-extrabold text-[13px]">{(c.company || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text numberOfLines={1} className="text-white font-display font-bold text-[12.5px]">{c.company}</Text>
                <View className="flex-row items-center gap-1.5 mt-[3px] flex-wrap">
                  <MaterialCommunityIcons name="map-marker-outline" size={10} color="rgba(255,255,255,0.55)" />
                  <Text numberOfLines={1} className="text-white/55 font-body font-medium text-[10.5px] max-w-[140px]">{c.primary_location}</Text>
                  {c.primary_source ? (
                    <>
                      <Text className="text-white/30 font-body font-medium text-2xs">·</Text>
                      <Text className="text-white/45 font-body font-medium text-2xs italic">via {c.primary_source}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View className="flex-row items-center gap-1 px-[7px] py-[3px] rounded-pill bg-amber-soft border border-amber/40">
                <MaterialCommunityIcons name="briefcase-variant" size={10} color="#FCD34D" />
                <Text className="text-amber-light font-display font-extrabold text-[10.5px]">{c.open_jobs}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.45)" />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          if (portalNav) {
            portalNav.navigate('internships');
          } else {
            router.push('/student-portal?tab=internships' as any);
          }
        }}
        className="flex-row items-center justify-center gap-1.5 py-[11px] border-t border-glass-light"
        style={({ hovered }: any) => ({ cursor: 'pointer', backgroundColor: hovered ? 'rgba(167,139,250,0.10)' : undefined })}
        testID="trending-view-all"
      >
        <Text className="text-purple-light font-display font-bold text-sm">Browse all internships & jobs</Text>
        <MaterialCommunityIcons name="arrow-right" size={13} color="#C4B5FD" />
      </Pressable>
    </View>
  );
}
