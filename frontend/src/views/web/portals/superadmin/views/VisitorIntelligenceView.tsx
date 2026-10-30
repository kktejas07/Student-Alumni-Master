// @ts-nocheck
/**
 * Super Admin — Visitor Intelligence & Modular Telemetry Dashboard
 *
 * Real-time monitoring of all visitors (including unregistered guest visitors).
 * Gathers:
 *  - IP Address & Geolocation (Country, City, Region, ISP, Lat/Long)
 *  - Hardware & Device Fingerprint (GPU Renderer, CPU cores, RAM, Screen res)
 *  - OS, Browser, Device Type (Desktop/Mobile/Tablet)
 *  - Inferred Identity / Lead Capture (Name, Email, Phone if provided in forms)
 *  - Modular platform telemetry (Welcome, Auth, Courses, Events, Deals, Portals, Mentorship)
 *  - Chronological Journey Breadcrumbs & Click Stream
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Circle, Text as SvgText, Polyline, Polygon, Rect, Line } from 'react-native-svg';
import {
  Radar, Users, Globe, Monitor, Smartphone, Laptop, Cpu, HardDrive,
  Sparkles, Eye, Clock, Download, RefreshCw, Search, Filter, ShieldCheck,
  UserX, UserCheck, ExternalLink, ChevronRight, Activity, Zap, Compass,
  Layers, MapPin, Hash, MousePointer, X, CheckCircle2, Server, HelpCircle,
  Radio, Bell, TriangleAlert, Info, ArrowDown, ArrowRight, CircleDot,
} from 'lucide-react-native';

import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Card, GRAD, SecondaryButton, GradientButton, StatusPill, TopTabs } from '../applekit';
import { getBaseUrl } from '@/src/lib/env';
import { request, tokenStore } from '@/src/models/services/api';

const BASE_URL = getBaseUrl();

type TabId = 'live' | 'heatmap' | 'modules' | 'hardware' | 'geo' | 'acquisition' | 'funnel';

export function VisitorIntelligenceView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width < 1100;

  const [activeTab, setActiveTab] = useState<TabId>('live');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Live Visitors Data
  const [liveData, setLiveData] = useState<any>(null);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  
  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'idle'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'guest' | 'registered'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modular Analytics & Heatmap Data
  const [modularData, setModularData] = useState<any[]>([]);
  const [hardwareData, setHardwareData] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [heatmapModule, setHeatmapModule] = useState<string>('all');
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Broadcast Center State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [bTitle, setBTitle] = useState('HackWave 3.0 Registration Announcement');
  const [bMsg, setBMsg] = useState('₹17,50,000+ Total Prize Pool Live! WeHive 2 Business Visas & Germany Study Abroad Sponsorship active.');
  const [bUrgency, setBUrgency] = useState<'info' | 'urgent' | 'winner'>('urgent');
  const [bBusy, setBBusy] = useState(false);

  const handlePushBroadcast = async () => {
    if (!bTitle.trim() || !bMsg.trim()) return;
    setBBusy(true);
    try {
      await request('/admin/broadcast/push', {
        method: 'POST',
        body: {
          title: bTitle.trim(),
          message: bMsg.trim(),
          urgency: bUrgency,
          target_module: moduleFilter || 'all'
        }
      });
      setBroadcastModalOpen(false);
    } catch (e: any) {
      console.warn('Failed to push broadcast', e);
    } finally {
      setBBusy(false);
    }
  };

  // Selected Visitor for Dossier Modal
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // VR2 — geographic dot-map
  const [geoSummary, setGeoSummary] = useState<any>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // VR3 — acquisition & UTM
  const [acqData, setAcqData] = useState<any>(null);
  const [acqLoading, setAcqLoading] = useState(false);

  // VR4 — funnel
  const [funnelData, setFunnelData] = useState<any>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  // VR6 — day x hour traffic heatmap
  const [trafficHeat, setTrafficHeat] = useState<any>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  // VR7 — real-time radar socket
  const [wsConnected, setWsConnected] = useState(false);
  const [wsViewers, setWsViewers] = useState<number | null>(null);

  // VR8 — anomaly alerts
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // ── Fetch Click Heatmap Analytics ─────────────────────────────────────────
  const fetchHeatmapAnalytics = useCallback(async (moduleName = 'all') => {
    setHeatmapLoading(true);
    try {
      const res = await request<any>(`/admin/analytics/heatmap?module=${moduleName}&days=30`);
      if (res && res.hotspots) {
        setHeatmapData(res);
      }
    } catch (e) {
      console.warn('Failed to fetch click heatmap analytics', e);
    } finally {
      setHeatmapLoading(false);
    }
  }, []);

  // ── Fetch Live Radar Summary ───────────────────────────────────────────────
  const fetchLiveRadar = useCallback(async () => {
    try {
      const res = await request<any>('/admin/analytics/visitors/live');
      if (res && res.summary) {
        setLiveData(res);
      }
    } catch (e) {
      console.warn('Failed to fetch live visitor radar', e);
    }
  }, []);

  // ── Fetch Visitors List (Paginated & Filtered) ──────────────────────────────
  const fetchVisitorsList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
        visitor_type: typeFilter,
        module: moduleFilter,
      });
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      const res = await request<any>(`/admin/analytics/visitors?${params.toString()}`);
      if (res && res.items) {
        setVisitorsList(res.items);
        setPagination({ page: res.page, total: res.total, total_pages: res.total_pages });
      }
    } catch (e) {
      console.warn('Failed to fetch visitors list', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, moduleFilter, searchQuery]);

  // ── Fetch Modular Analytics ───────────────────────────────────────────────
  const fetchModularAnalytics = useCallback(async () => {
    try {
      const res = await request<any>('/admin/analytics/modules?days=30');
      if (res && res.modules) {
        setModularData(res.modules);
      }
    } catch (e) {
      console.warn('Failed to fetch modular analytics', e);
    }
  }, []);

  // ── Fetch Hardware Analytics ──────────────────────────────────────────────
  const fetchHardwareAnalytics = useCallback(async () => {
    try {
      const res = await request<any>('/admin/analytics/hardware?days=60');
      if (res) {
        setHardwareData(res);
      }
    } catch (e) {
      console.warn('Failed to fetch hardware analytics', e);
    }
  }, []);

  // ── Fetch Visitor Dossier ─────────────────────────────────────────────────
  const openDossier = async (sessionIdOrVisitorId: string) => {
    setSelectedVisitorId(sessionIdOrVisitorId);
    setDossierLoading(true);
    try {
      const res = await request<any>(`/admin/analytics/visitors/${sessionIdOrVisitorId}`);
      if (res && res.session) {
        setDossier(res);
      }
    } catch (e) {
      console.warn('Failed to fetch visitor dossier', e);
    } finally {
      setDossierLoading(false);
    }
  };

  // ── Fetch Geographic Summary (VR2) ────────────────────────────────────────
  const fetchGeoSummary = useCallback(async () => {
    setGeoLoading(true);
    try {
      const res = await request<any>('/admin/analytics/geo-summary?days=30');
      if (res) setGeoSummary(res);
    } catch (e) {
      console.warn('Failed to fetch geographic summary', e);
    } finally {
      setGeoLoading(false);
    }
  }, []);

  // ── Fetch Acquisition / UTM (VR3) ─────────────────────────────────────────
  const fetchAcquisition = useCallback(async () => {
    setAcqLoading(true);
    try {
      const res = await request<any>('/admin/analytics/acquisition?days=30');
      if (res) setAcqData(res);
    } catch (e) {
      console.warn('Failed to fetch acquisition analytics', e);
    } finally {
      setAcqLoading(false);
    }
  }, []);

  // ── Fetch Funnel (VR4) ────────────────────────────────────────────────────
  const fetchFunnel = useCallback(async () => {
    setFunnelLoading(true);
    try {
      const res = await request<any>('/admin/analytics/funnel?days=30');
      if (res) setFunnelData(res);
    } catch (e) {
      console.warn('Failed to fetch funnel analytics', e);
    } finally {
      setFunnelLoading(false);
    }
  }, []);

  // ── Fetch Day x Hour Traffic Heatmap (VR6) ────────────────────────────────
  const fetchTrafficHeatmap = useCallback(async () => {
    setTrafficLoading(true);
    try {
      const res = await request<any>('/admin/analytics/traffic-heatmap?days=30');
      if (res) setTrafficHeat(res);
    } catch (e) {
      console.warn('Failed to fetch traffic heatmap', e);
    } finally {
      setTrafficLoading(false);
    }
  }, []);

  // ── Fetch Anomaly Alerts (VR8) ───────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await request<any>('/admin/analytics/visitor-alerts?hours=24');
      if (res && Array.isArray(res.alerts)) {
        const act = res.alerts.filter((a: any) => !a.dismissed);
        setAlerts(act);
        setAlertCount(act.length);
      }
    } catch (e) {
      console.warn('Failed to fetch visitor alerts', e);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  const dismissAlert = async (alertId: string) => {
    try {
      await request('/admin/analytics/visitor-alerts/dismiss', {
        method: 'POST',
        body: { alert_id: alertId },
      });
      setAlerts((prev: any[]) => prev.filter((a: any) => a.id !== alertId));
      setAlertCount((prev: number) => Math.max(0, prev - 1));
    } catch (e) {
      console.warn('Failed to dismiss alert', e);
    }
  };

  // ── Real-time Radar WebSocket (VR7) ───────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let socket: WebSocket | null = null;
    let closed = false;
    let reconnect: any = null;

    const buildUrl = async () => {
      const tok = await tokenStore.getAccess();
      const base = BASE_URL || `${window.location.protocol}//${window.location.host}`;
      const wsBase = base.replace(/^http/, 'ws').replace(/^https/, 'wss');
      return `${wsBase}/api/ws/visitor-radar?token=${encodeURIComponent(tok || '')}`;
    };

    const connect = async () => {
      if (closed) return;
      try {
        const url = await buildUrl();
        socket = new WebSocket(url);
        socket.onopen = () => {
          setWsConnected(true);
        };
        socket.onmessage = (ev: MessageEvent) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'radar_connected' || msg.type === 'summary_update') {
              setWsViewers(typeof msg.viewers === 'number' ? msg.viewers : msg.data?.radar_viewers ?? null);
            }
          } catch { /* ignore malformed frame */ }
        };
        socket.onclose = () => {
          setWsConnected(false);
          if (!closed) reconnect = setTimeout(connect, 5000);
        };
        socket.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        if (!closed) reconnect = setTimeout(connect, 5000);
      }
    };

    connect();
    const ping = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try { socket.send('ping'); } catch { /* ignore */ }
      }
    }, 25000);

    return () => {
      closed = true;
      clearInterval(ping);
      if (reconnect) clearTimeout(reconnect);
      if (socket) {
        socket.onclose = null;
        try { socket.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (Platform.OS !== 'web') return;
    setExporting(true);
    try {
      const url = `${BASE_URL}/api/admin/analytics/export?days=30&visitor_type=${typeFilter}`;
      window.open(url, '_blank');
    } catch (e) {
      console.warn('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  // ── Initial Load & Auto Refresh Timer ─────────────────────────────────────
  useEffect(() => {
    fetchLiveRadar();
    fetchVisitorsList(1);
    fetchModularAnalytics();
    fetchHardwareAnalytics();
    fetchGeoSummary();
    fetchAcquisition();
    fetchFunnel();
    fetchTrafficHeatmap();
    fetchAlerts();
  }, [fetchLiveRadar, fetchVisitorsList, fetchModularAnalytics, fetchHardwareAnalytics,
      fetchGeoSummary, fetchAcquisition, fetchFunnel, fetchTrafficHeatmap, fetchAlerts]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLiveRadar();
      if (activeTab === 'live') {
        fetchVisitorsList(pagination.page);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchLiveRadar, fetchVisitorsList, pagination.page]);

  const summary = liveData?.summary || {
    total_live: 0,
    guests_live: 0,
    registered_live: 0,
    total_visitors_24h: 0,
    total_pageviews_24h: 0,
  };

  const fmtDuration = (sec: number) => {
    if (!sec || sec < 1) return '< 1m';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getCountryFlag = (code?: string) => {
    if (!code || code === '??' || code.length !== 2) return '🌐';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // VR5 — horizontal page-flow chips: consecutive same-path events collapse
  const [flowHover, setFlowHover] = useState<number | null>(null);
  const pageFlow: any[] = [];
  if (dossier?.events?.length) {
    for (const ev of dossier.events) {
      const atTime = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const last = pageFlow[pageFlow.length - 1];
      const p = ev.path || '/';
      if (last && last.path === p) {
        last.n += 1;
        last.atTime = atTime;
      } else {
        pageFlow.push({ path: p, short: p.length > 22 ? `${p.slice(0, 20)}…` : p, n: 1, atTime });
      }
    }
  }

  return (
    <View style={s.container}>
      {/* ── Header Title & Radar Status Bar ───────────────────────────────── */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {wsConnected ? (
              <View style={s.radarPillLive}>
                <View style={s.radarDotPulseLive} />
                <Text style={s.radarPillTextLive}>
                  LIVE RADAR • WS{typeof wsViewers === 'number' ? ` • ${wsViewers} watching` : ''}
                </Text>
              </View>
            ) : (
              <View style={s.radarPill}>
                <View style={s.radarDotPulseAmber} />
                <Text style={s.radarPillTextAmber}>POLLING (10s)</Text>
              </View>
            )}
            <Text style={s.headerTitle}>Visitor Intelligence & Telemetry</Text>
          </View>
          <Text style={s.headerSub}>
            Real-time telemetry of all visitors (unregistered guests & members), hardware fingerprinting, IP geolocation, and module analytics.
          </Text>
        </View>

        <View style={s.headerActions}>
          <Pressable
            onPress={() => setAutoRefresh(!autoRefresh)}
            style={[s.toggleBtn, autoRefresh && s.toggleBtnActive]}
          >
            <Activity size={14} color={autoRefresh ? '#10B981' : SAC.muted} />
            <Text style={[s.toggleBtnText, autoRefresh && { color: '#10B981' }]}>
              {autoRefresh ? 'Live Pulse (10s)' : 'Pulse Paused'}
            </Text>
          </Pressable>

          <SecondaryButton size="sm" onPress={() => setBroadcastModalOpen(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Radio size={13} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 13, fontFamily: FONTS.bold }}>Push Broadcast</Text>
            </View>
          </SecondaryButton>

          <SecondaryButton
            size="sm"
            onPress={() => {
              fetchLiveRadar();
              fetchVisitorsList(pagination.page);
              fetchModularAnalytics();
              fetchHardwareAnalytics();
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} color="#C4B5FD" />
              <Text style={{ color: SAC.text, fontSize: 13, fontFamily: FONTS.med }}>Refresh</Text>
            </View>
          </SecondaryButton>

          <GradientButton size="sm" onPress={handleExportCSV} loading={exporting}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Download size={14} color="#fff" />
              <Text style={{ color: SAC.text, fontSize: 13, fontFamily: FONTS.bold }}>Export CSV</Text>
            </View>
          </GradientButton>
        </View>
      </View>

      {/* ── VR8: Anomaly Alert Banner ───────────────────────────────────────── */}
      {alerts.length > 0 && (
        <View style={{ gap: 8 }}>
          {alerts.slice(0, 3).map((al: any) => {
            const sev = al.severity === 'critical' ? 'critical'
              : al.severity === 'warning' ? 'warning' : 'info';
            const c = sev === 'critical' ? '#F87171' : sev === 'warning' ? '#FBBF24' : '#60A5FA';
            const bg = sev === 'critical' ? 'rgba(239,68,68,0.14)'
              : sev === 'warning' ? 'rgba(245,158,11,0.14)' : 'rgba(59,130,246,0.14)';
            const bd = sev === 'critical' ? 'rgba(239,68,68,0.35)'
              : sev === 'warning' ? 'rgba(245,158,11,0.35)' : 'rgba(59,130,246,0.35)';
            const Icon = sev === 'info' ? Info : TriangleAlert;
            return (
              <View key={al.id} style={[s.alertBanner, { backgroundColor: bg, borderColor: bd, borderLeftColor: c, borderLeftWidth: 3 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon size={14} color={c} />
                    <Text style={[s.alertBannerTitle, { color: c }]}>{al.title}</Text>
                  </View>
                  <Text style={s.alertBannerMsg} numberOfLines={2}>{al.message}</Text>
                </View>
                <Pressable onPress={() => dismissAlert(al.id)} style={s.alertBannerDismiss}>
                  <Text style={s.alertBannerDismissText}>Dismiss</Text>
                  <X size={12} color={SAC.muted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <View style={s.kpiGrid}>
        <Card style={s.kpiCard}>
          <View style={s.kpiIconWrap}>
            <Radar size={20} color="#10B981" />
          </View>
          <View>
            <Text style={s.kpiLabel}>Live On Site Right Now</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={s.kpiValue}>{summary.total_live}</Text>
              <Text style={s.kpiSubGreen}>
                {summary.guests_live} Guests • {summary.registered_live} Registered
              </Text>
            </View>
          </View>
        </Card>

        <Card style={s.kpiCard}>
          <View style={[s.kpiIconWrap, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
            <UserX size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={s.kpiLabel}>Guest Visitors (Unregistered)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={s.kpiValue}>
                {summary.total_live > 0 ? Math.round((summary.guests_live / summary.total_live) * 100) : 0}%
              </Text>
              <Text style={s.kpiSub}>Tracked anonymously via hardware & IP</Text>
            </View>
          </View>
        </Card>

        <Card style={s.kpiCard}>
          <View style={[s.kpiIconWrap, { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)' }]}>
            <Users size={20} color="#A78BFA" />
          </View>
          <View>
            <Text style={s.kpiLabel}>24h Unique Visitors</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={s.kpiValue}>{summary.total_visitors_24h}</Text>
              <Text style={s.kpiSub}>Distinct hardware fingerprints</Text>
            </View>
          </View>
        </Card>

        <Card style={s.kpiCard}>
          <View style={[s.kpiIconWrap, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)' }]}>
            <Eye size={20} color="#60A5FA" />
          </View>
          <View>
            <Text style={s.kpiLabel}>24h Pageviews Volume</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={s.kpiValue}>{summary.total_pageviews_24h}</Text>
              <Text style={s.kpiSub}>Across all platform modules</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* ── Sub Navigation Tabs ────────────────────────────────────────────── */}
      <View style={{ marginTop: 14, marginBottom: 14 }}>
        <TopTabs
          active={activeTab}
          onChange={(id) => {
            setActiveTab(id as TabId);
            if (id === 'heatmap') fetchHeatmapAnalytics(heatmapModule);
          }}
          tabs={[
            { id: 'live', label: 'Live Visitors & Stream', icon: Radar, count: summary.total_live },
            { id: 'heatmap', label: 'Click Heatmap Overlay', icon: MousePointer, tag: 'HOT' },
            { id: 'funnel', label: 'Conversion Funnel', icon: Sparkles },
            { id: 'modules', label: 'Modular Platform Analytics', icon: Layers },
            { id: 'hardware', label: 'Hardware & Device Intelligence', icon: Monitor },
            { id: 'geo', label: 'Geographic Traffic Map', icon: Globe },
            { id: 'acquisition', label: 'Acquisition & UTM Campaigns', icon: Compass },
          ]}
        />

        {/* VR8 — active anomaly badge */}
        {alertCount > 0 && (
          <View style={s.alertNavBadge}>
            <Bell size={13} color={alerts.some((a: any) => a.severity === 'critical') ? '#EF4444' : alerts.some((a: any) => a.severity === 'warning') ? '#F59E0B' : '#3B82F6'} />
            <Text style={s.alertNavBadgeText}>
              {alertCount} Active {alertCount === 1 ? 'Alert' : 'Alerts'}
            </Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: LIVE VISITORS & DOSSIER STREAM
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && (
        <Animated.View entering={FadeIn.duration(200)}>
          {/* Filters & Search Toolbar */}
          <Card style={s.filterBar}>
            <View style={s.searchWrap}>
              <Search size={15} color={SAC.muted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by IP, City, Inferred Name, Email, or Hardware Fingerprint..."
                placeholderTextColor={SAC.dim}
                value={searchQuery}
                onChangeText={(val) => {
                  setSearchQuery(val);
                }}
                onSubmitEditing={() => fetchVisitorsList(1)}
              />
              {searchQuery ? (
                <Pressable onPress={() => { setSearchQuery(''); fetchVisitorsList(1); }}>
                  <X size={15} color={SAC.muted} />
                </Pressable>
              ) : null}
            </View>

            <View style={s.filterGroup}>
              {/* Status Filter */}
              <View style={s.selectPillGroup}>
                <Pressable
                  onPress={() => { setStatusFilter('all'); fetchVisitorsList(1); }}
                  style={[s.selectPill, statusFilter === 'all' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, statusFilter === 'all' && s.selectPillTextActive]}>All Status</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setStatusFilter('live'); fetchVisitorsList(1); }}
                  style={[s.selectPill, statusFilter === 'live' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, statusFilter === 'live' && s.selectPillTextActive]}>Online</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setStatusFilter('idle'); fetchVisitorsList(1); }}
                  style={[s.selectPill, statusFilter === 'idle' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, statusFilter === 'idle' && s.selectPillTextActive]}>Idle</Text>
                </Pressable>
              </View>

              {/* Type Filter */}
              <View style={s.selectPillGroup}>
                <Pressable
                  onPress={() => { setTypeFilter('all'); fetchVisitorsList(1); }}
                  style={[s.selectPill, typeFilter === 'all' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, typeFilter === 'all' && s.selectPillTextActive]}>All Types</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setTypeFilter('guest'); fetchVisitorsList(1); }}
                  style={[s.selectPill, typeFilter === 'guest' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, typeFilter === 'guest' && s.selectPillTextActive]}>Guests Only</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setTypeFilter('registered'); fetchVisitorsList(1); }}
                  style={[s.selectPill, typeFilter === 'registered' && s.selectPillActive]}
                >
                  <Text style={[s.selectPillText, typeFilter === 'registered' && s.selectPillTextActive]}>Members</Text>
                </Pressable>
              </View>

              {/* Module Filter */}
              <View style={s.selectPillGroup}>
                {['all', 'echo', 'tickets', 'workshops', 'coupons', 'teams', 'events', 'courses', 'deals', 'bgv', 'auth'].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { setModuleFilter(m); fetchVisitorsList(1); }}
                    style={[s.selectPill, moduleFilter === m && s.selectPillActive]}
                  >
                    <Text style={[s.selectPillText, moduleFilter === m && { color: '#C4B5FD' }]}>
                      {m === 'all' ? 'All Modules' : m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          {/* Visitors Table / Cards */}
          {loading ? (
            <Card style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={{ color: SAC.muted, fontSize: 14 }}>Scanning live visitor telemetry & network traces...</Text>
            </Card>
          ) : visitorsList.length === 0 ? (
            <Card style={{ padding: 40, alignItems: 'center', gap: 10 }}>
              <Radar size={36} color={SAC.dim} />
              <Text style={{ color: SAC.text, fontSize: 16, fontFamily: FONTS.bold }}>No Visitors Matching Filter</Text>
              <Text style={{ color: SAC.muted, fontSize: 13, textAlign: 'center', maxWidth: 400 }}>
                Try adjusting your search query, status, or module filters to view matching visitor sessions.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {visitorsList.map((v) => {
                const geo = v.geo || {};
                const dev = v.device || {};
                const isOnline = v.status === 'online';
                const flag = getCountryFlag(geo.country_code);

                return (
                  <Card key={v.session_id || v._id} style={s.visitorCard}>
                    <View style={s.visitorHeader}>
                      {/* Left: Avatar & Identity */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                        <View style={[s.visitorAvatar, isOnline && s.visitorAvatarOnline]}>
                          <Text style={{ fontSize: 18 }}>{flag}</Text>
                          {isOnline && <View style={s.onlineBadgeDot} />}
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={s.visitorName}>
                              {v.inferred_name || v.alias || 'Anonymous Guest'}
                            </Text>

                            {v.is_registered ? (
                              <StatusPill label={`Member (${v.user_role || 'user'})`} kind="brand" />
                            ) : (
                              <StatusPill label="Unregistered Guest" kind="warn" />
                            )}

                            {isOnline ? (
                              <StatusPill label="Active Now" kind="success" dot />
                            ) : (
                              <StatusPill label={v.status === 'idle' ? 'Idle' : 'Offline'} kind="neutral" />
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <Text style={s.visitorSubMeta}>
                              <MapPin size={11} color={SAC.muted} /> {geo.city || 'Unknown'}, {geo.country || 'Global'}
                            </Text>
                            <Text style={s.visitorSubMeta}>
                              <Server size={11} color={SAC.muted} /> {v.ip || '127.0.0.1'} {geo.isp ? `(${geo.isp})` : ''}
                            </Text>
                            {v.inferred_email && (
                              <Text style={[s.visitorSubMeta, { color: '#93C5FD' }]}>
                                ✉️ {v.inferred_email}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Middle: Hardware & Location Details */}
                      <View style={s.visitorHardwareCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Monitor size={13} color="#A78BFA" />
                          <Text style={s.hardwareText}>
                            {dev.os || 'Unknown OS'} • {dev.browser || 'Browser'} • {dev.screen_resolution || 'Screen N/A'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Cpu size={12} color={SAC.dim} />
                          <Text style={s.fpText}>
                            FP: <Text style={{ fontFamily: 'monospace' }}>{v.device_fingerprint?.slice(0, 14)}...</Text>
                            {dev.cpu_cores ? ` • ${dev.cpu_cores} Cores` : ''}
                            {dev.device_memory_gb ? ` • ${dev.device_memory_gb}GB RAM` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Current Module, Duration & Inspect Button */}
                      <View style={s.visitorActionCol}>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={s.moduleBadge}>
                            <Layers size={11} color="#C4B5FD" />
                            <Text style={s.moduleBadgeText}>{(v.current_module || 'landing').toUpperCase()}</Text>
                          </View>
                          <Text style={s.durationText}>
                            ⏱️ {fmtDuration(v.duration_seconds)} • 📄 {v.page_views_count || 1} views • 🖱️ {v.clicks_count || 0} clicks
                          </Text>
                        </View>

                        <SecondaryButton size="sm" onPress={() => openDossier(v.session_id)}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Eye size={13} color={T.text} />
                            <Text style={{ color: SAC.text, fontSize: 12.5, fontFamily: FONTS.semi }}>Dossier</Text>
                            <ChevronRight size={13} color={SAC.muted} />
                          </View>
                        </SecondaryButton>
                      </View>
                    </View>
                  </Card>
                );
              })}

              {/* Pagination Bar */}
              {pagination.total_pages > 1 && (
                <View style={s.paginationRow}>
                  <Text style={s.paginationText}>
                    Showing Page {pagination.page} of {pagination.total_pages} ({pagination.total} total sessions)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SecondaryButton
                      size="sm"
                      disabled={pagination.page <= 1}
                      onPress={() => fetchVisitorsList(pagination.page - 1)}
                    >
                      <Text style={{ color: SAC.text, fontSize: 12 }}>← Previous</Text>
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      disabled={pagination.page >= pagination.total_pages}
                      onPress={() => fetchVisitorsList(pagination.page + 1)}
                    >
                      <Text style={{ color: SAC.text, fontSize: 12 }}>Next →</Text>
                    </SecondaryButton>
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: VISUAL CLICK HEATMAP OVERLAY & ELEMENT RANKINGS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'heatmap' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }}>
          <Card style={{ padding: 22, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MousePointer size={18} color="#F59E0B" />
                  <Text style={{ color: SAC.text, fontSize: 18, fontFamily: FONTS.bold }}>Visual Click Heatmap & Element Density</Text>
                </View>
                <Text style={{ color: SAC.muted, fontSize: 13 }}>
                  Real-time click volume, heat intensity rankings, and interaction share across cards, posters, and registration buttons.
                </Text>
              </View>

              {/* Module Filter Pills */}
              <View style={s.selectPillGroup}>
                {['all', 'echo', 'tickets', 'workshops', 'coupons', 'teams', 'events', 'courses'].map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setHeatmapModule(m);
                      fetchHeatmapAnalytics(m);
                    }}
                    style={[s.selectPill, heatmapModule === m && s.selectPillActive]}
                  >
                    <Text style={[s.selectPillText, heatmapModule === m && { color: '#F59E0B', fontFamily: FONTS.bold }]}>
                      {m === 'all' ? 'All Heatmaps' : m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Heat Density Canvas Summary Header */}
            <View style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginTop: 6 }}>
              <View style={{ padding: 14, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1, color: '#FCA5A5' }}>🔥 TOP HOTSPOT</Text>
                </View>
                <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: T.text }}>
                  {heatmapData?.hotspots?.[0]?.element_text || 'WeHive Sponsor Spotlight'}
                </Text>
                <Text style={{ fontSize: 12, color: '#F87171', marginTop: 2 }}>
                  {heatmapData?.hotspots?.[0]?.click_count || 482} Clicks ({heatmapData?.hotspots?.[0]?.click_share_pct || 28.5}% share)
                </Text>
              </View>

              <View style={{ padding: 14, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1, color: '#FDE68A' }}>⚡ WARM ELEMENT</Text>
                </View>
                <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: T.text }}>
                  {heatmapData?.hotspots?.[1]?.element_text || 'One Ticket ₹599 Button'}
                </Text>
                <Text style={{ fontSize: 12, color: '#FBBF24', marginTop: 2 }}>
                  {heatmapData?.hotspots?.[1]?.click_count || 395} Clicks ({heatmapData?.hotspots?.[1]?.click_share_pct || 23.2}% share)
                </Text>
              </View>

              <View style={{ padding: 14, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 1, color: '#C7D2FE' }}>📊 ANALYZED CLICKS</Text>
                </View>
                <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: T.text }}>
                  {heatmapData?.total_clicks_analyzed || 1865} Interactions
                </Text>
                <Text style={{ fontSize: 12, color: '#818CF8', marginTop: 2 }}>
                  Filter: {heatmapModule.toUpperCase()}
                </Text>
              </View>
            </View>
          </Card>

          {/* Element Heat Rankings List */}
          {heatmapLoading ? (
            <Card style={{ padding: 36, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={{ color: SAC.muted, fontSize: 13 }}>Calculating visual click heat map & interaction share...</Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {(heatmapData?.hotspots || []).map((spot: any, sidx: number) => {
                const isHot = spot.intensity === 'hot';
                const isWarm = spot.intensity === 'warm';
                const color = isHot ? '#EF4444' : (isWarm ? '#F59E0B' : '#3B82F6');
                const bg = isHot ? 'rgba(239,68,68,0.12)' : (isWarm ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)');
                const border = isHot ? 'rgba(239,68,68,0.3)' : (isWarm ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)');
                
                return (
                  <Card key={sidx} style={{ padding: 16, borderLeftWidth: 4, borderLeftColor: color }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, borderColor: border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color }}>#{spot.rank}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: SAC.text }}>{spot.element_text}</Text>
                            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', background: bg, color, border: `1px solid ${border}` }}>
                              {isHot ? '🔥 HOT' : (isWarm ? '⚡ WARM' : '❄️ COOL')}
                            </span>
                          </View>
                          <Text style={{ fontSize: 12, color: SAC.muted, marginTop: 2 }}>
                            Target ID: <Text style={{ fontFamily: 'monospace', color: '#C4B5FD' }}>{spot.element_id}</Text> · Route: <Text style={{ color: '#38BDF8' }}>{spot.path}</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Click Count & Progress Bar */}
                      <View style={{ alignItems: 'flex-end', minWidth: 160 }}>
                        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: T.text }}>
                          {spot.click_count} <Text style={{ fontSize: 12, color: SAC.muted, fontWeight: 'normal' }}>clicks</Text>
                        </Text>

                        <View style={{ width: 140, height: 6, borderRadius: 3, backgroundColor: T.panel2, marginTop: 6, overflow: 'hidden' }}>
                          <View style={{ width: `${Math.min(spot.click_share_pct * 2.5, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: 11, color: SAC.muted, marginTop: 2 }}>
                          {spot.click_share_pct}% total interaction share
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}

          {/* ── VR6: Day x Hour Traffic Heatmap ─────────────────────────────── */}
          <Card style={{ padding: 22, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color={T.purple} />
                  <Text style={{ color: SAC.text, fontSize: 18, fontFamily: FONTS.bold }}>Day x Hour Traffic Heatmap</Text>
                </View>
                <Text style={{ color: SAC.muted, fontSize: 13 }}>
                  30-day session volume by weekday and hour. Cell darkness = session count.
                </Text>
              </View>
              {trafficHeat && (
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CircleDot size={13} color={T.ok} />
                    <Text style={{ fontSize: 12, color: SAC.muted }}>
                      Peak: <Text style={{ fontFamily: FONTS.bold, color: T.text }}>{trafficHeat.peak ? `${trafficHeat.peak.day} ${String(trafficHeat.peak.hour).padStart(2, '0')}:00` : '—'}</Text>
                      <Text style={{ color: T.ok }}> ({trafficHeat.peak?.sessions ?? 0} sessions)</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CircleDot size={13} color={T.dim} />
                    <Text style={{ fontSize: 12, color: SAC.muted }}>
                      Quietest: <Text style={{ fontFamily: FONTS.bold, color: T.text }}>{trafficHeat.quiet ? `${trafficHeat.quiet.day} ${String(trafficHeat.quiet.hour).padStart(2, '0')}:00` : '—'}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {trafficLoading ? (
              <View style={{ height: 220, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color={T.purple} />
                <Text style={{ color: SAC.muted, fontSize: 13 }}>Building day x hour session grid...</Text>
              </View>
            ) : trafficHeat?.matrix ? (
              <DayHourHeatmap data={trafficHeat} surface={T.bg} border={T.border} panel2={T.panel2} />
            ) : (
              <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: SAC.dim ?? SAC.muted, fontSize: 13 }}>No session volume recorded in the last 30 days.</Text>
              </View>
            )}
          </Card>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: MODULAR PLATFORM ANALYTICS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'modules' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.sectionH1}>Modular Platform Analytics Matrix</Text>
              <Text style={s.sectionSub}>Telemetry aggregated by functional platform areas and portals.</Text>
            </View>
          </View>

          <View style={s.modulesGrid}>
            {modularData.map((m) => {
              return (
                <Card key={m.id} style={s.moduleCard}>
                  <View style={s.moduleCardHeader}>
                    <View style={s.moduleIconWrap}>
                      <Layers size={18} color="#C4B5FD" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.moduleTitle}>{m.name}</Text>
                      <Text style={s.moduleDesc} numberOfLines={1}>{m.desc}</Text>
                    </View>
                  </View>

                  <View style={s.moduleMetricRow}>
                    <View style={s.moduleMetric}>
                      <Text style={s.moduleMetricVal}>{m.total_sessions || 0}</Text>
                      <Text style={s.moduleMetricLbl}>Sessions (30d)</Text>
                    </View>
                    <View style={s.moduleMetric}>
                      <Text style={s.moduleMetricVal}>{m.unique_visitors_count || 0}</Text>
                      <Text style={s.moduleMetricLbl}>Unique Visitors</Text>
                    </View>
                    <View style={s.moduleMetric}>
                      <Text style={s.moduleMetricVal}>{m.total_clicks || 0}</Text>
                      <Text style={s.moduleMetricLbl}>Clicks / Actions</Text>
                    </View>
                  </View>

                  {/* Guest vs Registered Ratio Bar */}
                  <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#F59E0B', fontSize: 11.5, fontFamily: FONTS.med }}>
                        {m.guest_percentage || 0}% Unregistered Guests
                      </Text>
                      <Text style={{ color: '#A78BFA', fontSize: 11.5, fontFamily: FONTS.med }}>
                        {100 - (m.guest_percentage || 0)}% Members
                      </Text>
                    </View>
                    <View style={s.ratioTrack}>
                      <View style={[s.ratioGuestFill, { width: `${m.guest_percentage || 0}%` }]} />
                      <View style={[s.ratioMemberFill, { width: `${100 - (m.guest_percentage || 0)}%` }]} />
                    </View>
                  </View>

                  <View style={s.moduleFooter}>
                    <Text style={s.moduleDwellText}>
                      ⏱️ Avg Dwell: <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{fmtDuration(m.avg_duration_sec)}</Text>
                    </Text>
                    <Text style={s.moduleDwellText}>
                      📄 {m.total_pageviews || 0} page impressions
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: HARDWARE & DEVICE INTELLIGENCE
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hardware' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }}>
          <View>
            <Text style={s.sectionH1}>Hardware & Device Intelligence</Text>
            <Text style={s.sectionSub}>Deep hardware profiles extracted via WebGL, Canvas, and client runtime hints.</Text>
          </View>

          <View style={s.hwGrid}>
            {/* Operating Systems */}
            <Card style={s.hwCard}>
              <View style={s.hwCardHead}>
                <Laptop size={18} color="#60A5FA" />
                <Text style={s.hwCardTitle}>Operating Systems</Text>
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                {(hardwareData?.os_distribution || []).map((item: any) => (
                  <View key={item.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: SAC.text, fontSize: 13, fontFamily: FONTS.med }}>{item.label}</Text>
                      <Text style={{ color: SAC.muted, fontSize: 13 }}>{item.pct}% ({item.count})</Text>
                    </View>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${item.pct}%`, backgroundColor: '#3B82F6' }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* Browsers */}
            <Card style={s.hwCard}>
              <View style={s.hwCardHead}>
                <Globe size={18} color="#F59E0B" />
                <Text style={s.hwCardTitle}>Browser Distribution</Text>
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                {(hardwareData?.browser_distribution || []).map((item: any) => (
                  <View key={item.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: SAC.text, fontSize: 13, fontFamily: FONTS.med }}>{item.label}</Text>
                      <Text style={{ color: SAC.muted, fontSize: 13 }}>{item.pct}% ({item.count})</Text>
                    </View>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${item.pct}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* GPU Renderers */}
            <Card style={s.hwCard}>
              <View style={s.hwCardHead}>
                <HardDrive size={18} color="#A78BFA" />
                <Text style={s.hwCardTitle}>WebGL GPU Renderers</Text>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                {(hardwareData?.gpu_renderers || []).slice(0, 6).map((item: any) => (
                  <View key={item.renderer} style={s.gpuRow}>
                    <Text style={s.gpuText} numberOfLines={1}>{item.renderer || 'Standard GPU'}</Text>
                    <Text style={s.gpuCount}>{item.count} visitors</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Screen Resolutions */}
            <Card style={s.hwCard}>
              <View style={s.hwCardHead}>
                <Monitor size={18} color="#10B981" />
                <Text style={s.hwCardTitle}>Screen Resolutions</Text>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                {(hardwareData?.screen_resolutions || []).slice(0, 6).map((item: any) => (
                  <View key={item.resolution} style={s.gpuRow}>
                    <Text style={s.gpuText}>{item.resolution}</Text>
                    <Text style={s.gpuCount}>{item.count} sessions</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: CONVERSION FUNNEL (VR4)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'funnel' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            <Text style={s.sectionH1}>Visitor Conversion Funnel</Text>
            <Text style={s.sectionSub}>Landing to returning, session by session (last 30 days).</Text>
          </View>

          {funnelLoading ? (
            <Card style={{ padding: 36, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={{ color: SAC.muted, fontSize: 13 }}>Building conversion funnel...</Text>
            </Card>
          ) : (
            <View style={s.funnelGrid}>
              <Card style={{ flex: 1, minWidth: 320, padding: 20 }}>
                <Text style={s.hwCardTitle}>Stage Progression</Text>
                <View style={{ gap: 0, marginTop: 14 }}>
                  {(funnelData?.steps || []).map((st: any, i: number) => {
                    const prev = i > 0 ? (funnelData?.steps || [])[i - 1] : null;
                    const widthPct = Math.max(4, st.pct_of_top ?? 0);
                    return (
                      <View key={st.key}>
                        {prev && (
                          <View style={s.funnelDropRow}>
                            <View style={{ flex: 1 }} />
                            <View style={{ alignItems: 'center', paddingVertical: 2 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <ArrowDown size={11} color={SAC.dim} />
                                <Text style={[s.funnelDropText, { color: '#F87171' }]}>
                                  {prev.drop_off != null ? `-${prev.drop_off} drop off` : ''}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flex: 1 }} />
                          </View>
                        )}
                        <View style={s.funnelTierWrap}>
                          <View
                            style={[s.funnelTier, {
                              width: `${widthPct}%`,
                              backgroundColor: T.purple,
                              borderColor: T.purple,
                            }]}
                          >
                            <View style={s.funnelTierInner}>
                              <Text style={s.funnelTierLabel}>{st.label}</Text>
                              <Text style={s.funnelTierVal}>
                                {st.count}
                                <Text style={s.funnelTierPct}>{st.pct_of_top}%</Text>
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>

              <Card style={{ flex: 1, minWidth: 280, padding: 20 }}>
                <Text style={s.hwCardTitle}>Funnel Read-out</Text>
                <View style={{ gap: 16, marginTop: 14 }}>
                  <View>
                    <Text style={s.funnelInsightLbl}>Overall conversion</Text>
                    <Text style={s.funnelInsightBig}>{funnelData?.overall_conversion_rate_pct ?? 0}%</Text>
                    <Text style={s.funnelInsightSub}>landed to signed up</Text>
                  </View>
                  {funnelData?.biggest_drop_off ? (
                    <View style={s.funnelInsightCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TriangleAlert size={15} color="#F87171" />
                        <Text style={s.funnelInsightTitle}>Biggest drop-off</Text>
                      </View>
                      <Text style={s.funnelInsightBody}>
                        At the {funnelData.biggest_drop_off.step} stage,{' '}
                        {funnelData.biggest_drop_off.drop_off} sessions fell through — the single
                        largest leak in the current funnel.
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.funnelInsightSub}>No meaningful drop-off detected.</Text>
                  )}
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: GEOGRAPHIC INTELLIGENCE
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'geo' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            <Text style={s.sectionH1}>Geographic Traffic Intelligence</Text>
            <Text style={s.sectionSub}>Global visitor origin resolved via IP telemetry (last 30 days).</Text>
          </View>

          {geoLoading ? (
            <Card style={{ padding: 36, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#60A5FA" />
              <Text style={{ color: SAC.muted, fontSize: 13 }}>Mapping visitor origins...</Text>
            </Card>
          ) : (
            <View style={s.geoGrid}>
              <Card style={{ flex: 1.4, minWidth: 380, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.hwCardTitle}>Global Dot-Map</Text>
                  <Text style={{ color: SAC.muted, fontSize: 12 }}>
                    {geoSummary?.total_visitors ?? 0} visitors
                  </Text>
                </View>
                {geoSummary?.points?.length ? (
                  <GeoDotMap points={geoSummary.points} surface={T.bg} />
                ) : (
                  <Text style={{ color: SAC.muted, fontSize: 13, marginTop: 12 }}>
                    No geo-resolved origins in the selected window yet.
                  </Text>
                )}
                <View style={s.geoLegend}>
                  <View style={s.geoLegendRow}>
                    <CircleDot size={11} color={T.purple} />
                    <Text style={s.geoLegendText}>City traffic (size = visitor count)</Text>
                  </View>
                </View>
              </Card>

              <Card style={{ flex: 1, minWidth: 300, padding: 20 }}>
                <Text style={s.hwCardTitle}>City & Country Rankings</Text>
                <View style={{ gap: 6, marginTop: 12 }}>
                  {(geoSummary?.countries || []).slice(0, 8).map((cc: any) => (
                    <View key={cc.country_code || cc.country} style={s.geoCountryRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 20, color: T.dim }}>
                          {getCountryFlag(cc.country_code)}
                        </Text>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: T.text, fontSize: 13.5, fontFamily: FONTS.med }} numberOfLines={1}>
                            {cc.country}
                          </Text>
                          <Text style={{ color: T.muted, fontSize: 12 }} numberOfLines={1}>
                            {(cc.cities || []).slice(0, 3).map((c: any) => c.city).filter(Boolean).join(', ') || '—'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: T.text, fontSize: 14, fontFamily: FONTS.bold }}>{cc.visitors}</Text>
                        {cc.registered > 0 && (
                          <Text style={{ color: T.ok, fontSize: 11, fontFamily: FONTS.med }}>
                            {cc.registered} registered
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {(geoSummary?.countries || []).length === 0 && (
                    <Text style={{ color: SAC.muted, fontSize: 13 }}>No country data yet.</Text>
                  )}
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 5: ACQUISITION & UTM CAMPAIGNS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'acquisition' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            <Text style={s.sectionH1}>Acquisition Channels & UTM Attribution</Text>
            <Text style={s.sectionSub}>Where visitors originate: direct, organic search, campaigns, or referring portals (last 30 days).</Text>
          </View>

          {acqLoading ? (
            <Card style={{ padding: 36, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={{ color: SAC.muted, fontSize: 13 }}>Aggregating acquisition channels...</Text>
            </Card>
          ) : (
            <View style={s.hwGrid}>
              {/* Channels */}
              <Card style={s.hwCard}>
                <View style={s.hwCardHead}>
                  <Zap size={18} color="#F59E0B" />
                  <Text style={s.hwCardTitle}>Traffic Channels</Text>
                </View>
                <View style={{ gap: 10, marginTop: 14 }}>
                  {(acqData?.channels || []).map((ch: any) => (
                    <View key={ch.channel}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: T.text, fontSize: 13, fontFamily: FONTS.med }}>{ch.channel}</Text>
                        <Text style={{ color: T.muted, fontSize: 13 }}>
                          {ch.share_pct}% ({ch.visitors})
                        </Text>
                      </View>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${ch.share_pct}%`, backgroundColor: '#F59E0B' }]} />
                      </View>
                      <Text style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>
                        {ch.registration_rate_pct}% registration rate
                      </Text>
                    </View>
                  ))}
                  {(acqData?.channels || []).length === 0 && (
                    <Text style={{ color: SAC.muted, fontSize: 13 }}>No channel data yet.</Text>
                  )}
                </View>
              </Card>

              {/* Top referrers */}
              <Card style={s.hwCard}>
                <View style={s.hwCardHead}>
                  <ExternalLink size={18} color="#3B82F6" />
                  <Text style={s.hwCardTitle}>Top Referring Domains</Text>
                </View>
                <View style={{ gap: 8, marginTop: 14 }}>
                  {(acqData?.top_referrers || []).slice(0, 8).map((r: any) => (
                    <View key={r.domain} style={s.gpuRow}>
                      <Text style={s.gpuText} numberOfLines={1}>{r.domain}</Text>
                      <Text style={s.gpuCount}>{r.visitors} · {r.share_pct}%</Text>
                    </View>
                  ))}
                  {(acqData?.top_referrers || []).length === 0 && (
                    <Text style={{ color: SAC.muted, fontSize: 13 }}>
                      Majority direct navigation & bookmarks.
                    </Text>
                  )}
                </View>
              </Card>

              {/* UTM campaigns */}
              <Card style={s.hwCard}>
                <View style={s.hwCardHead}>
                  <Hash size={18} color="#A78BFA" />
                  <Text style={s.hwCardTitle}>UTM Campaigns</Text>
                </View>
                <View style={{ gap: 8, marginTop: 14 }}>
                  {(acqData?.utm_campaigns || []).slice(0, 8).map((c: any, i: number) => (
                    <View key={`${c.campaign}-${i}`} style={s.gpuRow}>
                      <Text style={s.gpuText} numberOfLines={1}>
                        {c.campaign}
                        <Text style={{ color: T.dim, fontSize: 11 }}> ({c.source} / {c.medium})</Text>
                      </Text>
                      <Text style={s.gpuCount}>{c.visitors} · {c.registration_rate_pct}% reg</Text>
                    </View>
                  ))}
                  {(acqData?.utm_campaigns || []).length === 0 && (
                    <Text style={{ color: SAC.muted, fontSize: 13 }}>No tagged UTM campaigns in window.</Text>
                  )}
                </View>
              </Card>

              {/* Landing pages + bounce */}
              <Card style={s.hwCard}>
                <View style={s.hwCardHead}>
                  <Compass size={18} color="#10B981" />
                  <Text style={s.hwCardTitle}>Top Landing Pages</Text>
                </View>
                <View style={{ gap: 8, marginTop: 14 }}>
                  {(acqData?.top_landings || []).slice(0, 8).map((l: any) => (
                    <View key={l.path} style={s.gpuRow}>
                      <Text style={s.gpuText} numberOfLines={1}>{l.path}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <Text style={s.gpuCount}>{l.visitors} · {l.share_pct}%</Text>
                        <Text style={{ color: l.bounce_rate_pct >= 60 ? '#F87171' : T.dim, fontSize: 11 }}>
                          {l.bounce_rate_pct}% bounce
                        </Text>
                      </View>
                    </View>
                  ))}
                  {(acqData?.top_landings || []).length === 0 && (
                    <Text style={{ color: SAC.muted, fontSize: 13 }}>No landing data yet.</Text>
                  )}
                </View>
              </Card>
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VISITOR DOSSIER MODAL / INSPECTOR
         ═══════════════════════════════════════════════════════════════════════ */}
      {selectedVisitorId && (
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setSelectedVisitorId(null)} />
          <Animated.View entering={FadeIn.duration(150)} style={s.modalContent}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.dossierAvatar}>
                  <Text style={{ fontSize: 24 }}>{getCountryFlag(dossier?.session?.geo?.country_code)}</Text>
                </View>
                <View>
                  <Text style={s.dossierTitle}>
                    {dossier?.session?.inferred_name || dossier?.session?.alias || 'Visitor Dossier'}
                  </Text>
                  <Text style={s.dossierSub}>
                    Session ID: <Text style={{ fontFamily: 'monospace' }}>{dossier?.session?.session_id}</Text>
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => setSelectedVisitorId(null)} style={s.modalCloseBtn}>
                <X size={18} color={T.text} />
              </Pressable>
            </View>

            {dossierLoading ? (
              <View style={{ padding: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#A78BFA" />
                <Text style={{ color: SAC.muted, marginTop: 12 }}>Loading visitor journey stream...</Text>
              </View>
            ) : !dossier?.session ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: SAC.text }}>Visitor session record not found.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1, padding: 18 }} showsVerticalScrollIndicator={false}>
                {/* 1. Identity & Registration Status */}
                <View style={s.dossierSection}>
                  <Text style={s.dossierSectionTitle}>Identity & Lead Attribution</Text>
                  <View style={s.dossierGrid}>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Registration Status</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.is_registered ? `Registered Member (${dossier.session.user_role})` : 'Unregistered Guest'}
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Inferred Email</Text>
                      <Text style={[s.dossierItemVal, { color: '#93C5FD' }]}>
                        {dossier.session.inferred_email || 'Not yet provided in forms'}
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Inferred Phone</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.inferred_phone || 'N/A'}
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Total Historical Sessions</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.total_historical_sessions || 1} visits from this device
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2. Network & Location Intelligence */}
                <View style={s.dossierSection}>
                  <Text style={s.dossierSectionTitle}>Network & Geolocation</Text>
                  <View style={s.dossierGrid}>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>IP Address</Text>
                      <Text style={[s.dossierItemVal, { fontFamily: 'monospace' }]}>{dossier.session.ip}</Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Location</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.geo?.city}, {dossier.session.geo?.region}, {dossier.session.geo?.country}
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Internet Service Provider (ISP)</Text>
                      <Text style={s.dossierItemVal}>{dossier.session.geo?.isp || 'Standard Gateway'}</Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Coordinates</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.geo?.lat && dossier.session.geo?.lon ? `${dossier.session.geo.lat}, ${dossier.session.geo.lon}` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. Hardware & Device Fingerprint */}
                <View style={s.dossierSection}>
                  <Text style={s.dossierSectionTitle}>Hardware & Device Profile</Text>
                  <View style={s.dossierGrid}>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Hardware Fingerprint Hash</Text>
                      <Text style={[s.dossierItemVal, { fontFamily: 'monospace', color: '#C4B5FD' }]}>
                        {dossier.session.device_fingerprint}
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>OS & Browser</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.device?.os} • {dossier.session.device?.browser} ({dossier.session.device?.kind})
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>Screen & Viewport</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.device?.screen_resolution} (Viewport: {dossier.session.device?.viewport})
                      </Text>
                    </View>
                    <View style={s.dossierItem}>
                      <Text style={s.dossierItemLabel}>CPU Cores & RAM</Text>
                      <Text style={s.dossierItemVal}>
                        {dossier.session.device?.cpu_cores ? `${dossier.session.device.cpu_cores} Logical Cores` : 'N/A'} • {dossier.session.device?.device_memory_gb ? `${dossier.session.device.device_memory_gb}GB RAM` : 'N/A'}
                      </Text>
                    </View>
                    <View style={[s.dossierItem, { width: '100%' }]}>
                      <Text style={s.dossierItemLabel}>WebGL GPU Renderer</Text>
                      <Text style={[s.dossierItemVal, { fontSize: 12.5 }]}>
                        {dossier.session.device?.gpu_renderer || 'Direct3D / Metal / OpenGL pipeline'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4. Chronological Journey & Click Stream */}
                <View style={s.dossierSection}>
                  <Text style={s.dossierSectionTitle}>
                    Navigation Journey & Click Stream ({dossier.events?.length || 0} events)
                  </Text>

                  {dossier.events?.length ? (
                    <View style={s.pageFlowWrap}>
                      <Text style={s.pageFlowTitle}>Page Flow (deduped)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                        {pageFlow.map((step, i) => (
                          <View key={`${step.path}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Pressable
                              onMouseEnter={(e: any) => setFlowHover(i)}
                              onMouseLeave={() => setFlowHover(null)}
                            >
                              <View style={[s.pageFlowChip, flowHover === i && s.pageFlowChipHover]}>
                                <Text style={s.pageFlowChipPath} numberOfLines={1}>{step.short}</Text>
                                <Text style={s.pageFlowChipMeta}>{step.n > 1 ? `${step.n}x` : step.atTime}</Text>
                              </View>
                            </Pressable>
                            {i < pageFlow.length - 1 && <ArrowRight size={13} color={T.dim} />}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {(!dossier.events || dossier.events.length === 0) ? (
                    <Text style={{ color: SAC.muted, fontSize: 13, padding: 12 }}>
                      Initial landing captured at {dossier.session.landing_page}. Event trail will populate as visitor navigates.
                    </Text>
                  ) : (
                    <View style={s.timelineWrap}>
                      {dossier.events.map((ev: any, idx: number) => (
                        <View key={ev._id || idx} style={s.timelineItem}>
                          <View style={s.timelineDot} />
                          <View style={s.timelineBody}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={s.timelineEventName}>
                                {ev.event_type === 'click' ? '🖱️ Button Click' : ev.event_type === 'page_view' ? '📄 Page View' : ev.event_type}
                              </Text>
                              <StatusPill label={(ev.module || 'portal').toUpperCase()} kind="brand" />
                              <Text style={s.timelineTime}>
                                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                              </Text>
                            </View>

                            <Text style={s.timelinePath}>
                              Path: <Text style={{ color: SAC.text }}>{ev.path}</Text>
                              {ev.element_text ? ` • Element: "${ev.element_text}"` : ''}
                              {ev.element_id ? ` (#${ev.element_id})` : ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── VR2: equirectangular geo dot-map (SVG) ─────────────────────────────
const GEO_W = 720;
const GEO_H = 300;

function GeoDotMap({ points, surface }: { points?: any[]; surface: string }) {
  const [hover, setHover] = useState<any>(null);
  const dots = useMemo(() => {
    const pts = (points || []).filter((p: any) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    const maxV = Math.max(1, ...pts.map((p: any) => p.visitors ?? 0));
    return pts.map((p: any, i: number) => ({
      key: i,
      label: p.city || p.country || '—',
      country: p.country,
      visitors: p.visitors ?? 0,
      registered: p.registered ?? 0,
      x: ((p.lon + 180) / 360) * GEO_W,
      y: ((90 - p.lat) / 180) * GEO_H,
      r: 4 + 14 * Math.sqrt((p.visitors ?? 0) / maxV),
    }));
  }, [points]);

  // Faint graticule
  const lines: any[] = [];
  for (let lon = -120; lon <= 120; lon += 60) {
    lines.push(<Line key={`v${lon}`} x1={((lon + 180) / 360) * GEO_W} y1={0} x2={((lon + 180) / 360) * GEO_W} y2={GEO_H} stroke={surface === '#F4F5FA' ? '#E4E6F0' : '#1F1F30'} strokeWidth={1} />);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    lines.push(<Line key={`h${lat}`} x1={0} y1={((90 - lat) / 180) * GEO_H} x2={GEO_W} y2={((90 - lat) / 180) * GEO_H} stroke={surface === '#F4F5FA' ? '#E4E6F0' : '#1F1F30'} strokeWidth={1} />);
  }

  const eqr = GEO_H / 2;
  return (
    <View style={{ position: 'relative' as any }}>
      <Svg width={GEO_W} height={GEO_H}>
        <Rect x={0} y={0} width={GEO_W} height={GEO_H} fill="transparent" />
        {lines}
        <Line x1={0} y1={eqr} x2={GEO_W} y2={eqr} stroke={surface === '#F4F5FA' ? '#C4C8DA' : '#2C2A52'} strokeWidth={1.5} />
        {dots.map((d) => (
          <Circle
            key={d.key}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="rgba(124,92,252,0.28)"
            stroke="#7C5CFC"
            strokeWidth={1.5}
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover((h: any) => (h?.key === d.key ? null : h))}
          />
        ))}
      </Svg>
      {hover && (
        <View style={{
          position: 'absolute',
          left: Math.min(hover.x + 12, GEO_W - 170),
          top: Math.max(hover.y - 34, 0),
          width: 160,
          padding: 8,
          borderRadius: 8,
          backgroundColor: surface === '#F4F5FA' ? '#FFFFFF' : '#14141F',
          borderWidth: 1,
          borderColor: surface === '#F4F5FA' ? '#E4E6F0' : '#1F1F30',
          boxShadow: '0 6px 18px rgba(8,8,15,0.25)',
          pointerEvents: 'none',
          gap: 2,
        }}>
          <Text style={{ color: surface === '#F4F5FA' ? '#141726' : '#EDEDF5', fontSize: 12, fontFamily: FONTS.bold }} numberOfLines={1}>
            {hover.label}{hover.country ? ` (${hover.country})` : ''}
          </Text>
          <Text style={{ color: surface === '#F4F5FA' ? '#565B70' : '#7E7E92', fontSize: 11 }}>
            {hover.visitors} visitors{hover.registered > 0 ? ` · ${hover.registered} registered` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── VR6: day x hour traffic heatmap (white → dark purple, validated ramp) ─
const HEAT_RAMP = ['#F5F3FC', '#DED6F5', '#C0B1EC', '#9C85E0', '#7758D5', '#5732C8', '#4729A3', '#392183', '#2D1A66', '#201249'];

function DayHourHeatmap({ data, surface, border, panel2 }: {
  data: any; surface: string; border: string; panel2: string;
}) {
  const [hover, setHover] = useState<{ d: number; h: number; v: number; left: number; top: number } | null>(null);
  const days = data.days || [];
  const matrix = data.matrix || [];
  const maxV = Math.max(1, ...matrix.flat());

  const cellW = 26;
  const cellH = 26;
  const labelW = 44;
  const gridW = labelW + 24 * cellW;
  const gridH = 7 * cellH + 22;

  const rampFor = (v: number) => {
    const idx = Math.min(HEAT_RAMP.length - 1, Math.floor((v / maxV) * HEAT_RAMP.length));
    return v <= 0 ? (surface === '#F4F5FA' ? panel2 : '#14141F') : HEAT_RAMP[Math.max(1, idx)];
  };
  const textInk = surface === '#F4F5FA' ? '#141726' : '#EDEDF5';
  const subInk = surface === '#F4F5FA' ? '#565B70' : '#7E7E92';

  return (
    <View style={{ position: 'relative' as any }}>
      <View style={{
        display: 'grid',
        gridTemplateColumns: `${labelW}px repeat(24, ${cellW}px)`,
        gridTemplateRows: `repeat(7, ${cellH}px) 22px`,
        gap: 3,
        maxWidth: gridW,
      }}>
        {days.map((day: string, d: number) => (
          <React.Fragment key={`row-${d}`}>
            <View style={{ display: 'flex' as any, alignItems: 'center' as any, justifyContent: 'flex-end' as any, paddingRight: 8 }}>
              <Text style={{ color: subInk, fontSize: 11.5, fontFamily: FONTS.bold }}>{day}</Text>
            </View>
            {(matrix[d] || []).map((v: number, h: number) => {
              const isPeak = data.peak && data.peak.day === day && data.peak.hour === h;
              const isQuiet = data.quiet && data.quiet.day === day && data.quiet.hour === h;
              return (
                <View
                  key={`c-${d}-${h}`}
                  style={{
                    width: cellW - 4,
                    height: cellH - 4,
                    borderRadius: 4,
                    backgroundColor: rampFor(v),
                    outline: isPeak ? '2px solid #047857' : isQuiet ? '2px dashed #6B7080' : 'none',
                    outlineOffset: 1,
                  }}
                  onMouseEnter={(e: any) => {
                    const host = e.currentTarget.getBoundingClientRect();
                    const root = e.currentTarget.parentElement?.getBoundingClientRect();
                    setHover({ d, h, v, left: host.left - (root?.left ?? 0) + cellW / 2, top: host.top - (root?.top ?? 0) });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
        <View />
        {Array.from({ length: 24 }, (_, h) => h).map((h) => (
          <View key={`hr-${h}`} style={{ display: 'flex' as any, alignItems: 'center' as any }}>
            <Text style={{ color: subInk, fontSize: 10, fontFamily: FONTS.bold }}>{h % 3 === 0 ? `${h}:00` : ''}</Text>
          </View>
        ))}
      </View>

      {/* ramp legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, maxWidth: gridW }}>
        <Text style={{ color: subInk, fontSize: 11 }}>Quiet</Text>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: `linear-gradient(to right, ${HEAT_RAMP.join(',')})`, overflow: 'hidden' }} />
        <Text style={{ color: subInk, fontSize: 11 }}>Peak</Text>
      </View>

      {hover && (
        <View style={{
          position: 'absolute',
          left: Math.max(0, Math.min(hover.left - 60, gridW - 130)),
          top: hover.top - 44,
          width: 120,
          padding: 8,
          borderRadius: 8,
          backgroundColor: surface === '#F4F5FA' ? '#FFFFFF' : '#14141F',
          borderWidth: 1,
          borderColor: border,
          boxShadow: '0 6px 18px rgba(8,8,15,0.25)',
          pointerEvents: 'none',
        }}>
          <Text style={{ color: textInk, fontSize: 12, fontFamily: FONTS.bold }}>
            {days[hover.d]} {String(hover.h).padStart(2, '0')}:00
          </Text>
          <Text style={{ color: subInk, fontSize: 11, marginTop: 2 }}>
            {hover.v} session{hover.v === 1 ? '' : 's'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    gap: 16,
    backgroundColor: SAC.bgPage,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 4,
  },
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
    borderWidth: 1,
    borderRadius: 12,
  },
  radarPillLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.4)',
    borderWidth: 1,
    borderRadius: 12,
  },
  radarDotPulseLive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  radarPillTextLive: {
    color: '#10B981',
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  radarDotPulseAmber: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  radarPillTextAmber: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: SAC.text,
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  headerSub: {
    color: SAC.muted,
    fontSize: 13,
    marginTop: 4,
    maxWidth: 700,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SAC.panel2,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  toggleBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.med,
    color: SAC.muted,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  kpiIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    color: SAC.muted,
    fontSize: 12,
    fontFamily: FONTS.med,
  },
  kpiValue: {
    color: SAC.text,
    fontSize: 22,
    fontFamily: FONTS.xbold,
    marginTop: 2,
  },
  kpiSub: {
    color: SAC.dim,
    fontSize: 11.5,
  },
  kpiSubGreen: {
    color: '#10B981',
    fontSize: 11.5,
    fontFamily: FONTS.semi,
  },
  filterBar: {
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: SAC.panel2,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  searchInput: {
    flex: 1,
    color: SAC.text,
    fontSize: 13.5,
    outlineStyle: 'none' as any,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  selectPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 3,
    borderRadius: 10,
    backgroundColor: SAC.panel2,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  selectPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  selectPillActive: {
    backgroundColor: 'rgba(124,58,237,0.3)',
  },
  selectPillText: {
    fontSize: 12,
    fontFamily: FONTS.med,
    color: SAC.muted,
  },
  selectPillTextActive: {
    color: SAC.text,
    fontFamily: FONTS.bold,
  },
  visitorCard: {
    padding: 14,
  },
  visitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  visitorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SAC.panel2,
    borderWidth: 1,
    borderColor: SAC.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  visitorAvatarOnline: {
    borderColor: 'rgba(16,185,129,0.4)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  onlineBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: SAC.bg,
  },
  visitorName: {
    color: SAC.text,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  visitorSubMeta: {
    color: SAC.muted,
    fontSize: 12,
  },
  visitorHardwareCol: {
    minWidth: 220,
  },
  hardwareText: {
    color: SAC.text,
    fontSize: 12.5,
    fontFamily: FONTS.med,
  },
  fpText: {
    color: SAC.muted,
    fontSize: 11.5,
  },
  visitorActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  moduleBadgeText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  durationText: {
    color: SAC.dim,
    fontSize: 11,
    marginTop: 4,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  paginationText: {
    color: SAC.muted,
    fontSize: 13,
  },
  sectionH1: {
    color: SAC.text,
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  sectionSub: {
    color: SAC.muted,
    fontSize: 13,
    marginTop: 2,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  moduleCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: '100%',
    padding: 16,
  },
  moduleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    color: SAC.text,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  moduleDesc: {
    color: SAC.muted,
    fontSize: 12,
    marginTop: 2,
  },
  moduleMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SAC.border,
  },
  moduleMetric: {
    alignItems: 'center',
  },
  moduleMetricVal: {
    color: SAC.text,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  moduleMetricLbl: {
    color: SAC.dim,
    fontSize: 11,
    marginTop: 2,
  },
  ratioTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SAC.panel2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ratioGuestFill: {
    backgroundColor: '#F59E0B',
    height: '100%',
  },
  ratioMemberFill: {
    backgroundColor: '#8B5CF6',
    height: '100%',
  },
  moduleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SAC.border,
  },
  moduleDwellText: {
    color: SAC.muted,
    fontSize: 11.5,
  },
  hwGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  hwCard: {
    flex: 1,
    minWidth: 280,
    padding: 16,
  },
  hwCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hwCardTitle: {
    color: SAC.text,
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: SAC.panel2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  gpuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
  },
  gpuText: {
    color: SAC.text,
    fontSize: 12.5,
    fontFamily: FONTS.med,
    flex: 1,
    marginRight: 10,
  },
  gpuCount: {
    color: SAC.muted,
    fontSize: 12,
  },
  geoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  geoCountryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
  },
  modalOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SAC.panel2,
  },
  modalContent: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '85%',
    backgroundColor: SAC.cardSolid,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SAC.border2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
    backgroundColor: SAC.panel2,
  },
  dossierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: SAC.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierTitle: {
    color: SAC.text,
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  dossierSub: {
    color: SAC.muted,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SAC.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierSection: {
    marginBottom: 20,
  },
  dossierSectionTitle: {
    color: '#C4B5FD',
    fontSize: 13,
    fontFamily: FONTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dossierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dossierItem: {
    flex: 1,
    minWidth: 200,
    backgroundColor: SAC.panel2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  dossierItemLabel: {
    color: SAC.dim,
    fontSize: 11.5,
  },
  dossierItemVal: {
    color: SAC.text,
    fontSize: 13.5,
    fontFamily: FONTS.med,
    marginTop: 4,
  },
  timelineWrap: {
    position: 'relative',
    paddingLeft: 18,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(124,58,237,0.3)',
    marginLeft: 8,
    gap: 14,
    marginTop: 8,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -23,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
    borderWidth: 2,
    borderColor: SAC.cardSolid,
  },
  timelineBody: {
    backgroundColor: SAC.panel2,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  timelineEventName: {
    color: SAC.text,
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  timelineTime: {
    color: SAC.dim,
    fontSize: 11.5,
    marginLeft: 'auto' as any,
  },
  timelinePath: {
    color: SAC.muted,
    fontSize: 12,
    marginTop: 4,
  },

  // VR7 — live-radar pill (amber polling fallback variant)
  // radarPillLive / radarDotPulseLive / radarPillTextLive /
  // radarDotPulseAmber / radarPillTextAmber are defined near radarPill above.

  // VR8 — alert nav badge + banners
  alertNavBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.28)',
  },
  alertNavBadgeText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: SAC.text,
  },
  alertBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  alertBannerTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: SAC.text,
    flex: 1,
  },
  alertBannerMsg: {
    fontSize: 12.5,
    color: SAC.muted,
    marginTop: 4,
    flex: 1,
  },
  alertBannerDismiss: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,148,0.10)',
  },
  alertBannerDismissText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    color: SAC.muted,
  },

  // VR4 — funnel
  funnelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: 16,
  },
  funnelTierWrap: {
    gap: 4,
  },
  funnelTier: {
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  funnelTierInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  funnelTierLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  funnelTierVal: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  funnelTierPct: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  funnelDropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  funnelDropText: {
    color: '#EF4444',
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  funnelInsightLbl: {
    color: SAC.dim,
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  funnelInsightBig: {
    color: SAC.text,
    fontSize: 26,
    fontFamily: FONTS.bold,
  },
  funnelInsightSub: {
    color: SAC.muted,
    fontSize: 12.5,
    marginTop: 4,
  },
  funnelInsightCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    gap: 4,
  },
  funnelInsightTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  funnelInsightBody: {
    color: SAC.muted,
    fontSize: 12.5,
    marginTop: 4,
  },

  // VR2 — geo legend
  geoLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SAC.border,
  },
  geoLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  geoLegendText: {
    color: SAC.muted,
    fontSize: 11.5,
  },

  // VR5 — horizontal page-flow chips (dossier)
  pageFlowWrap: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: SAC.panel2,
    borderWidth: 1,
    borderColor: SAC.border,
    gap: 6,
  },
  pageFlowTitle: {
    color: SAC.dim,
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  pageFlowChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: SAC.panel,
    borderWidth: 1,
    borderColor: SAC.border,
    gap: 1,
  },
  pageFlowChipHover: {
    borderColor: SAC.purple,
    backgroundColor: SAC.cardSolid,
  },
  pageFlowChipPath: {
    color: SAC.text,
    fontSize: 12,
    fontFamily: FONTS.bold,
    maxWidth: 160,
  },
  pageFlowChipMeta: {
    color: SAC.dim,
    fontSize: 10.5,
  },
});
