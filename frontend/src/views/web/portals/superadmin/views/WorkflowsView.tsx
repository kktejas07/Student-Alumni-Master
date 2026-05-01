import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Platform } from 'react-native';
import { Workflow, Zap, Clock, ChevronRight, Plus, Play, AlertTriangle } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Wf = { id: string; name: string; trigger: string; steps: string[]; runs: number; success: number; on: boolean; color: string };
const FALLBACK = { items: [] as Wf[] };

export function WorkflowsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/workflows', FALLBACK);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const items: Wf[] = (data?.items || []).map((w) => ({ ...w, on: overrides[w.id] !== undefined ? overrides[w.id] : w.on }));

  const toggle = async (id: string, current: boolean) => {
    setOverrides((p) => ({ ...p, [id]: !current }));
    try { await postPortal(`/admin/super/workflows/${id}/toggle`); } catch {}
  };

  return (
    <View>
      <View style={s.banner}>
        <View style={s.bIcon}><Workflow size={16} color={SAC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.bTitle}>Automation Builder</Text>
            <Badge label="NEW" color="orange" />
          </View>
          <Text style={s.bSub}>Build event-triggered workflows visually. Approvals, alerts, payouts, and re-engagement — all without writing code.</Text>
        </View>
        <Pressable style={s.cta}><Plus size={13} color="#fff" /><Text style={s.ctaText}>New workflow</Text></Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {items.map((w) => {
          const successPct = Math.round((w.success / Math.max(w.runs, 1)) * 100);
          return (
            <View key={w.id} style={s.card}>
              <View style={[s.dot, { backgroundColor: w.color }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text numberOfLines={1} style={s.name}>{w.name}</Text>
                  {!w.on && <Badge label="PAUSED" color="gray" />}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Zap size={11} color={SAC.muted} />
                  <Text style={s.trigger}>{w.trigger}</Text>
                  <Text style={s.dotSep}>·</Text>
                  <Clock size={11} color={SAC.muted} />
                  <Text style={s.trigger}>{w.steps.length} steps</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {w.steps.map((step, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.step}>{step}</Text>
                      {idx < w.steps.length - 1 && <ChevronRight size={10} color={SAC.dim} />}
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.statRuns}>{w.runs.toLocaleString('en-IN')} runs</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {successPct < 100 && <AlertTriangle size={11} color={SAC.amber} />}
                  <Text style={[s.statSuccess, { color: successPct >= 99 ? SAC.green : successPct >= 90 ? SAC.amber : SAC.red }]}>{successPct}% success</Text>
                </View>
              </View>
              <Switch
                value={w.on}
                onValueChange={() => toggle(w.id, w.on)}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: SAC.primary }}
                thumbColor={w.on ? '#fff' : '#ccc'}
                {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
              />
              <Pressable style={s.runBtn}><Play size={11} color={SAC.muted} /><Text style={s.runText}>Run</Text></Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: 'rgba(249,115,22,0.06)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  bIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  dot: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  trigger: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dotSep: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  step: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)' },

  statRuns: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  statSuccess: { fontFamily: FONTS.bold, fontSize: 11 },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SAC.border },
  runText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
});
