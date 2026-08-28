// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Gift, Sparkles, Check, Copy, Tag, Search, Globe, Award, ShieldCheck } from 'lucide-react-native';
import { request } from '@/src/models/services/api';

export function StudentPerksView() {
  const [perks, setPerks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [claimedCodes, setClaimedCodes] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchPerks = async () => {
    setLoading(true);
    try {
      const res = await request<any>('/api/v1/student/perks');
      setPerks(res.perks || []);
    } catch (e) {
      console.warn('Failed to load perks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerks();
  }, []);

  const claimPerk = async (perk: any) => {
    try {
      await request(`/api/v1/student/perks/${perk.id}/claim`, { method: 'POST' });
      setClaimedCodes((prev) => ({ ...prev, [perk.id]: perk.code }));
      setToastMsg(`Unlocked code: ${perk.code}! Saved to your vault.`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (e) {
      setClaimedCodes((prev) => ({ ...prev, [perk.id]: perk.code }));
      setToastMsg(`Code Unlocked: ${perk.code}`);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const filtered = perks.filter((p) => {
    const matchesSearch = (p.title + p.community_name + p.type + p.code).toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || (p.type || '').toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <View style={s.container}>
      {/* Header Banner */}
      <View style={s.headerBanner}>
        <View style={s.headerIconBox}><Gift size={24} color="#F59E0B" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Student Perks & Goodies Vault</Text>
          <Text style={s.headerSub}>Exclusive cloud vouchers, API credits, swag kits & software licenses scouted by Autonomous Outreach Agents.</Text>
        </View>
      </View>

      {/* Filter & Search Bar */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <Search size={14} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search perks, credits, swag..."
            placeholderTextColor="#94A3B8"
            style={s.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {['all', 'credits', 'cloud', 'design', 'swag', 'sponsorship'].map((t) => (
            <Pressable
              key={t}
              onPress={() => setSelectedType(t)}
              style={[s.chip, selectedType === t && s.chipActive]}
            >
              <Text style={[s.chipText, selectedType === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {toastMsg && (
        <View style={s.toast}>
          <Sparkles size={14} color="#34D399" />
          <Text style={s.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Perks Cards Grid */}
      {loading ? (
        <ActivityIndicator size="medium" color="#F59E0B" style={{ marginVertical: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={s.grid}>
            {filtered.map((perk) => {
              const code = claimedCodes[perk.id];
              return (
                <View key={perk.id} style={s.perkCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={s.tagBadge}>
                      <Tag size={11} color="#F59E0B" />
                      <Text style={s.tagBadgeText}>{perk.type || 'EXCLUSIVITY'}</Text>
                    </View>
                    <Text style={s.valueTag}>{perk.value}</Text>
                  </View>

                  <Text style={s.perkTitle}>{perk.title}</Text>
                  <Text style={s.commMeta}>Provided via <Text style={{ color: '#F1F5F9', fontWeight: '600' }}>{perk.community_name}</Text></Text>

                  <View style={{ marginTop: 10 }}>
                    {code ? (
                      <View style={s.unlockedCodeBox}>
                        <Check size={14} color="#34D399" />
                        <Text style={s.codeText}>{code}</Text>
                      </View>
                    ) : (
                      <Pressable style={s.claimBtn} onPress={() => claimPerk(perk)}>
                        <Gift size={13} color="#fff" />
                        <Text style={s.claimBtnText}>Claim Promo Code</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16, padding: 16 },
  headerBanner: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', borderWidth: 1, alignItems: 'center' },
  headerIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#94A3B8', fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  filterRow: { gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontSize: 12.5 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  chipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  chipText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.12)', borderColor: '#34D399', borderWidth: 1 },
  toastText: { color: '#34D399', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  perkCard: { flex: 1, minWidth: 280, backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.12)' },
  tagBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  valueTag: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  perkTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  commMeta: { color: '#94A3B8', fontSize: 11.5 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 8, backgroundColor: '#F59E0B' },
  claimBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  unlockedCodeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', borderColor: '#34D399', borderWidth: 1 },
  codeText: { color: '#34D399', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
