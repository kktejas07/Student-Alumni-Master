// @ts-nocheck
/**
 * Super Admin — Contact Analytics
 *
 * Aggregates the public contact-form inquiries (contact_inquiries) for the
 * last 30 days: daily submissions, topic mix, top organizations, and AXISS
 * product-interest distribution. Backed by GET /admin/contact/analytics.
 *
 * Charts are hand-rolled inline SVG (recharts is not a dependency).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Circle, Line, Polyline, Path, Text as SvgText } from 'react-native-svg';
import {
  BarChart3, Users, RefreshCw, Inbox, Boxes,
} from 'lucide-react-native';
import { useSAC, FONTS } from '../tokens';
import { Card, StatusPill, LoadingBox } from '../applekit';
import { request } from '@/src/models/services/api';

type TopicSlice = { topic: string; label: string; count: number };
type OrgRow = { organization: string; count: number };
type ProdRow = { product: string; label: string; count: number };
type ContactAnalytics = {
  window_days: number;
  total_30d: number;
  daily: { date: string; count: number }[];
  by_topic: TopicSlice[];
  top_orgs: OrgRow[];
  product_distribution: ProdRow[];
};

const EMPTY: ContactAnalytics = {
  window_days: 30, total_30d: 0, daily: [], by_topic: [], top_orgs: [], product_distribution: [],
};

const PALETTE = ['#5B4FE9', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

export function ContactAnalyticsView() {
  const T = useSAC();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<ContactAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request<ContactAnalytics>('/admin/contact/analytics');
      setData(res || EMPTY);
    } catch (e: any) {
      setError(e?.message || 'Could not load contact analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <LoadingBox />;
  const d = data || EMPTY;

  const topTopic = d.by_topic[0];
  const prodTotal = d.product_distribution.reduce((s, p) => s + p.count, 0);
  const topOrg = d.top_orgs[0];

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(91,79,233,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Inbox size={18} color="#8B84FF" />
          </View>
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: T.text }}>Contact Analytics</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: T.muted }}>
              Public form inquiries · last {d.window_days} days
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {loading ? <ActivityIndicator size="small" color={T.muted} /> : null}
          <StatusPill kind={d.total_30d > 0 ? 'success' : 'neutral'} label={d.total_30d > 0 ? 'Active' : 'No inquiries'} />
          <Pressable onPress={load} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={14} color={T.muted} />
          </Pressable>
        </View>
      </Card>

      {error ? (
        <Card style={{ padding: 16, gap: 6 }}>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: '#EF4444' }}>{error}</Text>
        </Card>
      ) : null}

      {/* KPI strip */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiMini Icon={Inbox} label="Inquiries (30d)" value={String(d.total_30d)} accent="#5B4FE9" />
        <KpiMini Icon={BarChart3} label="Top topic" value={topTopic ? topTopic.label : '—'} sub={topTopic ? String(topTopic.count) : undefined} accent="#7C3AED" />
        <KpiMini Icon={Users} label="Top organization" value={topOrg ? topOrg.organization : '—'} sub={topOrg ? `${topOrg.count} inquiries` : undefined} accent="#06B6D4" />
        <KpiMini Icon={Boxes} label="Product interests" value={String(prodTotal)} sub={`${d.product_distribution.length} products`} accent="#10B981" />
      </View>

      <DailyChart daily={d.daily} />

      <View style={{ flexDirection: width < 1100 ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 2 }}><TopicPie topics={d.by_topic} /></View>
        <View style={{ flex: 3 }}><ProductBars products={d.product_distribution} /></View>
      </View>

      <TopOrgsTable orgs={d.top_orgs} />
    </View>
  );
}

function KpiMini({ Icon, label, value, sub, accent }: any) {
  const T = useSAC();
  return (
    <View style={{ flex: 1, minWidth: 150, padding: 14, borderRadius: 12, backgroundColor: T.card, borderWidth: 1, borderColor: T.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={accent} />
        </View>
        <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: T.text, marginTop: 8, flexShrink: 1 }} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: T.dim }}>{sub}</Text> : null}
    </View>
  );
}

function DailyChart({ daily }: { daily: { date: string; count: number }[] }) {
  const T = useSAC();
  const W = 720, H = 140, pad = 28;
  const max = Math.max(...daily.map((p) => p.count), 1);
  const n = Math.max(daily.length, 1);
  const step = daily.length > 1 ? (W - pad * 2) / (n - 1) : 0;
  const pts = daily.map((p, i) => {
    const x = pad + i * step;
    const y = H - pad - (p.count / max) * (H - pad * 2);
    return [x, y];
  });
  const poly = pts.map((p) => `${p[0]},${p[1]}`).join(' ');
  const area = `${pad},${H - pad} ${poly} ${W - pad},${H - pad}`;
  const grid = [0.25, 0.5, 0.75, 1].map((f) => H - pad - f * (H - pad * 2));

  return (
    <Card style={{ padding: 20, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: T.text }}>Daily Submissions</Text>
        <StatusPill kind="neutral" label={`${daily.length}d`} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {grid.map((y, i) => (
            <Line key={`g${i}`} x1={pad} y1={y} x2={W - pad} y2={y} stroke={T.line} strokeWidth={1} strokeDasharray="3 4" />
          ))}
          {daily.length ? (
            <>
              <Path d={`M ${area} Z`} fill="rgba(91,79,233,0.14)" />
              <Polyline points={poly} fill="none" stroke="#5B4FE9" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => p[1] < H - 2 ? (
                <Circle key={`c${i}`} cx={p[0]} cy={p[1]} r={2.4} fill="#8B84FF" />
              ) : null)}
            </>
          ) : (
            <SvgText x={W / 2} y={H / 2} textAnchor="middle" fill={T.dim} fontSize={12}>No submissions yet</SvgText>
          )}
        </Svg>
      </ScrollView>
    </Card>
  );
}

function ringPath(a0: number, a1: number, cx: number, cy: number, r: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x0 = cx + r * Math.cos(toRad(a0 - 90));
  const y0 = cy + r * Math.sin(toRad(a0 - 90));
  const x1 = cx + r * Math.cos(toRad(a1 - 90));
  const y1 = cy + r * Math.sin(toRad(a1 - 90));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

function TopicPie({ topics }: { topics: TopicSlice[] }) {
  const T = useSAC();
  const size = 200, r = 78, cx = size / 2, cy = size / 2, thickness = 26;
  const total = topics.reduce((s, t) => s + t.count, 0);

  let acc = 0;
  const arcs = topics.map((t, i) => {
    const start = (acc / Math.max(total, 1)) * 360;
    acc += t.count;
    const end = (acc / Math.max(total, 1)) * 360;
    return { ...t, start, end, color: PALETTE[i % PALETTE.length] };
  });

  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: T.text }}>By Topic</Text>
      {total === 0 ? (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim }}>No topic data yet</Text>
      ) : (
        <>
          <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {arcs.map((a, i) =>
                a.end - a.start >= 359.99 ? (
                  <Circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={thickness} />
                ) : (
                  <Path key={i} d={ringPath(a.start, a.end, cx, cy, r)} stroke={a.color} strokeWidth={thickness} fill="none" />
                )
              )}
              <SvgText x={cx} y={cy} textAnchor="middle" fill={T.text} fontSize={22} fontWeight={700}>{total}</SvgText>
              <SvgText x={cx} y={cy + 18} textAnchor="middle" fill={T.dim} fontSize={10}>inquiries</SvgText>
            </Svg>
          </View>
          <View style={{ gap: 6 }}>
            {arcs.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: a.color }} />
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: T.muted, flex: 1 }} numberOfLines={1}>{a.label}</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: a.color }}>{a.count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

function ProductBars({ products }: { products: ProdRow[] }) {
  const T = useSAC();
  const max = Math.max(...products.map((p) => p.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: T.text }}>Product Interest</Text>
      {products.length === 0 ? (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim }}>No product-interest data yet</Text>
      ) : (
        products.map((p, i) => (
          <View key={i} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.text }} numberOfLines={1}>{p.label}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#10B981' }}>{p.count}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${(p.count / max) * 100}%`, borderRadius: 4, backgroundColor: PALETTE[i % PALETTE.length] }} />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function TopOrgsTable({ orgs }: { orgs: OrgRow[] }) {
  const T = useSAC();
  return (
    <Card style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: T.text }}>Top Organizations</Text>
      {orgs.length === 0 ? (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.dim }}>No organization data yet</Text>
      ) : (
        <ScrollView>
          {orgs.slice(0, 5).map((o, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.line }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: T.dim, width: 20 }}>{i + 1}</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: T.text, flex: 1 }} numberOfLines={1}>{o.organization}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#8B84FF' }}>{o.count}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );
}
