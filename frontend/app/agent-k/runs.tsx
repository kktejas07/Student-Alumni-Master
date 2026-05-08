/**
 * Agent K — Runs history page (/agent-k/runs).
 *
 * Lists the user's recent automation runs with status, prompt, and a
 * one-click "Open" to view the full audit log on the workspace page.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NX } from '@/src/theme/nexus';
import { request } from '@/src/models/services/api';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

type RunListItem = {
  id: string; prompt: string; status: string;
  summary?: string | null; steps_n?: number;
  started_at: string; result_summary?: string | null;
};

const STATUS_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  completed:                { color: NX.success, bg: NX.successBg, label: 'Completed',          icon: 'check-circle' },
  awaiting_approval:        { color: NX.warning, bg: NX.warningBg, label: 'Awaiting plan OK',    icon: 'clock-outline' },
  awaiting_step_approval:   { color: NX.warning, bg: NX.warningBg, label: 'Needs your approval', icon: 'shield-alert-outline' },
  running:                  { color: NX.blue,    bg: NX.blueSoft,  label: 'Running',             icon: 'progress-clock' },
  failed:                   { color: NX.danger,  bg: NX.dangerBg,  label: 'Failed',              icon: 'close-circle' },
  cancelled:                { color: NX.textT,   bg: NX.surface3,  label: 'Cancelled',           icon: 'minus-circle-outline' },
};

export default function AgentKRunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await request('/agent-k/runs?limit=40');
      setRuns(r?.runs || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <FeaturePageShell title="Run history" subtitle="All your Agent K automations" heroEmoji="📜" accent={NX.purple}>
      <View style={s.frame}>
        <View style={s.headRow}>
          <Text style={s.heading}>Recent automations</Text>
          <Pressable onPress={() => router.push('/agent-k')} style={s.newBtn}>
            <MaterialCommunityIcons name="plus" size={14} color="#fff" />
            <Text style={s.newBtnText}>New automation</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.empty}><ActivityIndicator color={NX.purple} /></View>
        ) : runs.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="robot-outline" size={36} color={NX.textT} />
            <Text style={s.emptyTitle}>No runs yet</Text>
            <Text style={s.emptySub}>Press ⌘K from anywhere to launch your first automation.</Text>
          </View>
        ) : (
          <FlatList
            data={runs}
            keyExtractor={(it) => it.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={NX.purple} />}
            renderItem={({ item, index }) => {
              const meta = STATUS_META[item.status] || STATUS_META.running;
              return (
                <Animated.View entering={FadeIn.delay(index * 30).duration(180)}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/agent-k', params: { resume_run: item.id } })}
                    style={({ hovered }: any) => ([
                      s.row,
                      hovered && Platform.OS === 'web' ? { borderColor: NX.borderHi, backgroundColor: NX.surface3 } as any : null,
                    ])}
                  >
                    <View style={[s.statusDot, { backgroundColor: meta.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowPrompt} numberOfLines={1}>{item.prompt}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>{item.summary || item.result_summary || '—'}</Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[s.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={s.timeText}>{new Date(item.started_at).toLocaleString()}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={NX.textT} />
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        )}
      </View>
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  frame: {
    backgroundColor: NX.surface2, borderRadius: 18,
    borderWidth: 1, borderColor: NX.border,
    padding: 18, minHeight: 480,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  heading: { color: NX.textP, fontFamily: FONT, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: NX.purple,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  newBtnText: { color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { color: NX.textP, fontFamily: FONT, fontSize: 14, fontWeight: '600', marginTop: 8 },
  emptySub: { color: NX.textS, fontFamily: FONT, fontSize: 12 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
    backgroundColor: NX.surface2, borderWidth: 1, borderColor: NX.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowPrompt: { color: NX.textP, fontFamily: FONT, fontSize: 13.5, fontWeight: '600' },
  rowSub: { color: NX.textS, fontFamily: FONT, fontSize: 11.5, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontFamily: FONT, fontSize: 11, fontWeight: '600' },
  timeText: { color: NX.textT, fontFamily: FONT, fontSize: 10.5,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
});
