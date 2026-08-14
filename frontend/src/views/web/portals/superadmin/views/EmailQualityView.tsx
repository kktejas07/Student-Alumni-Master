/**
 * Super Admin → Email health.
 * Bounced / suppressed inboxes and recent form/send blocks.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ShieldOff, RefreshCw, Ban, Undo2 } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, SecondaryButton, Card, IconBox, SectionLabel,
  StatusPill, Toast, useToast, KpiTile, SearchField,
} from '../applekit';
import { api } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';

type Row = {
  email?: string;
  reason?: string;
  source?: string;
  kind?: string;
  created_at?: string;
  updated_at?: string;
};

function fmt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function kindLabel(kind?: string) {
  if (kind === 'bounce') return 'Bounce';
  if (kind === 'form_block') return 'Form blocked';
  if (kind === 'skipped_send') return 'Send skipped';
  return kind || 'Event';
}

export function EmailQualityView() {
  const { toast, flash, hide } = useToast();
  const { confirm } = useConfirm();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [events7d, setEvents7d] = useState(0);
  const [suppressions, setSuppressions] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);

  const load = useCallback(async (needle = q) => {
    setLoading(true);
    try {
      const data: any = await api.emailQualityReport(needle.trim());
      setSuppressedCount(data?.suppressed_count || 0);
      setEvents7d(data?.events_7d || 0);
      setSuppressions(data?.suppressions || []);
      setEvents(data?.events || []);
    } catch (e: any) {
      flash(e?.message || 'Could not load email health', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, flash]);

  useEffect(() => { load(''); }, []);

  const restore = async (email: string) => {
    const ok = await confirm({
      title: 'Allow this address again?',
      message: `${email} will be removed from the bounce list. The next send will go to Postal.`,
      confirmText: 'Restore',
    });
    if (!ok) return;
    try {
      await api.unsuppressEmail(email);
      flash(`Restored ${email}`);
      load();
    } catch (e: any) {
      flash(e?.message || 'Could not restore', 'error');
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><ShieldOff size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Email health</Text>
            <Text style={st.sub}>
              Addresses Postal bounced, plus dummy/temp emails blocked on forms or skipped before send.
              Restore only if you know the inbox is real.
            </Text>
          </View>
          <SecondaryButton onPress={() => load()}>
            {loading ? <ActivityIndicator size="small" color={SAC.muted} /> : <RefreshCw size={12} color={SAC.muted} />}
            <Text style={st.secText}>Refresh</Text>
          </SecondaryButton>
        </View>
      </Card>

      <View style={st.kpiRow}>
        <KpiTile Icon={Ban} label="Suppressed (no Postal send)" value={String(suppressedCount)} />
        <KpiTile Icon={ShieldOff} label="Blocks / skips (7 days)" value={String(events7d)} />
      </View>

      <Card>
        <View style={st.cardHead}>
          <SectionLabel>SEARCH</SectionLabel>
          <SearchField value={q} onChange={setQ} placeholder="Filter by email…" width={280} />
          <Pressable onPress={() => load(q)} style={st.searchGo}>
            <Text style={st.secText}>Apply</Text>
          </Pressable>
        </View>
      </Card>

      <Card>
        <View style={st.cardHead}>
          <SectionLabel>BOUNCED / SUPPRESSED</SectionLabel>
          <StatusPill kind="warn" label={`${suppressions.length} shown`} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {loading && suppressions.length === 0 ? (
            <Text style={st.muted}>Loading…</Text>
          ) : suppressions.length === 0 ? (
            <Text style={st.muted}>None yet. Hard bounces from Postal appear here automatically.</Text>
          ) : suppressions.map((row) => (
            <View key={row.email} style={st.row}>
              <IconBox size={30}><Ban size={13} color="#FCA5A5" /></IconBox>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={st.email}>{row.email}</Text>
                <Text numberOfLines={2} style={st.meta}>
                  {row.reason || 'hard bounce'}
                  {row.source ? ` · ${row.source}` : ''}
                  {' · last '}{fmt(row.updated_at || row.created_at)}
                </Text>
              </View>
              <Pressable onPress={() => restore(row.email || '')} style={st.restore}>
                <Undo2 size={12} color="#6EE7B7" />
                <Text style={st.restoreText}>Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={st.cardHead}>
          <SectionLabel>RECENT ACTIVITY</SectionLabel>
          <StatusPill kind="info" label={`${events.length} shown`} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {events.length === 0 ? (
            <Text style={st.muted}>Form blocks and skipped sends will list here as they happen.</Text>
          ) : events.map((row, i) => (
            <View key={`${row.email}-${row.created_at}-${i}`} style={st.row}>
              <IconBox size={30}><Ban size={13} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={st.email}>{row.email}</Text>
                <Text numberOfLines={2} style={st.meta}>
                  {kindLabel(row.kind)} · {row.reason || '—'}
                  {row.source ? ` · ${row.source}` : ''}
                  {' · '}{fmt(row.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  searchGo: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: SAC.border,
  },
  email: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  restore: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(110,231,183,0.35)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  restoreText: { color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 12 },
});
