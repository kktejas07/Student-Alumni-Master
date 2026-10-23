import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform, Linking, ActivityIndicator } from 'react-native';
import { Search, Users, Eye } from 'lucide-react-native';
import { Linkedin, Github } from '../../student/iconShims';
import { GlassCard } from '../../student/glass';
import { CC, FONTS } from '../tokens';
import { Av } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';

type Alumnus = { 
  id: string; 
  name: string; 
  initials: string; 
  batch: number; 
  role: string; 
  company: string; 
  city: string; 
  color: string;
  skills: string[];
  linkedin_url: string;
  github_url: string;
};
// Response shape of GET /api/college/alumni (backend/portals.py).
type AlumniResponse = { items: Alumnus[]; college?: string | null };
const EMPTY: AlumniResponse = { items: [] };
const BATCHES = ['All','2008-2014','2015-2019','2020-2024','2025+'];

export function AlumniView() {
  const user = useAuthStore((state) => state.user);
  const collegeName = (user as any)?.institution || user?.college_info?.institution_name || user?.school_info?.institution_name || '';
  const { data, loading, error, refresh } = usePortalData<AlumniResponse>(
    collegeName ? `/college/alumni?college_name=${encodeURIComponent(collegeName)}` : '/college/alumni',
    EMPTY,
  );
  // Only what the API returned. No local placeholder records.
  const ALUMNI: Alumnus[] = data?.items || [];
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const list = ALUMNI.filter((a) => {
    const matchesQ = !q || (a.name + a.role + a.company).toLowerCase().includes(q.toLowerCase());
    if (!matchesQ) return false;

    if (filter === 'All') return true;
    if (filter === '2008-2014') return a.batch >= 2008 && a.batch <= 2014;
    if (filter === '2015-2019') return a.batch >= 2015 && a.batch <= 2019;
    if (filter === '2020-2024') return a.batch >= 2020 && a.batch <= 2024;
    if (filter === '2025+') return a.batch >= 2025;
    return true;
  });
  
  // Use a slightly narrower width on large screens to fit more cards, matching the compact style
  const cardW = width >= 1100 ? '24%' : width >= 720 ? '48%' : '100%';
  
  return (
    <View>
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{BATCHES.map((b) => <Pressable key={b} onPress={() => setFilter(b)} style={[s.chip, filter === b && s.chipOn]}><Text style={{ color: filter === b ? '#fff' : CC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{b}</Text></Pressable>)}</View>
        <View style={{ flex:1 }} />
        <View style={s.searchBox}><Search size={14} color={CC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search alumni" placeholderTextColor={CC.dim} style={s.searchInput} /></View>
      </View>

      {/* Error state: the request failed. Keep any previously loaded items visible. */}
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>Could not load alumni. {error}</Text>
          <Pressable onPress={refresh} style={({ hovered }: any) => [s.retryBtn, hovered && { opacity: 0.9 }]}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Loading state (first fetch only) */}
      {loading && ALUMNI.length === 0 && !error && (
        <View style={s.stateBox}>
          <ActivityIndicator color={CC.primary} />
          <Text style={s.stateText}>Loading alumni</Text>
        </View>
      )}

      {/* Empty state: API returned no records */}
      {!loading && !error && ALUMNI.length === 0 && (
        <View style={s.stateBox}>
          <Users size={22} color={CC.dim} />
          <Text style={s.stateTitle}>No alumni records yet</Text>
          <Text style={s.stateText}>Alumni who register with this college will appear here.</Text>
        </View>
      )}

      {/* Filters excluded every record */}
      {!loading && ALUMNI.length > 0 && list.length === 0 && (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>No alumni match this search</Text>
          <Text style={s.stateText}>Try a different batch or clear the search box.</Text>
        </View>
      )}

      <View style={s.grid}>
        {list.map((a) => (
          <GlassCard key={a.id} glow style={{ width: cardW as any }}>
            {/* Header: Avatar + Info */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={[s.avWrap, { borderColor: a.color }]}>
                <Av initials={a.initials} size={48} color={a.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text numberOfLines={1} style={s.nameBold}>{a.name}</Text>
                  <View style={s.rolePillAlumni}>
                    <Text style={s.rolePillAlumniText}>Batch {a.batch}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={s.subtitleLine}>{a.role}</Text>
                <Text numberOfLines={1} style={s.subtitleSubLine}>
                  {a.company ? `${a.company}` : ''}
                </Text>
              </View>
            </View>

            {/* Skill Pills */}
            <View style={s.skillsRow}>
              {(a.skills || []).slice(0, 3).map((skill: string, sIdx: number) => (
                <View key={sIdx} style={s.skillChip}><Text style={s.skillChipText}>{skill}</Text></View>
              ))}
              {(!a.skills || a.skills.length === 0) && (
                <View style={s.skillChip}><Text style={s.skillChipText}>Graduated {a.batch}</Text></View>
              )}
            </View>

            {/* Mutual Connection Counter Placeholder (or Batch info) */}
            <View style={s.mutualRow}>
              <Users size={12} color={CC.dim} style={{ marginRight: 6 }} />
              <Text style={s.mutualText}>Graduated {a.batch} • {a.city}</Text>
            </View>

            {/* Bottom Actions */}
            <View style={s.actionsRow}>
              <Pressable 
                onPress={() => router.push(`/profile/${a.id}`)}
                style={({ hovered }: any) => [s.viewProfileBtn, hovered && { opacity: 0.9 }]}
              >
                <Eye size={14} color="#5EEAD4" />
                <Text style={s.viewProfileBtnText}>View Profile</Text>
              </Pressable>

              {a.linkedin_url && (
                <Pressable onPress={() => Linking.openURL(a.linkedin_url)} style={s.iconBtnSquare}>
                  <Linkedin size={14} color="#60A5FA" />
                </Pressable>
              )}
              {a.github_url && (
                <Pressable onPress={() => Linking.openURL(a.github_url)} style={s.iconBtnSquareDark}>
                  <Github size={14} color="#F3F4F6" />
                </Pressable>
              )}
            </View>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: CC.primary, borderColor: CC.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 220, height: 34, paddingHorizontal: 11, borderRadius: 10, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#FFFFFF', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  /* Loading / empty / error states */
  stateBox: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 40, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: CC.border, backgroundColor: CC.card, marginBottom: 12 },
  stateTitle: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 },
  stateText: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)', marginBottom: 12 },
  errorText: { flex: 1, minWidth: 160, color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 12 },
  retryBtn: { paddingHorizontal: 12, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 },

  /* New Card Styles matching UserCard */
  card: { 
    backgroundColor: CC.card, 
    borderColor: CC.border, 
    borderWidth: 1, 
    borderRadius: 16, 
    padding: 16,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.06)',
      transitionProperty: 'box-shadow, transform',
      transitionDuration: '200ms',
    } as any) : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 6,
    }),
  },
  
  avWrap: { borderRadius: 999, borderWidth: 2, padding: 2 },
  nameBold: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 },
  
  rolePillAlumni: { backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  rolePillAlumniText: { color: '#60A5FA', fontSize: 10, fontFamily: FONTS.bold },
  
  subtitleLine: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4 },
  subtitleSubLine: { color: CC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  skillChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  skillChipText: { color: CC.muted, fontSize: 11, fontFamily: FONTS.med },
  
  mutualRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  mutualText: { color: CC.dim, fontSize: 11, fontFamily: FONTS.med },
  
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  
  viewProfileBtn: { flex: 1, flexDirection: 'row', height: 34, borderRadius: 8, backgroundColor: 'rgba(94, 234, 212, 0.1)', borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.3)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  viewProfileBtnText: { color: '#5EEAD4', fontFamily: FONTS.bold, fontSize: 12 },
  
  iconBtnSquare: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(96, 165, 250, 0.1)', borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)', alignItems: 'center', justifyContent: 'center' },
  iconBtnSquareDark: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
});

