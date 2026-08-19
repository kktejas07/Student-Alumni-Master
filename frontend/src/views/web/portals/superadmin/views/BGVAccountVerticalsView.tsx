// @ts-nocheck
/**
 * BGVAccountVerticalsView.tsx
 * SuperAdmin — Account Verticals (Real vs Test vs Unregistered) & Background Verification (BGV) Engine.
 *
 * Implements:
 *   1. Account Verticals Analysis (Real accounts, Test accounts, Unregistered directory records)
 *   2. Standardized Identifiers (BGV ID, Student Alumni SA ID, Certificate Series ID)
 *   3. Interactive BGV Verification Portal & Digital Holographic Card Widget
 *   4. Actions: Toggle Test Status, Purge Sandbox Data, Send Claim Invites, Backfill IDs.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  ShieldCheck, ShieldAlert, Users, UserCheck, GraduationCap, Sparkles, Search,
  CheckCircle2, AlertTriangle, Trash2, RefreshCw, Copy, Check, ExternalLink,
  Award, FileText, QrCode, Mail, Phone, MapPin, Building2, Eye, ArrowRight,
  Filter, Shield, UserX, UserPlus, Send, Download, Sparkle, HelpCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  SearchField, StatusPill, Toast, useToast, EmptyState, LoadingBox, KpiTile,
} from '../applekit';
import { api, request } from '@/src/models/services/api';

type VerticalType = 'all' | 'real' | 'test' | 'unregistered';

export function BGVAccountVerticalsView() {
  const [vertical, setVertical] = useState<VerticalType>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // BGV Lookup Widget States
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [bgvCardModal, setBgvCardModal] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Purge & Backfill modals
  const [purgeModal, setPurgeModal] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);

  const { toast, flash, hide } = useToast();

  // Load analytics summary
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.getAccountAnalytics();
      setAnalytics(res);
    } catch (e: any) {
      console.warn('Failed to load account analytics', e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Load accounts list
  const loadList = useCallback(async (p = 1, vert = vertical, search = q) => {
    setBusy(true);
    try {
      const res = await api.listAccountsByVertical(vert, search, p, 25);
      setData(res);
      setPage(p);
    } catch (e: any) {
      console.warn('Failed to load accounts list', e);
      flash(e?.message || 'Failed to load accounts', 'error');
    } finally {
      setBusy(false);
    }
  }, [vertical, q, flash]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadList(1, vertical, q);
  }, [vertical, q]);

  // Handle BGV Lookup
  const handleLookup = async (identifier?: string) => {
    const term = (identifier || lookupQuery).trim();
    if (!term) {
      flash('Please enter a BGV ID, SA ID, Certificate Series ID, or Email', 'error');
      return;
    }
    setLookupBusy(true);
    try {
      const res = await api.lookupBGVRecord(term);
      setLookupResult(res);
      setBgvCardModal(res);
      flash('BGV Record Verified Successfully', 'success');
    } catch (e: any) {
      flash(e?.message || `No verification record found for "${term}"`, 'error');
    } finally {
      setLookupBusy(false);
    }
  };

  // Toggle Test Status
  const handleToggleTest = async (item: any) => {
    const nextState = !item.is_test;
    try {
      await api.toggleAccountTestStatus({
        id: item.id,
        collection: item.collection || 'users',
        is_test: nextState,
      });
      flash(`Marked ${item.name} as ${nextState ? 'Test Account' : 'Real Account'}`, 'success');
      loadList(page, vertical, q);
      loadAnalytics();
    } catch (e: any) {
      flash(e?.message || 'Failed to update status', 'error');
    }
  };

  // Backfill BGV IDs
  const handleBackfill = async () => {
    setBackfillBusy(true);
    try {
      const res = await api.backfillBGVIdentifiers();
      flash(`Successfully backfilled ${res.total_backfilled} BGV & SA IDs`, 'success');
      loadAnalytics();
      loadList(page, vertical, q);
    } catch (e: any) {
      flash(e?.message || 'Backfill failed', 'error');
    } finally {
      setBackfillBusy(false);
    }
  };

  // Purge Test Accounts
  const handlePurge = async () => {
    setPurgeBusy(true);
    try {
      const res = await api.purgeTestAccounts(true);
      flash(`Purged ${res.total_purged} test accounts from database`, 'success');
      setPurgeModal(false);
      loadAnalytics();
      loadList(1, vertical, q);
    } catch (e: any) {
      flash(e?.message || 'Purge failed', 'error');
    } finally {
      setPurgeBusy(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      flash('Copied to clipboard', 'info');
    }
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <View style={st.container}>
      <Toast toast={toast} onHide={hide} />

      {/* Top Header & Fast Actions */}
      <View style={st.headerRow}>
        <View>
          <Text style={st.title}>Account Verticals & BGV Engine</Text>
          <Text style={st.subtitle}>
            Categorize Real vs Test vs Unregistered records · Universal BGV ID, SA ID, & Certificate Series Verification
          </Text>
        </View>

        <View style={st.actionButtonsRow}>
          <Pressable
            style={[st.btnSecondary, backfillBusy && { opacity: 0.6 }]}
            onPress={handleBackfill}
            disabled={backfillBusy}
          >
            <RefreshCw size={15} color="#93C5FD" style={backfillBusy ? { transform: [{ rotate: '45deg' }] } : {}} />
            <Text style={st.btnSecondaryText}>
              {backfillBusy ? 'Backfilling...' : 'Sync BGV Identifiers'}
            </Text>
          </Pressable>

          <Pressable
            style={st.btnDanger}
            onPress={() => setPurgeModal(true)}
          >
            <Trash2 size={15} color="#FCA5A5" />
            <Text style={st.btnDangerText}>Purge Test Data</Text>
          </Pressable>
        </View>
      </View>

      {/* KPI Analytics Cards */}
      <View style={st.kpiGrid}>
        <Card style={[st.kpiCard, { borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
          <View style={st.kpiTop}>
            <View style={[st.kpiIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <UserCheck size={20} color="#34D399" />
            </View>
            <View style={[st.kpiBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[st.kpiBadgeText, { color: '#34D399' }]}>
                {analytics?.real_accounts?.percentage || 0}% of Total
              </Text>
            </View>
          </View>
          <Text style={st.kpiValue}>{analytics?.real_accounts?.count || 0}</Text>
          <Text style={st.kpiLabel}>Real Active Accounts</Text>
          <Text style={st.kpiDesc}>Registered platform students, alumni & mentors with credentials</Text>
        </Card>

        <Card style={[st.kpiCard, { borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
          <View style={st.kpiTop}>
            <View style={[st.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <AlertTriangle size={20} color="#FBBF24" />
            </View>
            <View style={[st.kpiBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Text style={[st.kpiBadgeText, { color: '#FBBF24' }]}>
                {analytics?.test_accounts?.percentage || 0}% Sandbox
              </Text>
            </View>
          </View>
          <Text style={st.kpiValue}>{analytics?.test_accounts?.count || 0}</Text>
          <Text style={st.kpiLabel}>Test / Sandbox Accounts</Text>
          <Text style={st.kpiDesc}>Mock profiles, @test.com accounts, & sandbox seed entries</Text>
        </Card>

        <Card style={[st.kpiCard, { borderColor: 'rgba(99, 102, 241, 0.35)' }]}>
          <View style={st.kpiTop}>
            <View style={[st.kpiIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Users size={20} color="#818CF8" />
            </View>
            <View style={[st.kpiBadge, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
              <Text style={[st.kpiBadgeText, { color: '#818CF8' }]}>
                {analytics?.unregistered_records?.percentage || 0}% Claimable
              </Text>
            </View>
          </View>
          <Text style={st.kpiValue}>{analytics?.unregistered_records?.count || 0}</Text>
          <Text style={st.kpiLabel}>Unregistered Records</Text>
          <Text style={st.kpiDesc}>Directory contacts, talent pool & event attendees in database</Text>
        </Card>

        <Card style={[st.kpiCard, { borderColor: 'rgba(236, 72, 153, 0.35)' }]}>
          <View style={st.kpiTop}>
            <View style={[st.kpiIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <ShieldCheck size={20} color="#F472B6" />
            </View>
            <View style={[st.kpiBadge, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
              <Text style={[st.kpiBadgeText, { color: '#F472B6' }]}>100% Verifiable</Text>
            </View>
          </View>
          <Text style={st.kpiValue}>
            {analytics?.bgv_metrics?.total_certificates_issued || 0}
          </Text>
          <Text style={st.kpiLabel}>Certificate Series Issued</Text>
          <Text style={st.kpiDesc}>SHA-256 authenticated credentials tied to BGV & SA IDs</Text>
        </Card>
      </View>

      {/* Visual Vertical Distribution Bar */}
      <View style={st.distBarCard}>
        <View style={st.distBarHeader}>
          <Text style={st.distBarTitle}>Database Composition Breakdown</Text>
          <Text style={st.distBarTotal}>Total Monitored: {analytics?.total_records || 0} entities</Text>
        </View>
        <View style={st.distTrack}>
          <View
            style={[
              st.distSegment,
              {
                width: `${analytics?.real_accounts?.percentage || 0}%`,
                backgroundColor: '#10B981',
              },
            ]}
          />
          <View
            style={[
              st.distSegment,
              {
                width: `${analytics?.test_accounts?.percentage || 0}%`,
                backgroundColor: '#F59E0B',
              },
            ]}
          />
          <View
            style={[
              st.distSegment,
              {
                width: `${analytics?.unregistered_records?.percentage || 0}%`,
                backgroundColor: '#6366F1',
              },
            ]}
          />
        </View>
        <View style={st.distLegend}>
          <View style={st.distLegendItem}>
            <View style={[st.distDot, { backgroundColor: '#10B981' }]} />
            <Text style={st.distLegendText}>Real Accounts ({analytics?.real_accounts?.count || 0})</Text>
          </View>
          <View style={st.distLegendItem}>
            <View style={[st.distDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={st.distLegendText}>Test Accounts ({analytics?.test_accounts?.count || 0})</Text>
          </View>
          <View style={st.distLegendItem}>
            <View style={[st.distDot, { backgroundColor: '#6366F1' }]} />
            <Text style={st.distLegendText}>Unregistered Directory Data ({analytics?.unregistered_records?.count || 0})</Text>
          </View>
        </View>
      </View>

      {/* BGV Universal Search & Verification Bar */}
      <Card style={st.bgvSearchWidget}>
        <View style={st.bgvWidgetTop}>
          <View style={st.bgvWidgetIcon}>
            <ShieldCheck size={26} color="#A78BFA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.bgvWidgetTitle}>Universal BGV (Background Verification) Lookup</Text>
            <Text style={st.bgvWidgetSubtitle}>
              Query by BGV ID (e.g. BGV-2026-XXXXX), SA ID (e.g. SA-STU-XXXXX), Certificate Series ID (e.g. CERT-SNIST-2026-XXXX), Email, or Roll Number
            </Text>
          </View>
        </View>

        <View style={st.bgvInputRow}>
          <View style={st.bgvInputWrap}>
            <Search size={18} color="#94A3B8" style={{ marginLeft: 14 }} />
            <TextInput
              style={st.bgvTextInput}
              value={lookupQuery}
              onChangeText={setLookupQuery}
              placeholder="Enter BGV ID, SA ID, Certificate Series ID, Roll No, or Email..."
              placeholderTextColor="#64748B"
              onSubmitEditing={() => handleLookup()}
            />
          </View>
          <Pressable
            style={[st.bgvSearchBtn, lookupBusy && { opacity: 0.7 }]}
            onPress={() => handleLookup()}
            disabled={lookupBusy}
          >
            {lookupBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ShieldCheck size={16} color="#FFFFFF" />
                <Text style={st.bgvSearchBtnText}>Verify Candidate</Text>
              </>
            )}
          </Pressable>
        </View>
      </Card>

      {/* Segmented Verticals Tabs & Table */}
      <View style={st.tableSection}>
        <View style={st.filterRow}>
          {/* Vertical Selectors */}
          <View style={st.tabGroup}>
            {[
              { id: 'all', label: 'All Records' },
              { id: 'real', label: 'Real Accounts 🟢' },
              { id: 'test', label: 'Test Accounts 🟡' },
              { id: 'unregistered', label: 'Unregistered Directory 🔵' },
            ].map((t) => {
              const active = vertical === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[st.tabBtn, active && st.tabBtnActive]}
                  onPress={() => {
                    setVertical(t.id as VerticalType);
                    setPage(1);
                  }}
                >
                  <Text style={[st.tabBtnText, active && st.tabBtnTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quick Search in table */}
          <View style={st.tableSearchWrap}>
            <Search size={16} color="#64748B" style={{ marginLeft: 12 }} />
            <TextInput
              style={st.tableSearchInput}
              value={q}
              onChangeText={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Search table by name, email, roll no, college..."
              placeholderTextColor="#64748B"
            />
            {q ? (
              <Pressable onPress={() => setQ('')} style={{ padding: 8 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Data Table */}
        <Card style={st.tableCard}>
          <View style={st.tableHeader}>
            <Text style={[st.th, { flex: 2.2 }]}>Candidate & Contact</Text>
            <Text style={[st.th, { flex: 1.4 }]}>Vertical & Role</Text>
            <Text style={[st.th, { flex: 1.8 }]}>SA ID / BGV ID</Text>
            <Text style={[st.th, { flex: 2.0 }]}>Institution & Academic</Text>
            <Text style={[st.th, { flex: 1.2 }]}>Cert Series</Text>
            <Text style={[st.th, { flex: 1.8, textAlign: 'right' }]}>Actions</Text>
          </View>

          {busy ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#818CF8" />
              <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 13 }}>Loading accounts data...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={{ padding: 50, alignItems: 'center' }}>
              <Users size={40} color="#475569" />
              <Text style={{ color: '#E2E8F0', marginTop: 12, fontSize: 15, fontWeight: '600' }}>No records found</Text>
              <Text style={{ color: '#64748B', marginTop: 4, fontSize: 13 }}>Try adjusting your vertical filter or search term</Text>
            </View>
          ) : (
            items.map((item: any, idx: number) => {
              const isReal = item.vertical === 'real';
              const isTest = item.vertical === 'test';
              const isUnreg = item.vertical === 'unregistered';

              return (
                <View key={item.id || idx} style={st.tableRow}>
                  {/* Candidate Name & Email */}
                  <View style={{ flex: 2.2 }}>
                    <Text style={st.tdName}>{item.name}</Text>
                    <Text style={st.tdEmail}>{item.email || 'No email'}</Text>
                    {item.phone ? <Text style={st.tdSub}>{item.phone}</Text> : null}
                  </View>

                  {/* Vertical & Role */}
                  <View style={{ flex: 1.4, justifyContent: 'center' }}>
                    <View style={[
                      st.verticalBadge,
                      isReal && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' },
                      isTest && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' },
                      isUnreg && { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' },
                    ]}>
                      <Text style={[
                        st.verticalBadgeText,
                        isReal && { color: '#34D399' },
                        isTest && { color: '#FBBF24' },
                        isUnreg && { color: '#818CF8' },
                      ]}>
                        {isReal ? 'Real Member' : (isTest ? 'Sandbox Test' : 'Unregistered')}
                      </Text>
                    </View>
                    <Text style={st.tdSubRole}>{item.role || 'Student'}</Text>
                  </View>

                  {/* SA ID & BGV ID */}
                  <View style={{ flex: 1.8, justifyContent: 'center' }}>
                    <Pressable
                      style={st.idChip}
                      onPress={() => copyToClipboard(item.sa_id, `sa-${item.id}`)}
                    >
                      <Text style={st.idChipLabel}>SA:</Text>
                      <Text style={st.idChipValue}>{item.sa_id}</Text>
                      {copiedKey === `sa-${item.id}` ? <Check size={12} color="#10B981" /> : <Copy size={11} color="#64748B" />}
                    </Pressable>

                    <Pressable
                      style={[st.idChip, { marginTop: 4 }]}
                      onPress={() => copyToClipboard(item.bgv_id, `bgv-${item.id}`)}
                    >
                      <Text style={[st.idChipLabel, { color: '#F472B6' }]}>BGV:</Text>
                      <Text style={[st.idChipValue, { color: '#FBCFE8' }]}>{item.bgv_id}</Text>
                      {copiedKey === `bgv-${item.id}` ? <Check size={12} color="#10B981" /> : <Copy size={11} color="#64748B" />}
                    </Pressable>
                  </View>

                  {/* Institution & Academic */}
                  <View style={{ flex: 2.0, justifyContent: 'center' }}>
                    <Text style={st.tdCollege} numberOfLines={1}>{item.college || 'Universal Registry'}</Text>
                    <Text style={st.tdSub}>
                      {[item.degree, item.graduation_year].filter(Boolean).join(' · ') || 'Degree In Progress'}
                    </Text>
                  </View>

                  {/* Cert Series */}
                  <View style={{ flex: 1.2, justifyContent: 'center' }}>
                    {item.certificates_count > 0 ? (
                      <View style={st.certPill}>
                        <Award size={12} color="#FBBF24" />
                        <Text style={st.certPillText}>{item.certificates_count} Series</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#475569', fontSize: 11 }}>None Issued</Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={{ flex: 1.8, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <Pressable
                      style={st.verifyBtn}
                      onPress={() => handleLookup(item.bgv_id || item.sa_id || item.email)}
                    >
                      <ShieldCheck size={13} color="#93C5FD" />
                      <Text style={st.verifyBtnText}>BGV Card</Text>
                    </Pressable>

                    <Pressable
                      style={[st.testToggleBtn, isTest && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                      onPress={() => handleToggleTest(item)}
                    >
                      <Text style={[st.testToggleBtnText, isTest && { color: '#F87171' }]}>
                        {isTest ? 'Mark Real' : 'Mark Test'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          {/* Pagination */}
          <View style={st.paginationRow}>
            <Text style={st.paginationText}>
              Showing page {page} of {pages} ({total} total records)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[st.pageBtn, page <= 1 && { opacity: 0.4 }]}
                disabled={page <= 1}
                onPress={() => loadList(page - 1)}
              >
                <Text style={st.pageBtnText}>Previous</Text>
              </Pressable>
              <Pressable
                style={[st.pageBtn, page >= pages && { opacity: 0.4 }]}
                disabled={page >= pages}
                onPress={() => loadList(page + 1)}
              >
                <Text style={st.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>

      {/* ================================================================= */}
      {/* Interactive Digital BGV Verification Card Modal                   */}
      {/* ================================================================= */}
      {bgvCardModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setBgvCardModal(null)}
        >
          <View style={st.modalOverlay}>
            <Animated.View entering={FadeInUp.duration(200)} style={st.bgvModalCard}>
              {/* Modal Top Bar */}
              <View style={st.bgvModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} color="#34D399" />
                  <Text style={st.bgvModalHeaderTitle}>Official Background Verification Card</Text>
                </View>
                <Pressable onPress={() => setBgvCardModal(null)} style={st.closeModalBtn}>
                  <Text style={{ color: '#94A3B8', fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>

              {/* Digital Holographic Card */}
              <View style={st.hologramCard}>
                <LinearGradient
                  colors={['#1E1B4B', '#0F172A', '#111827']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.hologramGrad}
                >
                  {/* Watermark Logo & Trust Stamp */}
                  <View style={st.holoTopRow}>
                    <View>
                      <Text style={st.holoOrgName}>STUDENT ALUMNI NETWORK</Text>
                      <Text style={st.holoSubtitle}>NATIONAL CREDENTIAL & BGV REGISTRY</Text>
                    </View>
                    <View style={st.trustBadge}>
                      <ShieldCheck size={14} color="#34D399" />
                      <Text style={st.trustBadgeText}>{bgvCardModal.trust_level} VERIFIED</Text>
                    </View>
                  </View>

                  {/* Candidate Primary Identity */}
                  <View style={st.holoCandidateRow}>
                    <View style={st.holoAvatarBox}>
                      <Text style={st.holoAvatarText}>
                        {(bgvCardModal.candidate_info?.name || 'SA')[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.holoCandidateName}>{bgvCardModal.candidate_info?.name}</Text>
                      <Text style={st.holoCandidateSub}>
                        {bgvCardModal.candidate_info?.role?.toUpperCase()} · {bgvCardModal.candidate_info?.location}
                      </Text>
                      <Text style={st.holoCandidateEmail}>{bgvCardModal.candidate_info?.email}</Text>
                    </View>
                  </View>

                  {/* Standardized Identifier Triplets Box */}
                  <View style={st.identifierGrid}>
                    <View style={st.idBox}>
                      <Text style={st.idBoxLabel}>BGV ID (Screening)</Text>
                      <Text style={[st.idBoxValue, { color: '#F472B6' }]}>
                        {bgvCardModal.identifiers?.bgv_id}
                      </Text>
                    </View>

                    <View style={st.idBox}>
                      <Text style={st.idBoxLabel}>SA Account ID</Text>
                      <Text style={[st.idBoxValue, { color: '#60A5FA' }]}>
                        {bgvCardModal.identifiers?.sa_id}
                      </Text>
                    </View>

                    <View style={st.idBox}>
                      <Text style={st.idBoxLabel}>Primary Cert Series</Text>
                      <Text style={[st.idBoxValue, { color: '#FBBF24' }]}>
                        {bgvCardModal.identifiers?.primary_certificate_series_id}
                      </Text>
                    </View>
                  </View>

                  {/* Verification Badges Checklist */}
                  <View style={st.checksGrid}>
                    <View style={st.checkItem}>
                      <CheckCircle2 size={15} color="#34D399" />
                      <Text style={st.checkText}>Identity & Record Authenticity: <Text style={{ color: '#34D399' }}>PASSED</Text></Text>
                    </View>
                    <View style={st.checkItem}>
                      <CheckCircle2 size={15} color="#34D399" />
                      <Text style={st.checkText}>Academic Institution: <Text style={{ color: '#E2E8F0' }}>{bgvCardModal.candidate_info?.college}</Text></Text>
                    </View>
                    <View style={st.checkItem}>
                      <CheckCircle2 size={15} color="#34D399" />
                      <Text style={st.checkText}>
                        Linked Certificate Series: <Text style={{ color: '#FBBF24' }}>
                          {bgvCardModal.identifiers?.all_certificate_series?.length || 0} Verified Credentials
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* Footer & Public URL */}
                  <View style={st.holoFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.footerUrlLabel}>Public Verification Link:</Text>
                      <Text style={st.footerUrlValue}>{bgvCardModal.public_verification_url}</Text>
                    </View>
                    <Pressable
                      style={st.copyUrlBtn}
                      onPress={() => copyToClipboard(bgvCardModal.public_verification_url, 'card-url')}
                    >
                      <Copy size={13} color="#93C5FD" />
                      <Text style={st.copyUrlBtnText}>
                        {copiedKey === 'card-url' ? 'Copied!' : 'Copy URL'}
                      </Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>

              {/* Linked Certificate Series Details */}
              {bgvCardModal.verification_checks?.credentials_verification?.records?.length > 0 && (
                <View style={st.modalCertsSection}>
                  <Text style={st.modalCertsSectionTitle}>Linked Authenticated Certificate Series</Text>
                  {bgvCardModal.verification_checks.credentials_verification.records.map((cert: any, cIdx: number) => (
                    <View key={cIdx} style={st.modalCertItem}>
                      <Award size={18} color="#FBBF24" />
                      <View style={{ flex: 1 }}>
                        <Text style={st.modalCertTitle}>{cert.title}</Text>
                        <Text style={st.modalCertSeries}>Series ID: {cert.series_id} · SHA-256 Hash: {cert.verification_hash}</Text>
                      </View>
                      <View style={st.certValidBadge}>
                        <Text style={st.certValidBadgeText}>VALIDATED</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Purge Confirmation Modal */}
      {purgeModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPurgeModal(false)}
        >
          <View style={st.modalOverlay}>
            <View style={st.purgeModalCard}>
              <View style={st.purgeIconWrap}>
                <Trash2 size={24} color="#EF4444" />
              </View>
              <Text style={st.purgeModalTitle}>Purge Sandbox Test Accounts?</Text>
              <Text style={st.purgeModalDesc}>
                This will safely remove identified test accounts (e.g. @test.com, @example.com, and accounts flagged with is_test: true) from the database. Real user data is untouched.
              </Text>
              <View style={st.purgeModalBtns}>
                <Pressable
                  style={st.purgeCancelBtn}
                  onPress={() => setPurgeModal(false)}
                >
                  <Text style={st.purgeCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[st.purgeConfirmBtn, purgeBusy && { opacity: 0.6 }]}
                  onPress={handlePurge}
                  disabled={purgeBusy}
                >
                  <Text style={st.purgeConfirmBtnText}>
                    {purgeBusy ? 'Purging...' : 'Yes, Purge Test Data'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  btnSecondaryText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnDangerText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kpiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  kpiLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  kpiDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  distBarCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: 20,
  },
  distBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  distBarTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  distBarTotal: {
    color: '#94A3B8',
    fontSize: 12,
  },
  distTrack: {
    height: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  distSegment: {
    height: '100%',
  },
  distLegend: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  distLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distLegendText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  bgvSearchWidget: {
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 22,
  },
  bgvWidgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  bgvWidgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  bgvWidgetTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bgvWidgetSubtitle: {
    color: '#C4B5FD',
    fontSize: 12,
    marginTop: 2,
  },
  bgvInputRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  bgvInputWrap: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  bgvTextInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  bgvSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
  },
  bgvSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tableSection: {
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    width: 280,
  },
  tableSearchInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  tableCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  th: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.08)',
  },
  tdName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tdEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  tdSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  verticalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  verticalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tdSubRole: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  idChipLabel: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '700',
  },
  idChipValue: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tdCollege: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  certPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  certPillText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  verifyBtnText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  testToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  testToggleBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  paginationText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  pageBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  bgvModalCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  bgvModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  bgvModalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeModalBtn: {
    padding: 6,
  },
  hologramCard: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  hologramGrad: {
    padding: 20,
  },
  holoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  holoOrgName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  holoSubtitle: {
    color: '#94A3B8',
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  trustBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  holoCandidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  holoAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  holoAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  holoCandidateName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  holoCandidateSub: {
    color: '#C4B5FD',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  holoCandidateEmail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  identifierGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  idBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  idBoxLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  idBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  checksGrid: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  holoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerUrlLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  footerUrlValue: {
    color: '#93C5FD',
    fontSize: 11,
  },
  copyUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyUrlBtnText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  modalCertsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalCertsSectionTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalCertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  modalCertTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalCertSeries: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  certValidBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  certValidBadgeText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700',
  },

  // Purge Modal
  purgeModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  purgeIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  purgeModalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  purgeModalDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  purgeModalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  purgeCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
  },
  purgeCancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  purgeConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  purgeConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
