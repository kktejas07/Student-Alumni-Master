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

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Radar, Users, Globe, Monitor, Smartphone, Laptop, Cpu, HardDrive,
  Sparkles, Eye, Clock, Download, RefreshCw, Search, Filter, ShieldCheck,
  UserX, UserCheck, ExternalLink, ChevronRight, Activity, Zap, Compass,
  Layers, MapPin, Hash, MousePointer, X, CheckCircle2, Server, HelpCircle
} from 'lucide-react-native';

import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Card, GRAD, SecondaryButton, GradientButton, StatusPill, TopTabs } from '../applekit';
import { getBaseUrl } from '@/src/lib/env';
import { request } from '@/src/models/services/api';

const BASE_URL = getBaseUrl();

type TabId = 'live' | 'modules' | 'hardware' | 'geo' | 'acquisition';

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

  // Modular Analytics Data
  const [modularData, setModularData] = useState<any[]>([]);
  const [hardwareData, setHardwareData] = useState<any>(null);

  // Selected Visitor for Dossier Modal
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

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
  }, [fetchLiveRadar, fetchVisitorsList, fetchModularAnalytics, fetchHardwareAnalytics]);

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

  return (
    <View style={s.container}>
      {/* ── Header Title & Radar Status Bar ───────────────────────────────── */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.radarPill}>
              <View style={s.radarDotPulse} />
              <Text style={s.radarPillText}>LIVE RADAR ACTIVE</Text>
            </View>
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
          onChange={(id) => setActiveTab(id as TabId)}
          tabs={[
            { id: 'live', label: 'Live Visitors & Stream', icon: Radar, count: summary.total_live },
            { id: 'modules', label: 'Modular Platform Analytics', icon: Layers },
            { id: 'hardware', label: 'Hardware & Device Intelligence', icon: Monitor },
            { id: 'geo', label: 'Geographic Traffic Map', icon: Globe },
            { id: 'acquisition', label: 'Acquisition & UTM Campaigns', icon: Compass },
          ]}
        />
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
                {['all', 'landing', 'courses', 'events', 'deals', 'auth'].map((m) => (
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
                            <Eye size={13} color="#fff" />
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
          TAB 4: GEOGRAPHIC INTELLIGENCE
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'geo' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            <Text style={s.sectionH1}>Geographic Traffic Intelligence</Text>
            <Text style={s.sectionSub}>Global visitor origin resolved via IP telemetry.</Text>
          </View>

          <View style={s.geoGrid}>
            <Card style={{ flex: 1, minWidth: 320 }}>
              <Text style={s.hwCardTitle}>Top Countries (Last 90 Days)</Text>
              <View style={{ gap: 10, marginTop: 14 }}>
                {visitorsList.slice(0, 8).map((v) => {
                  const geo = v.geo || {};
                  return (
                    <View key={v.session_id} style={s.geoCountryRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 20 }}>{getCountryFlag(geo.country_code)}</Text>
                        <View>
                          <Text style={{ color: SAC.text, fontSize: 13.5, fontFamily: FONTS.med }}>
                            {geo.country || 'Global Visitor'}
                          </Text>
                          <Text style={{ color: SAC.muted, fontSize: 12 }}>
                            {geo.city || 'Unknown City'} • IP: {v.ip}
                          </Text>
                        </View>
                      </View>
                      <StatusPill label={v.current_module?.toUpperCase() || 'LANDING'} kind="brand" />
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 5: ACQUISITION & UTM CAMPAIGNS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'acquisition' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
          <View>
            <Text style={s.sectionH1}>Acquisition Channels & UTM Attribution</Text>
            <Text style={s.sectionSub}>Where visitors originate: direct, organic search, campaigns, or referring portals.</Text>
          </View>

          <View style={s.hwGrid}>
            <Card style={s.hwCard}>
              <Text style={s.hwCardTitle}>Top Referring URLs</Text>
              <View style={{ gap: 10, marginTop: 14 }}>
                {visitorsList.filter(v => !!v.referrer).slice(0, 6).map((v) => (
                  <View key={v.session_id} style={s.gpuRow}>
                    <Text style={s.gpuText} numberOfLines={1}>{v.referrer}</Text>
                    <Text style={s.gpuCount}>{v.current_module}</Text>
                  </View>
                ))}
                {visitorsList.filter(v => !!v.referrer).length === 0 && (
                  <Text style={{ color: SAC.muted, fontSize: 13 }}>Majority direct navigation & bookmarks.</Text>
                )}
              </View>
            </Card>

            <Card style={s.hwCard}>
              <Text style={s.hwCardTitle}>Landing Pages</Text>
              <View style={{ gap: 10, marginTop: 14 }}>
                {visitorsList.slice(0, 6).map((v) => (
                  <View key={v.session_id} style={s.gpuRow}>
                    <Text style={s.gpuText} numberOfLines={1}>{v.landing_page || v.current_path || '/'}</Text>
                    <Text style={s.gpuCount}>{v.page_views_count} views</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
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
                <X size={18} color="#fff" />
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

// ── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    gap: 16,
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
  radarDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  radarPillText: {
    color: '#10B981',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    borderTopColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    borderBottomColor: 'rgba(255,255,255,0.04)',
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
    borderBottomColor: 'rgba(255,255,255,0.04)',
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
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dossierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
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
});
