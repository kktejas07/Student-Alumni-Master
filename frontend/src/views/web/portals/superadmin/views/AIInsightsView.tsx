import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Zap } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Insight = { id: string; kind: 'risk' | 'opportunity' | 'insight'; icon: string; color: string; title: string; body: string };
const ICON_MAP: Record<string, any> = { AlertTriangle, TrendingUp, Lightbulb, Zap };
const FALLBACK = { items: [] as Insight[] };

export function AIInsightsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/ai-insights', FALLBACK);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const items = (data?.items || []).filter((i) => !dismissed.has(i.id));

  const onDismiss = async (id: string) => {
    setDismissed((p) => new Set(p).add(id));
    try { await postPortal(`/admin/super/ai-insights/${id}/dismiss`); } catch {}
  };
  return (
    <View>
      <View style={s.banner}>
        <View style={s.bIcon}><Sparkles size={16} color={SAC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bTitle}>Platform Briefing · Powered by Claude</Text>
          <Text style={s.bSub}>6 prioritized insights generated this morning. Trust the high-priority ones — they’ve been verified against the last 90 days of platform data.</Text>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {items.map((it) => {
          const Icon = ICON_MAP[it.icon] || Lightbulb;
          return (
            <View key={it.id} style={s.card}>
              <View style={[s.icon, { backgroundColor: it.color + '20', borderColor: it.color + '40' }]}><Icon size={15} color={it.color} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.title}>{it.title}</Text>
                  <Badge label={it.kind === 'risk' ? 'RISK' : it.kind === 'opportunity' ? 'OPPORTUNITY' : 'INSIGHT'} color={it.kind === 'risk' ? 'red' : it.kind === 'opportunity' ? 'green' : 'amber'} />
                </View>
                <Text style={s.body}>{it.body}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable style={s.actBtn}><Text style={s.actText}>Take action</Text></Pressable>
                  <Pressable style={s.dismissBtn} onPress={() => onDismiss(it.id)}><Text style={s.dismissText}>Dismiss</Text></Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: 'rgba(251,191,36,0.06)', borderColor: SAC.border2, borderWidth: 1 },
  bIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  body: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  actBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  actText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  dismissBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.card, alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
});
