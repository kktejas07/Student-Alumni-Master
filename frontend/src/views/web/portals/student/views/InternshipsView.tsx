import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Search, MapPin, Bookmark, BookmarkCheck, ExternalLink, Sparkles } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { TierBadge, TierPill } from '@/src/views/web/TierBadge';

type Job = {
  id: string; title: string; company: string; location: string; type: string;
  stipend: string; match: number; logo: string; logoBg: string;
  mode?: string; skills?: string[]; posted?: string;
  tier?: string; tier_recommended?: boolean; tier_visuals?: any;
};
type FetchShape = {
  items: Job[];
  user_tier?: { tier?: string; score?: number; visuals?: any; suggestions?: any };
  stretch_goals?: Job[];
};
const FALLBACK: FetchShape = { items: [] };

const FILTERS = ['All', 'Internship', 'Full-time', 'Remote', 'Recommended'];

export function InternshipsView() {
  const { width } = useWindowDimensions();
  const { data } = usePortalData<FetchShape>('/student/internships', FALLBACK);
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const INTERNSHIPS = data?.items || [];
  const userTier = data?.user_tier;

  const list = INTERNSHIPS.filter((i) => {
    if (filter === 'Recommended' && !i.tier_recommended) return false;
    if (filter !== 'All' && filter !== 'Remote' && filter !== 'Recommended' && i.type !== filter) return false;
    if (filter === 'Remote' && !i.location.toLowerCase().includes('remote')) return false;
    if (q && !(i.title + i.company + i.location).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggleSave = (id: string) => setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <View>
      {/* Tier banner */}
      {userTier?.tier && (
        <View style={s.tierBanner}>
          <TierBadge tier={userTier.tier} size="md" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.tierTxt}>You're at <Text style={{ color: userTier.visuals?.glow || '#A78BFA', fontFamily: FONTS.xbold }}>{userTier.tier}</Text> tier · {userTier.score}/100</Text>
            <Text style={s.tierSub}>Internships matching your tier are pinned to the top</Text>
          </View>
          <Pressable onPress={() => setFilter('Recommended')} style={({ hovered }: any) => [s.tierCta, hovered && { backgroundColor: SC.cardH }]}>
            <Sparkles size={11} color={SC.accentBright} />
            <Text style={s.tierCtaText}>Show recommended only</Text>
          </Pressable>
        </View>
      )}

      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
              <Text style={{ color: filter === f ? '#fff' : SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.searchBox}>
          <Search size={14} color={SC.dim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Role, company, city" placeholderTextColor={SC.dim} style={s.searchInput} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {list.map((j) => (
          <View
            key={j.id}
            style={[
              s.row,
              j.tier_recommended && {
                borderColor: j.tier_visuals?.ring || 'rgba(167,139,250,0.45)',
                ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 12px ${(j.tier_visuals?.glow || '#A78BFA')}33` } as any) : {}),
              },
            ]}
          >
            <View style={[s.logo, { backgroundColor: j.logoBg }]}><Text style={s.logoText}>{j.logo}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text numberOfLines={1} style={s.role}>{j.title}</Text>
                {j.tier && <TierPill tier={j.tier} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <Text style={s.meta}>{j.company}</Text>
                <Text style={s.dot}>·</Text>
                <MapPin size={11} color={SC.muted} /><Text style={s.meta}>{j.location}</Text>
                {j.posted && <><Text style={s.dot}>·</Text><Text style={s.meta}>{j.posted} ago</Text></>}
              </View>
              <Text style={s.stipend}>{j.stipend}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={s.matchPill}><Text style={s.matchText}>✦ {j.match}% match</Text></View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => toggleSave(j.id)} style={s.iconBtn}>
                  {saved.has(j.id) ? <BookmarkCheck size={14} color={SC.accentBright} /> : <Bookmark size={14} color={SC.muted} />}
                </Pressable>
                <Pressable style={s.applyBtn}><Text style={s.applyText}>Apply</Text><ExternalLink size={11} color="#fff" /></Pressable>
              </View>
            </View>
          </View>
        ))}
        {list.length === 0 && <Text style={{ color: SC.muted, padding: 20, textAlign: 'center' }}>No matches.</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  tierTxt: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  tierSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  tierCta: {
    flexDirection: 'row', gap: 5, alignItems: 'center',
    paddingHorizontal: 12, height: 30, borderRadius: 8,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tierCtaText: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11 },

  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SC.primary, borderColor: SC.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 240, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  logo: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  role: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  stipend: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12, marginTop: 4 },
  matchPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 },
  matchText: { color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 11 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  applyText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
});
