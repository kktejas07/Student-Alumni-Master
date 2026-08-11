import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform, Linking } from 'react-native';
import { Search, Users, Eye } from 'lucide-react-native';
import { Linkedin, Github } from '../../student/iconShims';
import { CC, FONTS } from '../tokens';
import { Av } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
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
const FALLBACK = { items: [] as Alumnus[] };
const BATCHES = ['All','2008-2014','2015-2019','2020-2024','2025+'];

const MOCK_ALUMNI: Alumnus[] = [
  { id: 'm1', name: 'Arjun Mehta', initials: 'AM', batch: 2018, role: 'Software Engineer II', company: 'Google', city: 'Bangalore', color: '#60A5FA', skills: ['React', 'Node.js', 'System Design'], linkedin_url: 'https://linkedin.com', github_url: 'https://github.com' },
  { id: 'm2', name: 'Priya Sharma', initials: 'PS', batch: 2015, role: 'Product Manager', company: 'Microsoft', city: 'Hyderabad', color: '#F472B6', skills: ['Agile', 'Product Strategy', 'UX'], linkedin_url: 'https://linkedin.com', github_url: '' },
  { id: 'm3', name: 'Rahul Desai', initials: 'RD', batch: 2021, role: 'Data Scientist', company: 'Amazon', city: 'Seattle, WA', color: '#34D399', skills: ['Python', 'Machine Learning', 'SQL'], linkedin_url: 'https://linkedin.com', github_url: 'https://github.com' },
  { id: 'm4', name: 'Neha Gupta', initials: 'NG', batch: 2019, role: 'UX Designer', company: 'Airbnb', city: 'San Francisco, CA', color: '#A78BFA', skills: ['Figma', 'User Research', 'Prototyping'], linkedin_url: 'https://linkedin.com', github_url: '' },
  { id: 'm5', name: 'Vikram Singh', initials: 'VS', batch: 2012, role: 'Engineering Manager', company: 'Netflix', city: 'Los Gatos, CA', color: '#FBBF24', skills: ['Leadership', 'Distributed Systems', 'Java'], linkedin_url: 'https://linkedin.com', github_url: 'https://github.com' },
  { id: 'm6', name: 'Ananya Patel', initials: 'AP', batch: 2023, role: 'Frontend Developer', company: 'Stripe', city: 'Remote', color: '#38BDF8', skills: ['Vue.js', 'TypeScript', 'CSS'], linkedin_url: 'https://linkedin.com', github_url: 'https://github.com' },
];

export function AlumniView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/alumni', FALLBACK);
  const ALUMNI = [...(data?.items || []), ...MOCK_ALUMNI];
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
      <View style={s.grid}>
        {list.map((a) => (
          <View key={a.id} style={[s.card, { width: cardW as any }]}>
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
          </View>
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
  searchInput: { flex: 1, color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  
  /* New Card Styles matching UserCard */
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 16, padding: 16 },
  
  avWrap: { borderRadius: 999, borderWidth: 2, padding: 2 },
  nameBold: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 14 },
  
  rolePillAlumni: { backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  rolePillAlumniText: { color: '#A78BFA', fontSize: 10, fontFamily: FONTS.bold },
  
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

