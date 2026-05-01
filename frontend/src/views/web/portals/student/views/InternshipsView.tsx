import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Search, MapPin, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const INTERNSHIPS = [
  { id: 1, role: 'SDE Intern',                company: 'Google',     location: 'Bengaluru',  type: 'Internship', stipend: '₹1.2L/mo', match: 87, posted: '2d', logo: 'G', logoBg: '#4285F4' },
  { id: 2, role: 'PM Intern',                 company: 'Flipkart',   location: 'Bengaluru',  type: 'Internship', stipend: '₹95k/mo',  match: 86, posted: '3d', logo: 'F', logoBg: '#2874F0' },
  { id: 3, role: 'Data Science Intern',       company: 'Swiggy',     location: 'Remote',     type: 'Internship', stipend: '₹80k/mo',  match: 84, posted: '5d', logo: 'S', logoBg: '#FC8019' },
  { id: 4, role: 'UX Design Intern',          company: 'Razorpay',   location: 'Bengaluru',  type: 'Internship', stipend: '₹70k/mo',  match: 82, posted: '6d', logo: 'R', logoBg: '#02C0F1' },
  { id: 5, role: 'Frontend Dev (Full-time)',  company: 'CRED',       location: 'Bengaluru',  type: 'Full-time',  stipend: '₹24 LPA',  match: 79, posted: '1w', logo: 'C', logoBg: '#1A1A1A' },
  { id: 6, role: 'Marketing Intern',          company: 'Zomato',     location: 'Gurugram',   type: 'Internship', stipend: '₹40k/mo',  match: 76, posted: '1w', logo: 'Z', logoBg: '#E23744' },
  { id: 7, role: 'iOS Engineer Intern',       company: 'Stripe',     location: 'Hybrid',     type: 'Internship', stipend: '₹1.4L/mo', match: 81, posted: '2w', logo: 'S', logoBg: '#635BFF' },
  { id: 8, role: 'ML Research Intern',        company: 'OpenAI',     location: 'Remote',     type: 'Internship', stipend: '$8k/mo',   match: 92, posted: '2w', logo: 'O', logoBg: '#10A37F' },
];

const FILTERS = ['All', 'Internship', 'Full-time', 'Remote'];

export function InternshipsView() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [saved, setSaved] = useState<Set<number>>(new Set([8]));

  const list = INTERNSHIPS.filter((i) => {
    if (filter !== 'All' && filter !== 'Remote' && i.type !== filter) return false;
    if (filter === 'Remote' && !i.location.toLowerCase().includes('remote')) return false;
    if (q && !(i.role + i.company + i.location).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggleSave = (id: number) => setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <View>
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
          <View key={j.id} style={s.row}>
            <View style={[s.logo, { backgroundColor: j.logoBg }]}><Text style={s.logoText}>{j.logo}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={s.role}>{j.role}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <Text style={s.meta}>{j.company}</Text>
                <Text style={s.dot}>·</Text>
                <MapPin size={11} color={SC.muted} /><Text style={s.meta}>{j.location}</Text>
                <Text style={s.dot}>·</Text>
                <Text style={s.meta}>{j.posted} ago</Text>
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
