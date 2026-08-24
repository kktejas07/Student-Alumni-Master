import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Platform, Linking, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Search, Filter, X, MapPin, Briefcase, GraduationCap, Star } from 'lucide-react-native';
import { request, resolveImageUrl } from '@/src/models/services/api';
import Svg, { Path, G } from 'react-native-svg';

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11-.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z" />
    </Svg>
  );
}

function GitHubIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fill="#fff" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </Svg>
  );
}

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
  photo_data?: string;
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
      <View className="flex-row flex-wrap gap-1">
        {display.map((sk, i) => (
          <View key={i} className="bg-violet/15 rounded-lg px-2 py-0.5">
            <Text className="text-violet text-xs font-body-semibold">{sk}</Text>
          </View>
        ))}
        {skills.length > 5 && (
          <Text className="text-muted text-xs self-center">+{skills.length - 5}</Text>
        )}
      </View>
    );
  };

  const renderProfileCard = (profile: TalentProfile) => (
    <Pressable
      key={profile.id}
      className="rounded-xl border p-3.5 gap-2.5"
      style={{
        width: Platform.OS === 'web' ? 'calc(33.333% - 8px)' as any : '48%' as any,
        minWidth: 280, flex: 1,
        backgroundColor: COLORS.card, borderColor: COLORS.border,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
      }}
      onPress={() => {
        if (profile.linkedin_url) {
          Platform.OS === 'web'
            ? (window as any).open(profile.linkedin_url, '_blank')
            : Linking.openURL(profile.linkedin_url);
        }
      }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-2.5">
        {profile.photo_url || profile.photo_data ? (
          <Image source={{ uri: resolveImageUrl(profile.photo_url) || profile.photo_data! }} className="w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.card }} />
        ) : (
          <View className="w-10 h-10 rounded-full bg-violet items-center justify-center">
            <Text className="text-white text-base font-body-bold">
              {(profile.full_name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-white text-base font-body-semibold" numberOfLines={1}>{profile.full_name}</Text>
          {profile.headline && (
            <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>{profile.headline}</Text>
          )}
        </View>
      </View>

      {/* Details */}
      <View className="gap-1">
        {profile.current_role && profile.current_company && (
          <View className="flex-row items-center gap-1.5">
            <Briefcase size={12} color={COLORS.muted} />
            <Text className="text-muted text-xs flex-1" numberOfLines={1}>
              {profile.current_role} at {profile.current_company}
            </Text>
          </View>
        )}
        {profile.location && (
          <View className="flex-row items-center gap-1.5">
            <MapPin size={12} color={COLORS.muted} />
            <Text className="text-muted text-xs">{profile.location}</Text>
          </View>
        )}
        {profile.education && (
          <View className="flex-row items-center gap-1.5">
            <GraduationCap size={12} color={COLORS.muted} />
            <Text className="text-muted text-xs flex-1" numberOfLines={1}>
              {profile.education}
              {profile.graduation_year ? ` · ${profile.graduation_year}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && renderSkillChips(profile.skills)}

      {/* Actions */}
      <View className="flex-row gap-1.5 items-center mt-0.5">
        {profile.linkedin_url && (
          <Pressable
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ backgroundColor: COLORS.linkedin }}
            onPress={(e) => {
              e.stopPropagation?.();
              Platform.OS === 'web'
                ? (window as any).open(profile.linkedin_url, '_blank')
                : Linking.openURL(profile.linkedin_url!);
            }}
          >
            <LinkedInIcon size={12} />
            <Text className="text-white text-xs font-body-semibold">LinkedIn</Text>
          </Pressable>
        )}
        {profile.github_url && (
          <Pressable
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ backgroundColor: COLORS.github }}
            onPress={(e) => {
              e.stopPropagation?.();
              Platform.OS === 'web'
                ? (window as any).open(profile.github_url, '_blank')
                : Linking.openURL(profile.github_url!);
            }}
          >
            <GitHubIcon size={12} />
            <Text className="text-white text-xs font-body-semibold">GitHub</Text>
          </Pressable>
        )}
        {profile.experience_years != null && (
          <View className="flex-row items-center gap-0.5 ml-auto bg-amber/15 px-2 py-1 rounded-lg">
            <Star size={10} color="#F59E0B" />
            <Text className="text-amber text-xs font-body-semibold">{profile.experience_years}y exp</Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1">
      <LinearGradient colors={['#1A0438', '#2D0760']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView className="flex-1 px-4" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row justify-between items-center pt-4 pb-3">
          <View>
            className="text-white text-2xl font-body-bold"
            <Text className="text-white text-2xl font-body-bold">Talent Pool</Text>
            <Text className="text-muted text-sm mt-0.5">{total} profiles available</Text>
          </View>
        </View>

        {/* Search bar */}
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1 flex-row items-center rounded-xl border px-3 gap-2 h-11" style={{ backgroundColor: COLORS.inputBg, borderColor: COLORS.border }}>
            <Search size={16} color={COLORS.muted} />
            <TextInput
              className="flex-1 text-white text-base"
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, skills, company..."
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={onSearch}
              returnKeyType="search"
              style={Platform.OS === 'web' ? { fontFamily: 'Inter, sans-serif', outlineStyle: 'none' as any } : {}}
            />
            {search.length > 0 && (
              <Pressable onPress={() => { setSearch(''); setTimeout(onSearch, 100); }}>
                <X size={16} color={COLORS.muted} />
              </Pressable>
            )}
          </View>
          <Pressable
            className="w-11 h-11 rounded-xl border items-center justify-center"
            style={showFilters ? { backgroundColor: COLORS.accent, borderColor: COLORS.accent } : { backgroundColor: COLORS.inputBg, borderColor: COLORS.border }}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} color={showFilters ? '#fff' : COLORS.muted} />
          </Pressable>
        </View>

        {/* Filter chips */}
        {showFilters && (
          <View className="rounded-xl border p-3 mb-3 gap-2" style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}>
            <Text className="text-muted text-xs font-body-semibold">Filter by skill:</Text>
            <View className="flex-row items-center rounded-xl border px-3 gap-2" style={{ backgroundColor: COLORS.inputBg, borderColor: COLORS.border, height: 36 }}>
              <TextInput
                className="flex-1 text-white"
                value={skillFilter}
                onChangeText={setSkillFilter}
                placeholder="e.g. Python, React, AI"
                placeholderTextColor={COLORS.muted}
                onSubmitEditing={onSearch}
                style={{ fontSize: 13 }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-9">
              {allSkills.slice(0, 30).map((sk) => (
                <Pressable
                  key={sk}
                  className="px-2.5 py-1.5 rounded-2xl mr-1.5 border"
                  style={skillFilter.includes(sk) ? { backgroundColor: COLORS.accent, borderColor: COLORS.accent } : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: COLORS.border }}
                  onPress={() => {
                    const current = skillFilter.split(',').map(s => s.trim()).filter(Boolean);
                    if (current.includes(sk)) {
                      setSkillFilter(current.filter(s => s !== sk).join(','));
                    } else {
                      setSkillFilter([...current, sk].join(','));
                    }
                  }}
                >
                  <Text style={skillFilter.includes(sk) ? { color: '#fff' } : { color: COLORS.muted }} className="text-xs">
                    {sk}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-rose text-base">{error}</Text>
            <Pressable className="px-4 py-2 rounded-lg border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }} onPress={() => fetchProfiles(page)}>
              <Text className="text-white text-sm">Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View className="flex-1 items-center justify-center gap-2">
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : profiles.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Text className="text-muted text-base">No profiles found</Text>
            <Text className="text-muted text-xs">Try adjusting your search or filters</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            {profiles.map(renderProfileCard)}
          </ScrollView>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <View className="flex-row justify-center items-center py-3 gap-4">
            <Pressable
              className="px-4 py-2 rounded-lg border"
              style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, opacity: page <= 1 ? 0.4 : 1 }}
              onPress={() => page > 1 && (setPage(page - 1), fetchProfiles(page - 1))}
            >
              <Text style={page <= 1 ? { color: COLORS.muted } : { color: '#fff' }} className="text-sm">Previous</Text>
            </Pressable>
            <Text className="text-muted text-sm">{page} / {pages}</Text>
            <Pressable
              className="px-4 py-2 rounded-lg border"
              style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, opacity: page >= pages ? 0.4 : 1 }}
              onPress={() => page < pages && (setPage(page + 1), fetchProfiles(page + 1))}
            >
              <Text style={page >= pages ? { color: COLORS.muted } : { color: '#fff' }} className="text-sm">Next</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
