import React from 'react';
import { View, Text, useWindowDimensions, Platform } from 'react-native';
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
    const y = H - padYBot - (t.rate / 100) * (H - padYTop - padYBot);
    return { x, y, ...t };
  });

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
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-3">
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

      <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3">
        <Text className="text-muted font-display-bold text-[11px] tracking-widest">📈 PLACEMENT TREND (5Y)</Text>
        {TREND.length === 0 ? (
          <View className="h-[180px] justify-center items-center">
            <Text className="text-dim font-body text-[13px]">
              No placement data available
            </Text>
          </View>
        ) : (
          <View
            className="w-full relative"
            style={{ height: H }}
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

                <line x1={padX} y1={H - padYBot} x2={W - padX} y2={H - padYBot}
                      stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1.5} />

                {fillPath ? <path d={fillPath} fill="url(#trendGrad)" /> : null}

                {path ? <path d={path} stroke="#3B82F6" strokeWidth={3} fill="none" strokeLinecap="round" /> : null}

                {points.map((p) => (
                  <g key={p.year}>
                    {p.year === 2026 && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={9}
                        fill="#A78BFA"
                        opacity={0.3}
                      />
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.year === 2026 ? 5.5 : 4}
                      fill={p.year === 2026 ? "#A78BFA" : "#3B82F6"}
                      stroke={CC.card}
                      strokeWidth={2}
                    />

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

                <Line x1={padX} y1={H - padYBot} x2={W - padX} y2={H - padYBot}
                      stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

                <Path d={fillPath} fill="url(#trendGrad)" />

                <Path d={path} stroke="#3B82F6" strokeWidth="3" fill="none" strokeLinecap="round" />

                {points.map((p) => (
                  <G key={p.year}>
                    {p.year === 2026 && (
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r="9"
                        fill="#A78BFA"
                        opacity="0.3"
                      />
                    )}
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={p.year === 2026 ? 5.5 : 4}
                      fill={p.year === 2026 ? "#A78BFA" : "#3B82F6"}
                      stroke={CC.card}
                      strokeWidth={2}
                    />

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

      <View className={`flex-row gap-3 ${isWide ? '' : 'flex-col'}`}>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">🎯 HIRING FUNNEL</Text>
          <View className="gap-2">
            {(data?.funnel || []).map((f, i) => (
              <View key={f.stage} className="gap-[5px]">
                <View className="flex-row items-center">
                  <Text className="text-text font-body-bold text-[12.5px] flex-1">{f.stage}</Text>
                  <Text className="text-muted font-body-bold text-[11.5px]">
                    {f.count.toLocaleString('en-IN')} ({f.pct}%)
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">💰 SALARY DISTRIBUTION</Text>
          <View className="gap-2">
            {(data?.salary_dist || []).map((b) => (
              <View key={b.band} className="flex-row items-center gap-2">
                <Text className="text-text font-body-bold text-[11.5px] w-[110px]">{b.band}</Text>
                <View className="flex-1 h-[7px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${Math.min(100, b.pct)}%`, backgroundColor: b.color }} />
                </View>
                <Text className="text-muted font-body-bold text-[11.5px] w-[36px] text-right">{b.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={`flex-row gap-3 ${isWide ? '' : 'flex-col'}`}>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">🏢 TOP RECRUITERS</Text>
          <View className="gap-[6px]">
            {(data?.top_recruiters || []).slice(0, 8).map((r, i) => (
              <View key={r.name} className="flex-row items-center gap-[10px] py-[6px]">
                <View className="w-6 items-center">
                  <Text className="text-muted font-display-bold text-[12px]">{i + 1}</Text>
                </View>
                <View className="w-8 h-8 rounded-full bg-[rgba(167,139,250,0.18)] items-center justify-center">
                  <Text className="text-[#C4B5FD] font-display-bold text-[14px]">{r.logo}</Text>
                </View>
                <Text className="text-text font-body-bold text-[12.5px] flex-shrink-1" numberOfLines={1}>{r.name}</Text>
                <View className="flex-1" />
                <View className="px-2 py-1 rounded-full bg-[rgba(16,185,129,0.14)] border border-[rgba(16,185,129,0.40)]">
                  <Text className="text-[#86EFAC] font-display-bold text-[10.5px]">{r.hires} hires</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">🎓 DEPT-WISE PLACEMENT</Text>
          <View className="gap-2">
            {(data?.dept_placement || []).map((d) => (
              <View key={d.dept} className="gap-1">
                <View className="flex-row items-center gap-[6px]">
                  <View className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: d.color }} />
                  <Text className="text-text font-body-bold text-[12.5px]">{d.dept}</Text>
                  <View className="flex-1" />
                  <Text className="text-muted font-body-bold text-[11px]">
                    {d.placed}/{d.total} · {d.rate}%
                  </Text>
                </View>
                <View className="h-[7px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${d.rate}%`, backgroundColor: d.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={`flex-row gap-3 ${isWide ? '' : 'flex-col'}`}>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">🌐 SECTOR BREAKDOWN</Text>
          <View className="flex-row flex-wrap gap-2">
            {(data?.sectors || []).map((sec) => (
              <View key={sec.name} className="flex-row items-center gap-[7px] px-[10px] py-[6px] rounded-full border"
                style={{ borderColor: sec.color + '55', backgroundColor: sec.color + '14' }}>
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: sec.color }} />
                <Text className="font-display-bold text-[11px]" style={{ color: sec.color }}>
                  {sec.name}
                </Text>
                <Text className="text-muted font-body-bold text-[11px]">{sec.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-4 gap-3 flex-1">
          <Text className="text-muted font-display-bold text-[11px] tracking-widest">📊 ROSTER HEALTH</Text>
          <View className="gap-2">
            {(data?.attrition || []).map((a) => (
              <View key={a.label} className="flex-row items-center gap-2">
                <View className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: a.color }} />
                <Text className="text-text font-body-bold text-[12.5px]">{a.label}</Text>
                <View className="flex-1" />
                <Text className="font-display-bold text-[13px]" style={{ color: a.color }}>{a.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
