import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, useWindowDimensions, Platform, Linking } from 'react-native';
import { Search, Users, Eye } from 'lucide-react-native';
import { Linkedin, Github } from '../../student/iconShims';
import { CC } from '../tokens';
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
  
  const cardW = width >= 1100 ? '24%' : width >= 720 ? '48%' : '100%';
  
  return (
    <View>
      <View className="flex-row flex-wrap gap-[10px] items-center mb-[14px]">
        <View className="flex-row gap-[6px] flex-wrap">{BATCHES.map((b) => <Pressable key={b} onPress={() => setFilter(b)}
          className={`px-3 h-[30px] rounded-lg border items-center justify-center ${filter === b ? 'bg-violet border-violet' : 'bg-glass-soft border-glass-border'}`}>
          <Text className={`font-body-bold text-xs ${filter === b ? 'text-text' : 'text-muted'}`}>{b}</Text>
        </Pressable>)}</View>
        <View className="flex-1" />
        <View className="flex-row items-center gap-2 w-[220px] h-[34px] px-[11px] rounded-[10px] bg-glass-soft border border-glass-border">
          <Search size={14} color={CC.dim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search alumni" placeholderTextColor={CC.dim}
            className="flex-1 text-text font-body text-xs"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {list.map((a) => (
          <View key={a.id} className="bg-glass-soft border border-glass-border rounded-2xl p-4" style={{ width: cardW as any }}>
            <View className="flex-row gap-3 items-center">
              <View className="rounded-full border-2 p-[2px]" style={{ borderColor: a.color }}>
                <Av initials={a.initials} size={48} color={a.color} />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-[6px] flex-wrap">
                  <Text numberOfLines={1} className="text-text font-body-bold text-[14px]">{a.name}</Text>
                  <View className="bg-[rgba(167,139,250,0.1)] px-2 py-[2px] rounded-[10px] border border-[rgba(167,139,250,0.2)]">
                    <Text className="text-[#A78BFA] text-[10px] font-body-bold">Batch {a.batch}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} className="text-muted font-body text-xs mt-1">{a.role}</Text>
                <Text numberOfLines={1} className="text-dim font-body text-[11px] mt-[2px]">
                  {a.company ? `${a.company}` : ''}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-[6px] mt-3">
              {(a.skills || []).slice(0, 3).map((skill: string, sIdx: number) => (
                <View key={sIdx} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-[10px] py-1 rounded-lg">
                  <Text className="text-muted font-body text-[11px]">{skill}</Text>
                </View>
              ))}
              {(!a.skills || a.skills.length === 0) && (
                <View className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-[10px] py-1 rounded-lg">
                  <Text className="text-muted font-body text-[11px]">Graduated {a.batch}</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center mt-3">
              <Users size={12} color={CC.dim} style={{ marginRight: 6 }} />
              <Text className="text-dim font-body text-[11px]">Graduated {a.batch} • {a.city}</Text>
            </View>

            <View className="flex-row items-center gap-2 mt-4">
              <Pressable 
                onPress={() => router.push(`/profile/${a.id}`)}
                className="flex-1 flex-row h-[34px] rounded-lg bg-[rgba(94,234,212,0.1)] border border-[rgba(94,234,212,0.3)] items-center justify-center gap-[6px]"
                style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
                <Eye size={14} color="#5EEAD4" />
                <Text className="text-teal font-body-bold text-xs">View Profile</Text>
              </Pressable>

              {a.linkedin_url && (
                <Pressable onPress={() => Linking.openURL(a.linkedin_url)}
                  className="w-[34px] h-[34px] rounded-lg bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.3)] items-center justify-center">
                  <Linkedin size={14} color="#60A5FA" />
                </Pressable>
              )}
              {a.github_url && (
                <Pressable onPress={() => Linking.openURL(a.github_url)}
                  className="w-[34px] h-[34px] rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] items-center justify-center">
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
