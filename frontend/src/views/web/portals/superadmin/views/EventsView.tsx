/**
 * EventsView — Amber Admin theme.
 *
 * Card grid of events from `/admin/super/events`. Uses the unified
 * applekit primitives (Card, IconBox, KpiTile, StatusPill, etc.) so
 * it visually matches Overview / Imports / Colleges / Students.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, ShieldCheck, AlertTriangle, IndianRupee, Sparkles, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, GradientButton, SecondaryButton, SearchField, TopTabs, EmptyState } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; status: string; kind: string; price?: number; accent: string };
const FALLBACK = { items: [] as Ev[] };

type Tab = 'all' | 'live' | 'pending' | 'free' | 'paid';

export function EventsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/events', FALLBACK);
  const EVENTS = data?.items || [];
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    return EVENTS.filter((e) => {
      if (tab === 'live'    && e.status !== 'live')    return false;
      if (tab === 'pending' && e.status !== 'pending') return false;
      if (tab === 'free'    && e.kind   !== 'free')    return false;
      if (tab === 'paid'    && e.kind   !== 'paid')    return false;
      if (q && !`${e.title} ${e.city} ${e.cat}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [EVENTS, tab, q]);

  const counts = {
    all: EVENTS.length,
    live: EVENTS.filter((e) => e.status === 'live').length,
    pending: EVENTS.filter((e) => e.status === 'pending').length,
    free: EVENTS.filter((e) => e.kind === 'free').length,
    paid: EVENTS.filter((e) => e.kind === 'paid').length,
  };
  const tabs = [
    { id: 'all',     label: 'All',     count: counts.all },
    { id: 'live',    label: 'Live',    count: counts.live },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'free',    label: 'Free',    count: counts.free },
    { id: 'paid',    label: 'Paid',    count: counts.paid },
  ] as const;

  const cols = width >= 1280 ? 3 : width >= 760 ? 2 : 1;
  const totalRevenue = EVENTS.filter((e) => e.kind === 'paid').reduce((n, e) => n + (e.price || 0) * (e.attending || 0), 0);

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><CalIcon size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Events</Text>
            <Text style={st.sub}>Manage live + upcoming events across all colleges. Approve new submissions and track attendance live.</Text>
          </View>
          <GradientButton onPress={() => {}}><Plus size={13} color="#fff" /><Text style={st.btnText}>New event</Text></GradientButton>
        </View>
      </Card>

      {/* KPIs */}
      <View style={st.kpiRow}>
        <KpiTile Icon={CalIcon}        label="TOTAL EVENTS"      value={String(counts.all)} />
        <KpiTile Icon={ShieldCheck}    label="LIVE NOW"          value={String(counts.live)}    delta="active"  deltaKind="success" />
        <KpiTile Icon={AlertTriangle}  label="PENDING APPROVAL"  value={String(counts.pending)} delta={counts.pending ? 'review' : 'clear'} deltaKind={counts.pending ? 'warn' : 'success'} />
        <KpiTile Icon={IndianRupee}    label="GROSS REVENUE"     value={`₹${(totalRevenue/1000).toFixed(0)}k`} delta="this period" deltaKind="info" />
      </View>

      {/* Tabs + search */}
      <Card>
        <View style={st.browseHead}>
          <TopTabs<Tab> tabs={tabs as any} active={tab} onChange={setTab} />
          <SearchField value={q} onChange={setQ} placeholder="Search events, cities…" width={280} />
        </View>
      </Card>

      {/* Grid */}
      {list.length === 0 ? (
        <EmptyState
          icon={CalIcon}
          title="No events found"
          sub={q ? 'No results match your search.' : 'No events in this state yet.'}
        />
      ) : (
        <View style={st.grid}>
          {list.map((e) => {
            const pct = Math.min(100, Math.round((e.attending / Math.max(e.capacity, 1)) * 100));
            return (
              <View key={e.id} style={[st.card, { width: `${100 / cols - 1}%` as any, minWidth: 300 }]}>
                <LinearGradient
                  colors={[e.accent + '33', e.accent + '11']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[st.cover, { borderColor: e.accent + '44' }]}
                >
                  <CalIcon size={30} color={e.accent} />
                </LinearGradient>
                <View style={{ padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <StatusPill kind="info" label={(e.cat || 'EVENT').toUpperCase()} />
                    {e.status === 'pending'
                      ? <StatusPill kind="warn" label="PENDING" />
                      : e.kind === 'free'
                        ? <StatusPill kind="success" label="FREE" dot />
                        : <StatusPill kind="info" label={`₹${e.price?.toLocaleString('en-IN')}`} />
                    }
                  </View>
                  <Text numberOfLines={2} style={st.cTitle}>{e.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <CalIcon size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.date}</Text>
                    <Text style={st.dot}>·</Text>
                    <MapPin size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.city}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UsersIcon size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.attending}/{e.capacity} attending · {pct}%</Text>
                  </View>
                  <View style={st.barTrack}>
                    <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.barFill, { width: `${pct}%` as any }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {e.status === 'pending'
                      ? <GradientButton onPress={() => {}}><Text style={st.btnText}>Review & approve</Text></GradientButton>
                      : <SecondaryButton onPress={() => {}}><Text style={st.secText}>Manage event</Text></SecondaryButton>
                    }
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' as any, gap: 14 } as any) : {}),
  },
  card: {
    backgroundColor: '#1A0F05', borderColor: 'rgba(251,146,60,0.18)', borderWidth: 1, borderRadius: 16, overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 6px 24px rgba(0,0,0,0.45)' } as any) : {}),
  },
  cover: { height: 96, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14.5, lineHeight: 18 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dot: { color: SAC.dim, fontSize: 11 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 3 },
});
