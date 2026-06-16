import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Search, Filter, X, Linkedin, Github, MapPin, Briefcase, GraduationCap, Star, Code2 } from 'lucide-react-native';
import { request } from '@/src/models/services/api';

interface TalentProfile {
  id: string;
  full_name: string;
  headline?: string;
  linkedin_url?: string;
  github_url?: string;
  location?: string;
  skills: string[];
  experience_years?: number;
  current_company?: string;
  current_role?: string;
  education?: string;
  graduation_year?: number;
  photo_url?: string;
  bio?: string;
  source: string;
  is_active: boolean;
}

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#E2E8F0',
  muted: '#94A3B8',
  accent: '#8B5CF6',
  accent2: '#06B6D4',
  linkedin: '#0A66C2',
  github: '#24292E',
  chip: 'rgba(139, 92, 246, 0.15)',
  chipText: '#A78BFA',
  inputBg: '#1E293B',
};

export default function TalentPoolPage() {
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [allSkills, setAllSkills] = useState<string[]>([]);

  const fetchProfiles = useCallback(async (p: number = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '24');
      if (search.trim()) params.set('q', search.trim());
      if (skillFilter.trim()) params.set('skills', skillFilter.trim());

      const data = await request<{ items: TalentProfile[]; total: number; pages: number }>(
        `/talent-pool?${params.toString()}`
      );
      setProfiles(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e: any) {
      setError(e?.message || 'Failed to load talent pool');
    } finally {
      setLoading(false);
    }
  }, [search, skillFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await request<{ top_skills: string[] }>('/talent-pool/stats/summary');
      setAllSkills(data.top_skills || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchProfiles(1);
    fetchStats();
  }, []);

  const onSearch = () => {
    setPage(1);
    fetchProfiles(1);
  };

  const renderSkillChips = (skills: string[]) => {
    const display = skills.slice(0, 5);
    return (
      <View style={s.skillsRow}>
        {display.map((sk, i) => (
          <View key={i} style={s.skillChip}>
            <Text style={s.skillChipText}>{sk}</Text>
          </View>
        ))}
        {skills.length > 5 && (
          <Text style={s.moreSkills}>+{skills.length - 5}</Text>
        )}
      </View>
    );
  };

  const renderProfileCard = (profile: TalentProfile) => (
    <Pressable
      key={profile.id}
      style={s.card}
      onPress={() => {
        if (profile.linkedin_url) {
          Platform.OS === 'web'
            ? (window as any).open(profile.linkedin_url, '_blank')
            : Linking.openURL(profile.linkedin_url);
        }
      }}
    >
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(profile.full_name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName} numberOfLines={1}>{profile.full_name}</Text>
          {profile.headline && (
            <Text style={s.cardHeadline} numberOfLines={1}>{profile.headline}</Text>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={s.cardDetails}>
        {profile.current_role && profile.current_company && (
          <View style={s.detailRow}>
            <Briefcase size={12} color={COLORS.muted} />
            <Text style={s.detailText} numberOfLines={1}>
              {profile.current_role} at {profile.current_company}
            </Text>
          </View>
        )}
        {profile.location && (
          <View style={s.detailRow}>
            <MapPin size={12} color={COLORS.muted} />
            <Text style={s.detailText}>{profile.location}</Text>
          </View>
        )}
        {profile.education && (
          <View style={s.detailRow}>
            <GraduationCap size={12} color={COLORS.muted} />
            <Text style={s.detailText} numberOfLines={1}>
              {profile.education}
              {profile.graduation_year ? ` · ${profile.graduation_year}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && renderSkillChips(profile.skills)}

      {/* Actions */}
      <View style={s.cardActions}>
        {profile.linkedin_url && (
          <Pressable
            style={[s.actionBtn, { backgroundColor: COLORS.linkedin }]}
            onPress={(e) => {
              e.stopPropagation?.();
              Platform.OS === 'web'
                ? (window as any).open(profile.linkedin_url, '_blank')
                : Linking.openURL(profile.linkedin_url!);
            }}
          >
            <Linkedin size={12} color="#fff" />
            <Text style={s.actionBtnText}>LinkedIn</Text>
          </Pressable>
        )}
        {profile.github_url && (
          <Pressable
            style={[s.actionBtn, { backgroundColor: COLORS.github }]}
            onPress={(e) => {
              e.stopPropagation?.();
              Platform.OS === 'web'
                ? (window as any).open(profile.github_url, '_blank')
                : Linking.openURL(profile.github_url!);
            }}
          >
            <Github size={12} color="#fff" />
            <Text style={s.actionBtnText}>GitHub</Text>
          </Pressable>
        )}
        {profile.experience_years != null && (
          <View style={s.expBadge}>
            <Star size={10} color="#F59E0B" />
            <Text style={s.expText}>{profile.experience_years}y exp</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1A0438', '#2D0760']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Talent Pool</Text>
            <Text style={s.subtitle}>{total} profiles available</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <Search size={16} color={COLORS.muted} />
            <TextInput
              style={s.input}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, skills, company..."
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(''); setTimeout(onSearch, 100); }}>
                <X size={16} color={COLORS.muted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[s.filterBtn, showFilters && s.filterBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={showFilters ? '#fff' : COLORS.muted} />
          </Pressable>
        </View>

        {/* Filter chips */}
        {showFilters && (
          <View style={s.filterPanel}>
            <Text style={s.filterLabel}>Filter by skill:</Text>
            <TextInput
              style={[s.searchInput, s.filterInput]}
              value={skillFilter}
              onChangeText={setSkillFilter}
              placeholder="e.g. Python, React, AI"
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={onSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.skillChipScroll}>
              {allSkills.slice(0, 30).map((sk) => (
                <Pressable
                  key={sk}
                  style={[s.filterChip, skillFilter.includes(sk) && s.filterChipActive]}
                  onPress={() => {
                    const current = skillFilter.split(',').map(s => s.trim()).filter(Boolean);
                    if (current.includes(sk)) {
                      setSkillFilter(current.filter(s => s !== sk).join(','));
                    } else {
                      setSkillFilter([...current, sk].join(','));
                    }
                  }}
                >
                  <Text style={[s.filterChipText, skillFilter.includes(sk) && s.filterChipTextActive]}>
                    {sk}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={s.centered}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={() => fetchProfiles(page)}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : profiles.length === 0 ? (
          <View style={s.centered}>
            <Text style={s.mutedText}>No profiles found</Text>
            <Text style={s.mutedSubtext}>Try adjusting your search or filters</Text>
          </View>
        ) : (
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.grid}
            showsVerticalScrollIndicator={false}
          >
            {profiles.map(renderProfileCard)}
          </ScrollView>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <View style={s.pagination}>
            <Pressable
              style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
              onPress={() => page > 1 && (setPage(page - 1), fetchProfiles(page - 1))}
            >
              <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>Previous</Text>
            </Pressable>
            <Text style={s.pageInfo}>{page} / {pages}</Text>
            <Pressable
              style={[s.pageBtn, page >= pages && s.pageBtnDisabled]}
              onPress={() => page < pages && (setPage(page + 1), fetchProfiles(page + 1))}
            >
              <Text style={[s.pageBtnText, page >= pages && s.pageBtnTextDisabled]}>Next</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, paddingBottom: 12,
  },
  title: {
    fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
  },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, gap: 8, height: 44,
  },
  input: {
    flex: 1, color: '#fff', fontSize: 14, fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    outlineStyle: 'none' as any,
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.inputBg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterPanel: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 12, gap: 8,
  },
  filterLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  filterInput: { height: 36, fontSize: 13 },
  skillChipScroll: { maxHeight: 36 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { color: COLORS.muted, fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 80,
  },
  card: {
    width: Platform.OS === 'web' ? 'calc(33.333% - 8px)' as any : '48%' as any,
    minWidth: 280, flex: 1,
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  cardHeadline: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  cardDetails: { gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: COLORS.muted, fontSize: 12, flex: 1 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillChip: {
    backgroundColor: COLORS.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  skillChipText: { color: COLORS.chipText, fontSize: 10, fontWeight: '600' },
  moreSkills: { color: COLORS.muted, fontSize: 10, alignSelf: 'center' },
  cardActions: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  expBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginLeft: 'auto', backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  expText: { color: '#F59E0B', fontSize: 10, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorText: { color: '#EF4444', fontSize: 14 },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  retryText: { color: '#fff', fontSize: 13 },
  mutedText: { color: COLORS.muted, fontSize: 15 },
  mutedSubtext: { color: COLORS.muted, fontSize: 12 },
  pagination: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, gap: 16,
  },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#fff', fontSize: 13 },
  pageBtnTextDisabled: { color: COLORS.muted },
  pageInfo: { color: COLORS.muted, fontSize: 13 },
});
