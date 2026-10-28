/**
 * AnalyticsView — College Phase 3 Analytics.
 * KPIs · placement trend · salary distribution · sectors · top recruiters
 * · dept placement · hiring funnel · attrition.
 */
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CC, FONTS } from '../tokens';
import { KpiCard } from '../atoms';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TrendingUp, Users, Trophy, BarChart3 } from 'lucide-react-native';
import { usePortalData } from '@/src/lib/portalApi';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgLG, Stop, Text as SvgText, G } from 'react-native-svg';

type Trend     = { year: number; rate: number; median_lpa: number };
type Sector    = { name: string; count: number; pct: number; color: string };
type Attrition = { label: string; pct: number; color: string };
type Salary    = { band: string; count: number; pct: number; color: string };
type Recruiter = { name: string; hires: number; logo: string };
type DeptPlace = { dept: string; total: number; placed: number;
                    rate: number; color: string };
type FunnelStep= { stage: string; count: number; pct: number; color: string };

type Resp = {
  kpi: { students: number; placement: string; median_lpa: string;
          top_offer: string; median_yoy: string };
  placement_trend: Trend[];
  salary_dist:     Salary[];
  sectors:         Sector[];
  attrition:       Attrition[];
  top_recruiters:  Recruiter[];
  dept_placement:  DeptPlace[];
  funnel:          FunnelStep[];
};

const FALLBACK: Resp = {
  kpi: { students: 0, placement: '0%', median_lpa: '₹0', top_offer: '₹0', median_yoy: '↑ 0%' },
  placement_trend: [], salary_dist: [], sectors: [],
  attrition: [], top_recruiters: [], dept_placement: [], funnel: [],
};

export function AnalyticsView() {
  const { data } = usePortalData<Resp>('/college/analytics', FALLBACK, 60_000);
  const { width } = useWindowDimensions();
  const isWide = width > 900;
  const TREND = data?.placement_trend || [];
  
  const [chartWidth, setChartWidth] = React.useState(width - 316);

  const W = chartWidth;
  const H = 180;
  const padX = 50;
  const padYTop = 35;
  const padYBot = 45;

  const stepX = (W - padX * 2) / Math.max(TREND.length - 1, 1);
  const points = TREND.map((t, i) => {
    const x = padX + i * stepX;
    // Scale rate from 0% to 100%
    const y = H - padYBot - (t.rate / 100) * (H - padYTop - padYBot);
    return { x, y, ...t };
  });

  // Smooth curve via cubic Bezier
  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');

  const fillPath = points.length > 0
    ? `${path} L${points[points.length - 1].x},${H - padYBot} L${points[0].x},${H - padYBot} Z`
    : '';

  const gridLines = [0.25, 0.50, 0.75].map((pct) => H - padYBot - pct * (H - padYTop - padYBot));

  return (
    <View style={{ gap: 16 }}>
      {/* KPI Row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <KpiCard Icon={TrendingUp} label="Avg Salary"
                  value={data?.kpi.median_lpa || '—'}
                  delta={(data?.kpi.median_yoy || '') + ' YoY'} color="green" />
        <KpiCard Icon={Users} label="Highest Offer"
                  value={data?.kpi.top_offer || '—'}
                  delta="Single biggest" color="purple" />
        <KpiCard Icon={Trophy} label="Placement Rate"
                  value={data?.kpi.placement || '—'}
                  delta="↑ 4% YoY" color="amber" />
        <KpiCard Icon={BarChart3} label="Total Students"
                  value={String(data?.kpi.students || 0)}
                  delta="active roster" color="blue" />
      </View>

      {/* Placement trend */}
      <View style={s.card}>
        <Text style={s.cardLabel}>📈 PLACEMENT TREND (5Y)</Text>
        {TREND.length === 0 ? (
          <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: CC.dim, fontFamily: FONTS.med, fontSize: 13 }}>
              No placement data available
            </Text>
          </View>
        ) : (
          <View
            style={{ width: '100%', height: H, position: 'relative' }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w && w !== chartWidth) setChartWidth(w);
            }}
          >
            {Platform.OS === 'web' ? (
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                {/* Horizontal gridlines at 25%, 50%, 75% */}
                {gridLines.map((y, idx) => (
                  <line
                    key={idx}
                    x1={padX}
                    y1={y}
                    x2={W - padX}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Baseline */}
                <line x1={padX} y1={H - padYBot} x2={W - padX} y2={H - padYBot}
                      stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1.5} />

                {/* Filled area */}
                {fillPath ? <path d={fillPath} fill="url(#trendGrad)" /> : null}

                {/* Line */}
                {path ? <path d={path} stroke="#3B82F6" strokeWidth={3} fill="none" strokeLinecap="round" /> : null}

                {/* Data points */}
                {points.map((p) => (
                  <g key={p.year}>
                    {/* Outer glow ring for latest year */}
                    {p.year === 2026 && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={9}
                        fill="#60A5FA"
                        opacity={0.3}
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.year === 2026 ? 5.5 : 4}
                      fill={p.year === 2026 ? "#60A5FA" : "#3B82F6"}
                      stroke={CC.card}
                      strokeWidth={2}
                    />

                    {/* Rate text above dot */}
                    <text
                      x={p.x}
                      y={p.y - 12}
                      fontSize="11.5"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily={FONTS.bold}
                    >
                      {p.rate}%
                    </text>

                    {/* Year text below baseline */}
                    <text
                      x={p.x}
                      y={H - 24}
                      fontSize="11.5"
                      fill={CC.muted}
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily={FONTS.bold}
                    >
                      {p.year}
                    </text>

                    {/* Median LPA below Year */}
                    <text
                      x={p.x}
                      y={H - 8}
                      fontSize="10"
                      fill={CC.dim}
                      textAnchor="middle"
                      fontFamily={FONTS.med}
                    >
                      ₹{p.median_lpa}L
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                <Defs>
                  <SvgLG id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#3B82F6" stopOpacity="0.0" />
                  </SvgLG>
                </Defs>

                {/* Horizontal gridlines at 25%, 50%, 75% */}
                {gridLines.map((y, idx) => (
                  <Line
                    key={idx}
                    x1={padX}
                    y1={y}
                    x2={W - padX}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Baseline */}
                <Line x1={padX} y1={H - padYBot} x2={W - padX} y2={H - padYBot}
                      stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

                {/* Filled area */}
                <Path d={fillPath} fill="url(#trendGrad)" />

                {/* Line */}
                <Path d={path} stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" />

                {/* Data points */}
                {points.map((p) => (
                  <G key={p.year}>
                    {/* Outer glow ring for latest year */}
                    {p.year === 2026 && (
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r="9"
                        fill="#60A5FA"
                        opacity="0.3"
                      />
                    )}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={p.year === 2026 ? 5.5 : 4}
                      fill={p.year === 2026 ? "#60A5FA" : "#3B82F6"}
                      stroke={CC.card}
                      strokeWidth={2}
                    />

                    {/* Rate text above dot */}
                    <SvgText
                      x={p.x}
                      y={p.y - 12}
                      fontSize="11.5"
                      fill="#FFFFFF"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily={FONTS.bold}
                    >
                      {p.rate}%
                    </SvgText>

                    {/* Year text below baseline */}
                    <SvgText
                      x={p.x}
                      y={H - 24}
                      fontSize="11.5"
                      fill={CC.muted}
                      textAnchor="middle"
                      fontWeight="bold"
                      fontFamily={FONTS.bold}
                    >
                      {p.year}
                    </SvgText>

                    {/* Median LPA below Year */}
                    <SvgText
                      x={p.x}
                      y={H - 8}
                      fontSize="10"
                      fill={CC.dim}
                      textAnchor="middle"
                      fontFamily={FONTS.med}
                    >
                      ₹{p.median_lpa}L
                    </SvgText>
                  </G>
                ))}
              </Svg>
            )}
          </View>
        )}
      </View>

      {/* Hiring funnel + Salary distribution */}
      <View style={[s.gridRow, isWide ? null : { flexDirection: 'column' }]}>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>🎯 HIRING FUNNEL</Text>
          <View style={{ gap: 8 }}>
            {(data?.funnel || []).map((f, i) => (
              <View key={f.stage} style={{ gap: 5 }}>
                <View style={s.funnelHead}>
                  <Text style={s.funnelStage}>{f.stage}</Text>
                  <Text style={s.funnelCount}>
                    {f.count.toLocaleString('en-IN')} ({f.pct}%)
                  </Text>
                </View>
                <View style={s.funnelBarTrack}>
                  <View style={[s.funnelBar, {
                    width: `${f.pct}%`, backgroundColor: f.color,
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>💰 SALARY DISTRIBUTION</Text>
          <View style={{ gap: 8 }}>
            {(data?.salary_dist || []).map((b) => (
              <View key={b.band} style={s.row}>
                <Text style={s.rowLabel}>{b.band}</Text>
                <View style={s.salTrack}>
                  <View style={[s.salFill, {
                    width: `${Math.min(100, b.pct)}%`,
                    backgroundColor: b.color,
                  }]} />
                </View>
                <Text style={s.salPct}>{b.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Top recruiters + Dept placement */}
      <View style={[s.gridRow, isWide ? null : { flexDirection: 'column' }]}>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>🏢 TOP RECRUITERS</Text>
          <View style={{ gap: 6 }}>
            {(data?.top_recruiters || []).slice(0, 8).map((r, i) => (
              <View key={r.name} style={s.recRow}>
                <View style={s.recRank}>
                  <Text style={s.recRankText}>{i + 1}</Text>
                </View>
                <View style={s.recLogo}>
                  <Text style={s.recLogoText}>{r.logo}</Text>
                </View>
                <Text style={s.recName} numberOfLines={1}>{r.name}</Text>
                <View style={{ flex: 1 }} />
                <View style={s.hirePill}>
                  <Text style={s.hirePillText}>{r.hires} hires</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>🎓 DEPT-WISE PLACEMENT</Text>
          <View style={{ gap: 8 }}>
            {(data?.dept_placement || []).map((d) => (
              <View key={d.dept} style={{ gap: 4 }}>
                <View style={s.deptHead}>
                  <View style={[s.deptDot, { backgroundColor: d.color }]} />
                  <Text style={s.deptName}>{d.dept}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.deptStats}>
                    {d.placed}/{d.total} · {d.rate}%
                  </Text>
                </View>
                <View style={s.deptTrack}>
                  <View style={[s.deptFill, {
                    width: `${d.rate}%`, backgroundColor: d.color,
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Sectors + Attrition */}
      <View style={[s.gridRow, isWide ? null : { flexDirection: 'column' }]}>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>🌐 SECTOR BREAKDOWN</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(data?.sectors || []).map((sec) => (
              <View key={sec.name} style={[s.sectorChip,
                { borderColor: sec.color + '55',
                  backgroundColor: sec.color + '14' }]}>
                <View style={[s.sectorDot, { backgroundColor: sec.color }]} />
                <Text style={[s.sectorName, { color: sec.color }]}>
                  {sec.name}
                </Text>
                <Text style={s.sectorPct}>{sec.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardLabel}>📊 ROSTER HEALTH</Text>
          <View style={{ gap: 8 }}>
            {(data?.attrition || []).map((a) => (
              <View key={a.label} style={s.row}>
                <View style={[s.attDot, { backgroundColor: a.color }]} />
                <Text style={s.attLabel}>{a.label}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[s.attPct, { color: a.color }]}>{a.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, gap: 12,
    backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1 },
  cardLabel: { color: CC.muted, fontFamily: FONTS.xbold,
    fontSize: 11, letterSpacing: 1 },
  gridRow: { flexDirection: 'row', gap: 12 },

  /* Bars */
  barRow: { flexDirection: 'row', height: 160, alignItems: 'flex-end', gap: 8 },
  barCol: { width: '70%', height: '100%', justifyContent: 'flex-end',
    borderRadius: 6, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)' },
  bar: { width: '100%', borderRadius: 6 },
  barVal: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 12 },
  barLabel: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  barSub: { color: CC.dim, fontFamily: FONTS.med, fontSize: 10 },

  /* Funnel */
  funnelHead: { flexDirection: 'row', alignItems: 'center' },
  funnelStage: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  funnelCount: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  funnelBarTrack: { height: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  funnelBar: { height: '100%', borderRadius: 999 },

  /* Salary */
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11.5, width: 110 },
  salTrack: { flex: 1, height: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  salFill: { height: '100%', borderRadius: 999 },
  salPct: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 36, textAlign: 'right' },

  /* Recruiters */
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6 },
  recRank: { width: 24, alignItems: 'center' },
  recRankText: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 12 },
  recLogo: { width: 32, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.18)',
    alignItems: 'center', justifyContent: 'center' },
  recLogoText: { color: '#93C5FD', fontFamily: FONTS.xbold, fontSize: 14 },
  recName: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12.5, flexShrink: 1 },
  hirePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 },
  hirePillText: { color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 10.5 },

  /* Dept */
  deptHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deptDot: { width: 10, height: 10, borderRadius: 999 },
  deptName: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12.5 },
  deptStats: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  deptTrack: { height: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  deptFill: { height: '100%', borderRadius: 999 },

  /* Sector */
  sectorChip: { flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1 },
  sectorDot: { width: 8, height: 8, borderRadius: 999 },
  sectorName: { fontFamily: FONTS.xbold, fontSize: 11 },
  sectorPct: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  /* Attrition */
  attDot: { width: 10, height: 10, borderRadius: 999 },
  attLabel: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12.5 },
  attPct: { fontFamily: FONTS.xbold, fontSize: 13 },
});
