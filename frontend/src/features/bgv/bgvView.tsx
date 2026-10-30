// types BGVMainTab/VerticalType/LinkedInFilterType + the BGVAccountVerticalsView component (7 subsystem tabs: directory, scanner, fake-unis, visa-radar, enterprise-keys, api-register, claim-reminders) — split verbatim from BGVAccountVerticalsView.tsx (audit Step 6d).
// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { ShieldCheck, Users, UserCheck, Sparkles, Search, CheckCircle2, AlertTriangle, Trash2, RefreshCw, Copy, Check, ExternalLink, Award, Mail, Phone, Filter, Send, Download, Globe, Edit3, BellRing, PlayCircle, Layers, XCircle, AlertCircle, Zap, Key } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSAC, FONTS, resolveColors } from '@/src/views/web/portals/superadmin/tokens';
import { Card, Toast, useToast } from '@/src/views/web/portals/superadmin/applekit';
import { api, request } from '@/src/models/services/api';
import { LinkedinGlyph } from './bgvGlyph';
import { st } from './bgvStyles';

export type BGVMainTab = 'directory' | 'scanner' | 'fake_unis' | 'api_register' | 'reminders';
export type VerticalType = 'all' | 'real' | 'test' | 'unregistered';
export type LinkedInFilterType = 'all' | 'yes' | 'no';

export function BGVAccountVerticalsView() {
  const T = useSAC();
  Object.assign(st, resolveColors(st, T));
  const [bgvTab, setBgvTab] = useState<BGVMainTab>('directory');
  const [vertical, setVertical] = useState<VerticalType>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [linkedInFilter, setLinkedInFilter] = useState<LinkedInFilterType>('all');
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
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Purge & Backfill modals
  const [purgeModal, setPurgeModal] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [enrichBusy, setEnrichBusy] = useState(false);

  // Monthly Reminders State
  const [remindersStatus, setRemindersStatus] = useState<any>(null);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersBaseUrl, setRemindersBaseUrl] = useState('https://studentalumni.ai/claim');
  const [remindersSubject, setRemindersSubject] = useState('Claim & Activate Your Verified Student Alumni Account ({sa_id})');
  const [remindersInterval, setRemindersInterval] = useState('30');
  const [remindersAutoEnabled, setRemindersAutoEnabled] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [singleSendingId, setSingleSendingId] = useState<string | null>(null);

  // Profile Edit Modal State
  const [editProfileModal, setEditProfileModal] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'India',
    location: '',
    linkedin_url: '',
    college: '',
    degree: '',
    graduation_year: '',
    roll_number: '',
  });
  const [editBusy, setEditBusy] = useState(false);

  // BGV Integrations Register State
  const [providersData, setProvidersData] = useState<any>(null);
  const [providersBusy, setProvidersBusy] = useState(false);

  // UGC Fake Universities State
  const [fakeUnisList, setFakeUnisList] = useState<any[]>([]);
  const [fakeUniSearch, setFakeUniSearch] = useState('');
  const [fakeUnisBusy, setFakeUnisBusy] = useState(false);

  // Comprehensive Multi-Tier Scan State
  const [scanForm, setScanForm] = useState({
    name: '',
    email: '',
    college: '',
    degree: '',
    country: 'India',
    pan: '',
    uan: '',
    dob: '',
    location: '',
  });
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanBusy, setScanBusy] = useState(false);

  // 5 BGV Enhancements State
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgePreview, setPurgePreview] = useState<any>(null);
  const [visaReadiness, setVisaReadiness] = useState<any>(null);
  const [visaBusy, setVisaBusy] = useState(false);
  const [claimCampaignBusy, setClaimCampaignBusy] = useState(false);

  // Enterprise API Keys State
  const [apiKeysList, setApiKeysList] = useState<any[]>([]);
  const [apiKeysBusy, setApiKeysBusy] = useState(false);
  const [genKeyOrgName, setGenKeyOrgName] = useState('');
  const [genKeyWebhook, setGenKeyWebhook] = useState('');
  const [newKeyModal, setNewKeyModal] = useState<any>(null);

  const fetchApiKeys = useCallback(async () => {
    setApiKeysBusy(true);
    try {
      const res = await request<any>('/bgv/admin/api-keys');
      if (res && res.api_keys) setApiKeysList(res.api_keys);
    } catch (e: any) {
      console.warn('Failed to load BGV API Keys', e);
    } finally {
      setApiKeysBusy(false);
    }
  }, []);

  const handleGenerateApiKey = async () => {
    if (!genKeyOrgName.trim()) {
      flash('Please enter organization name', 'error');
      return;
    }
    setApiKeysBusy(true);
    try {
      const res = await request<any>('/bgv/admin/api-keys/generate', {
        method: 'POST',
        body: {
          org_name: genKeyOrgName.trim(),
          webhook_url: genKeyWebhook.trim() || undefined
        }
      });
      setNewKeyModal(res.api_key);
      setGenKeyOrgName('');
      setGenKeyWebhook('');
      flash('Enterprise BGV API Key Generated!', 'success');
      fetchApiKeys();
    } catch (e: any) {
      flash(e?.message || 'Failed to generate API Key', 'error');
    } finally {
      setApiKeysBusy(false);
    }
  };

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
  const loadList = useCallback(async (p = 1, vert = vertical, search = q, ctry = countryFilter, li = linkedInFilter) => {
    setBusy(true);
    try {
      const res = await api.listAccountsByVertical(vert, search, p, 25, ctry, li);
      setData(res);
      setPage(p);
    } catch (e: any) {
      console.warn('Failed to load accounts list', e);
      flash(e?.message || 'Failed to load accounts', 'error');
    } finally {
      setBusy(false);
    }
  }, [vertical, q, countryFilter, linkedInFilter, flash]);

  // Load reminders configuration
  const loadRemindersStatus = useCallback(async () => {
    try {
      const res = await api.getMonthlyRemindersStatus();
      setRemindersStatus(res);
      if (res) {
        setRemindersBaseUrl(res.claim_base_url || 'https://studentalumni.ai/claim');
        setRemindersSubject(res.subject_template || 'Claim & Activate Your Verified Student Alumni Account ({sa_id})');
        setRemindersInterval(String(res.interval_days || 30));
        setRemindersAutoEnabled(res.auto_reminders_enabled !== false);
      }
    } catch (e) {
      console.warn('Failed to load reminder settings', e);
    }
  }, []);

  // Load Providers Register
  const loadProvidersRegister = useCallback(async () => {
    setProvidersBusy(true);
    try {
      const res = await api.getBGVProvidersRegister();
      setProvidersData(res);
    } catch (e: any) {
      console.warn('Failed to load providers register', e);
    } finally {
      setProvidersBusy(false);
    }
  }, []);

  // Load Fake Universities
  const loadFakeUniversities = useCallback(async (searchQuery = '') => {
    setFakeUnisBusy(true);
    try {
      const res = await api.listFakeUniversities(searchQuery);
      setFakeUnisList(res?.items || []);
    } catch (e: any) {
      console.warn('Failed to load fake universities list', e);
    } finally {
      setFakeUnisBusy(false);
    }
  }, []);

  // Load Visa Readiness Radar Data
  const loadVisaReadiness = useCallback(async () => {
    setVisaBusy(true);
    try {
      const res = await request<any>('/bgv/admin/visa-readiness');
      if (res && res.countries) setVisaReadiness(res);
    } catch (e: any) {
      console.warn('Failed to load visa readiness data', e);
    } finally {
      setVisaBusy(false);
    }
  }, []);

  // Handle Purging Test Accounts
  const handlePurgeTestAccounts = async (dryRun = true) => {
    setPurgeBusy(true);
    try {
      const res = await request<any>('/bgv/admin/purge-test-accounts', {
        method: 'POST',
        body: { dry_run: dryRun }
      });
      if (dryRun) {
        setPurgePreview(res);
        setPurgeModalOpen(true);
        flash(res.message || `Found ${res.total_test_accounts_found} test accounts`, 'info');
      } else {
        setPurgeModalOpen(false);
        flash(res.message || 'Test accounts purged successfully', 'success');
        loadAnalytics();
        loadList(1, vertical, q, countryFilter, linkedInFilter);
      }
    } catch (e: any) {
      flash(e?.message || 'Purge action failed', 'error');
    } finally {
      setPurgeBusy(false);
    }
  };

  // Handle Launching Claim Campaign
  const handleLaunchClaimCampaign = async () => {
    setClaimCampaignBusy(true);
    try {
      const res = await request<any>('/bgv/admin/send-claim-invites', {
        method: 'POST',
        body: { target_group: 'unregistered_attendees' }
      });
      flash(res.message || 'Verification & claim email invites dispatched!', 'success');
      loadAnalytics();
    } catch (e: any) {
      flash(e?.message || 'Failed to dispatch claim campaign', 'error');
    } finally {
      setClaimCampaignBusy(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadRemindersStatus();
    loadProvidersRegister();
    loadFakeUniversities();
    loadVisaReadiness();
    fetchApiKeys();
  }, [loadAnalytics, loadRemindersStatus, loadProvidersRegister, loadFakeUniversities, loadVisaReadiness, fetchApiKeys]);

  useEffect(() => {
    loadList(1, vertical, q, countryFilter, linkedInFilter);
  }, [vertical, q, countryFilter, linkedInFilter]);

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

  // Trigger PDF Report Download
  const handleDownloadPdf = async (identifier: string) => {
    if (!identifier) return;
    setPdfDownloading(true);
    try {
      const targetUrl = `/bgv/report/pdf/${encodeURIComponent(identifier)}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = `BGV_Report_${identifier}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        flash('Official Stamped BGV PDF Report Downloaded!', 'success');
      }
    } catch (e: any) {
      flash('Failed to download PDF report', 'error');
    } finally {
      setPdfDownloading(false);
    }
  };

  // Run Multi-Tier Scan
  const handleRunComprehensiveScan = async (candidateData?: any) => {
    const payload = candidateData || scanForm;
    if (!payload.name) {
      flash('Please enter candidate name', 'error');
      return;
    }
    setScanBusy(true);
    try {
      const res = await api.runComprehensiveBGVScan(payload);
      setScanResult(res);
      if (res.overall_status === 'VERIFIED') {
        flash('Comprehensive Scan Completed — All Checks Cleared!', 'success');
      } else if (res.overall_status === 'FLAGGED_FOR_HUMAN_REVIEW') {
        flash('Candidate Flagged for Human Review Queue', 'info');
      } else {
        flash('Critical Risk Detected: Potential Fake Institution / Degree Mill', 'error');
      }
    } catch (e: any) {
      flash(e?.message || 'Scan failed', 'error');
    } finally {
      setScanBusy(false);
    }
  };

  // Open candidate scan tab
  const openScanForCandidate = (item: any) => {
    const form = {
      name: item.name || '',
      email: item.email || '',
      college: item.college || '',
      degree: item.degree || '',
      country: item.country || 'India',
      pan: '',
      uan: '',
      dob: '',
      location: item.location || '',
    };
    setScanForm(form);
    setScanResult(null);
    setBgvTab('scanner');
    handleRunComprehensiveScan(form);
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
      loadList(page, vertical, q, countryFilter, linkedInFilter);
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
      loadList(page, vertical, q, countryFilter, linkedInFilter);
    } catch (e: any) {
      flash(e?.message || 'Backfill failed', 'error');
    } finally {
      setBackfillBusy(false);
    }
  };

  // Auto-Enrich Geolocation & LinkedIn
  const handleAutoEnrich = async () => {
    setEnrichBusy(true);
    try {
      const res = await api.autoEnrichProfiles();
      flash(res.message || 'Auto-enrichment completed', 'success');
      loadAnalytics();
      loadList(page, vertical, q, countryFilter, linkedInFilter);
    } catch (e: any) {
      flash(e?.message || 'Auto-enrichment failed', 'error');
    } finally {
      setEnrichBusy(false);
    }
  };

  // Save Monthly Reminders Settings
  const handleSaveRemindersSettings = async () => {
    setRemindersBusy(true);
    try {
      await api.updateMonthlyRemindersSettings({
        auto_reminders_enabled: remindersAutoEnabled,
        interval_days: parseInt(remindersInterval, 10) || 30,
        claim_base_url: remindersBaseUrl,
        subject_template: remindersSubject,
        test_email: testEmailAddress || undefined,
      });
      flash('Monthly reminder settings saved successfully', 'success');
      loadRemindersStatus();
      loadAnalytics();
    } catch (e: any) {
      flash(e?.message || 'Failed to save settings', 'error');
    } finally {
      setRemindersBusy(false);
    }
  };

  // Run Batch Monthly Reminders Broadcast
  const handleRunMonthlyRemindersBroadcast = async () => {
    setRemindersBusy(true);
    try {
      const res = await api.runMonthlyReminders({ limit: 500 });
      flash(`Dispatched ${res.dispatched_count} monthly claim notification emails!`, 'success');
      loadRemindersStatus();
      loadAnalytics();
      loadList(page, vertical, q, countryFilter, linkedInFilter);
    } catch (e: any) {
      flash(e?.message || 'Broadcast failed', 'error');
    } finally {
      setRemindersBusy(false);
    }
  };

  // Send Single Claim Email
  const handleSendSingleClaim = async (item: any) => {
    setSingleSendingId(item.id);
    try {
      const res = await api.sendSingleClaimEmail({
        id: item.id,
        collection: item.collection || 'users',
        email: item.email,
      });
      flash(`Claim notification email sent to ${item.email}`, 'success');
      loadList(page, vertical, q, countryFilter, linkedInFilter);
      loadAnalytics();
    } catch (e: any) {
      flash(e?.message || 'Failed to send claim email', 'error');
    } finally {
      setSingleSendingId(null);
    }
  };

  // Open Edit Profile Modal
  const openEditModal = (item: any) => {
    setEditProfileModal(item);
    setEditForm({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      country: item.country || 'India',
      location: item.location || '',
      linkedin_url: item.linkedin_url || '',
      college: item.college || '',
      degree: item.degree || '',
      graduation_year: item.graduation_year || '',
      roll_number: item.roll_number || '',
    });
  };

  // Save Edited Profile
  const handleSaveProfile = async () => {
    if (!editProfileModal) return;
    setEditBusy(true);
    try {
      await api.updateAccountProfile({
        id: editProfileModal.id,
        collection: editProfileModal.collection || 'users',
        ...editForm,
      });
      flash('Profile updated successfully', 'success');
      setEditProfileModal(null);
      loadList(page, vertical, q, countryFilter, linkedInFilter);
      loadAnalytics();
    } catch (e: any) {
      flash(e?.message || 'Failed to update profile', 'error');
    } finally {
      setEditBusy(false);
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
      loadList(1, vertical, q, countryFilter, linkedInFilter);
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
          <Text style={st.title}>Background Verification (BGV) & Account Intelligence Hub</Text>
          <Text style={st.subtitle}>
            Multi-Tier Verifiers (Tier 0 / 1 / 2) · UGC Degree-Mill Blacklist · Automated Scanner · Stamped PDF Reports with QR Code
          </Text>
        </View>

        <View style={st.actionButtonsRow}>
          <Pressable
            style={[st.btnSecondary, enrichBusy && { opacity: 0.6 }]}
            onPress={handleAutoEnrich}
            disabled={enrichBusy}
          >
            <Sparkles size={15} color="#A78BFA" />
            <Text style={[st.btnSecondaryText, { color: '#C4B5FD' }]}>
              {enrichBusy ? 'Enriching...' : 'Auto-Enrich Geolocation'}
            </Text>
          </Pressable>

          <Pressable
            style={[st.btnSecondary, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }, claimCampaignBusy && { opacity: 0.6 }]}
            onPress={handleLaunchClaimCampaign}
            disabled={claimCampaignBusy}
          >
            <Send size={15} color="#10B981" />
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '700' }}>
              {claimCampaignBusy ? 'Dispatching...' : 'Launch Claim Campaign'}
            </Text>
          </Pressable>

          <Pressable
            style={[st.btnSecondary, backfillBusy && { opacity: 0.6 }]}
            onPress={handleBackfill}
            disabled={backfillBusy}
          >
            <RefreshCw size={15} color="#93C5FD" style={backfillBusy ? { transform: [{ rotate: '45deg' }] } : {}} />
            <Text style={st.btnSecondaryText}>
              {backfillBusy ? 'Backfilling...' : 'Sync BGV IDs'}
            </Text>
          </Pressable>

          <Pressable
            style={[st.btnDanger, purgeBusy && { opacity: 0.6 }]}
            onPress={() => handlePurgeTestAccounts(true)}
            disabled={purgeBusy}
          >
            <Trash2 size={15} color="#FCA5A5" />
            <Text style={st.btnDangerText}>
              {purgeBusy ? 'Scanning...' : 'Clean Sandbox Data'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* High-Level BGV Subsystem Tab Navigation */}
      <View style={st.mainSubNav}>
        {[
          { id: 'directory', label: 'Directory & Verticals', icon: Users, badge: `${analytics?.total_records || 0}` },
          { id: 'visa_radar', label: 'Global Visa & Study-Abroad Radar', icon: Globe, badge: 'WeHive Perks' },
          { id: 'enterprise_keys', label: 'Enterprise API Keys & Webhooks', icon: Key, badge: 'Webhooks' },
          { id: 'scanner', label: '5-Tier BGV Scanner', icon: Zap, badge: 'Live' },
          { id: 'fake_unis', label: 'UGC Fake Uni Blacklist', icon: AlertCircle, badge: `${fakeUnisList.length || 22}` },
          { id: 'api_register', label: 'API Register & Tiers', icon: Layers, badge: 'Tier 0/1/2' },
          { id: 'reminders', label: 'Claim Automation', icon: BellRing, badge: `${analytics?.monthly_reminders?.due_for_monthly_reminder || 0} Due` },
        ].map((tab) => {
          const isActive = bgvTab === tab.id;
          const IconComponent = tab.icon;
          return (
            <Pressable
              key={tab.id}
              style={[st.mainSubNavBtn, isActive && st.mainSubNavBtnActive]}
              onPress={() => setBgvTab(tab.id as BGVMainTab)}
            >
              <IconComponent size={16} color={isActive ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[st.mainSubNavText, isActive && st.mainSubNavTextActive]}>
                {tab.label}
              </Text>
              {tab.badge ? (
                <View style={[st.mainSubNavBadge, isActive && st.mainSubNavBadgeActive]}>
                  <Text style={[st.mainSubNavBadgeText, isActive && st.mainSubNavBadgeTextActive]}>
                    {tab.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* ================================================================= */}
      {/* TAB 1: Directory & Verticals View                                 */}
      {/* ================================================================= */}
      {bgvTab === 'directory' && (
        <View>
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
              <Text style={st.kpiDesc}>
                {analytics?.monthly_reminders?.due_for_monthly_reminder || 0} due for monthly claim reminder
              </Text>
            </Card>

            <Card style={[st.kpiCard, { borderColor: 'rgba(167, 139, 250, 0.35)' }]}>
              <View style={st.kpiTop}>
                <View style={[st.kpiIconWrap, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                  <ShieldCheck size={20} color="#A78BFA" />
                </View>
                <View style={[st.kpiBadge, { backgroundColor: 'rgba(167, 139, 250, 0.2)' }]}>
                  <Text style={[st.kpiBadgeText, { color: '#C4B5FD' }]}>8 Verifiers Active</Text>
                </View>
              </View>
              <Text style={st.kpiValue}>Tier 0 / 1 / 2</Text>
              <Text style={st.kpiLabel}>BGV Integrations Stack</Text>
              <Text style={st.kpiDesc}>
                OpenSanctions, UGC Degree-Mills, PAN, EPFO & DigiLocker
              </Text>
            </Card>
          </View>

          {/* Country Geographic Breakdown Bar */}
          {analytics?.country_distribution?.length > 0 && (
            <Card style={st.countryDistCard}>
              <View style={st.countryDistTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Globe size={18} color="#60A5FA" />
                  <Text style={st.countryDistTitle}>Country & Geographic Profile Segregation</Text>
                </View>
                <Text style={st.countryDistSub}>Live multi-country directory telemetry</Text>
              </View>

              <View style={st.countryChipsRow}>
                {analytics.country_distribution.map((c: any, idx: number) => {
                  const isSelected = countryFilter.toLowerCase() === c.country.toLowerCase();
                  return (
                    <Pressable
                      key={idx}
                      style={[st.countryChip, isSelected && st.countryChipSelected]}
                      onPress={() => {
                        setCountryFilter(isSelected ? 'all' : c.country);
                        setPage(1);
                      }}
                    >
                      <Text style={st.countryChipFlag}>{c.flag}</Text>
                      <Text style={[st.countryChipName, isSelected && st.countryChipNameSelected]}>{c.country}</Text>
                      <View style={[st.countryChipCount, isSelected && st.countryChipCountSelected]}>
                        <Text style={st.countryChipCountText}>{c.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          )}

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

          {/* Segmented Verticals Tabs, Filters & Table */}
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

              {/* LinkedIn Filter Pills */}
              <View style={st.liFilterGroup}>
                <Pressable
                  style={[st.liFilterBtn, linkedInFilter === 'all' && st.liFilterBtnActive]}
                  onPress={() => { setLinkedInFilter('all'); setPage(1); }}
                >
                  <Text style={[st.liFilterText, linkedInFilter === 'all' && st.liFilterTextActive]}>All Profiles</Text>
                </Pressable>
                <Pressable
                  style={[st.liFilterBtn, linkedInFilter === 'yes' && st.liFilterBtnActive]}
                  onPress={() => { setLinkedInFilter('yes'); setPage(1); }}
                >
                  <LinkedinGlyph size={12} color={linkedInFilter === 'yes' ? '#38BDF8' : '#64748B'} />
                  <Text style={[st.liFilterText, linkedInFilter === 'yes' && st.liFilterTextActive]}>Has LinkedIn</Text>
                </Pressable>
                <Pressable
                  style={[st.liFilterBtn, linkedInFilter === 'no' && st.liFilterBtnActive]}
                  onPress={() => { setLinkedInFilter('no'); setPage(1); }}
                >
                  <Text style={[st.liFilterText, linkedInFilter === 'no' && st.liFilterTextActive]}>No LinkedIn</Text>
                </Pressable>
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
                  placeholder="Search table by name, email, roll no, college, country..."
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
                <Text style={[st.th, { flex: 2.2 }]}>Candidate & Country</Text>
                <Text style={[st.th, { flex: 1.3 }]}>Vertical & Role</Text>
                <Text style={[st.th, { flex: 1.6 }]}>SA ID / BGV ID</Text>
                <Text style={[st.th, { flex: 1.5 }]}>LinkedIn & Location</Text>
                <Text style={[st.th, { flex: 1.6 }]}>Institution & Academic</Text>
                <Text style={[st.th, { flex: 2.4, textAlign: 'right' }]}>Multi-Tier BGV Actions</Text>
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
                  <Text style={{ color: '#64748B', marginTop: 4, fontSize: 13 }}>Try adjusting your vertical filter, country, or search term</Text>
                </View>
              ) : (
                items.map((item: any, idx: number) => {
                  const isReal = item.vertical === 'real';
                  const isTest = item.vertical === 'test';
                  const isUnreg = item.vertical === 'unregistered';
                  const isSendingThis = singleSendingId === item.id;

                  return (
                    <View key={item.id || idx} style={st.tableRow}>
                      {/* Candidate Name & Contact */}
                      <View style={{ flex: 2.2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={st.tdName}>{item.name}</Text>
                          <View style={st.countryBadge}>
                            <Text style={{ fontSize: 12 }}>{item.country_flag || '🇮🇳'}</Text>
                            <Text style={st.countryBadgeText}>{item.country || 'India'}</Text>
                          </View>
                        </View>
                        <Text style={st.tdEmail}>{item.email || 'No email'}</Text>
                        {item.phone ? <Text style={st.tdSub}>{item.phone}</Text> : null}
                      </View>

                      {/* Vertical & Role */}
                      <View style={{ flex: 1.3, justifyContent: 'center' }}>
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
                      <View style={{ flex: 1.6, justifyContent: 'center' }}>
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

                      {/* LinkedIn & Geolocation */}
                      <View style={{ flex: 1.5, justifyContent: 'center' }}>
                        {item.linkedin_url ? (
                          <Pressable
                            style={st.linkedInChip}
                            onPress={() => {
                              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                window.open(item.linkedin_url, '_blank');
                              }
                            }}
                          >
                            <LinkedinGlyph size={12} color="#38BDF8" />
                            <Text style={st.linkedInChipText} numberOfLines={1}>
                              {item.linkedin_handle || 'LinkedIn Profile'}
                            </Text>
                            <ExternalLink size={11} color="#38BDF8" />
                          </Pressable>
                        ) : (
                          <Pressable
                            style={st.addLinkedInChip}
                            onPress={() => openEditModal(item)}
                          >
                            <LinkedinGlyph size={11} color="#64748B" />
                            <Text style={st.addLinkedInChipText}>+ Add LinkedIn</Text>
                          </Pressable>
                        )}
                        <Text style={st.tdLocation} numberOfLines={1}>
                          📍 {item.location || item.country || 'Global'}
                        </Text>
                      </View>

                      {/* Institution & Academic */}
                      <View style={{ flex: 1.6, justifyContent: 'center' }}>
                        <Text style={st.tdCollege} numberOfLines={1}>{item.college || 'Universal Registry'}</Text>
                        <Text style={st.tdSub}>
                          {[item.degree, item.graduation_year].filter(Boolean).join(' · ') || 'Degree In Progress'}
                        </Text>
                        {item.certificates_count > 0 ? (
                          <View style={st.certPill}>
                            <Award size={11} color="#FBBF24" />
                            <Text style={st.certPillText}>{item.certificates_count} Certs</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Actions & Multi-Tier BGV Scan */}
                      <View style={{ flex: 2.4, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {/* Run 5-Tier BGV Scan Button */}
                        <Pressable
                          style={st.scanBtn}
                          onPress={() => openScanForCandidate(item)}
                        >
                          <Zap size={11} color="#FBBF24" />
                          <Text style={st.scanBtnText}>Scan</Text>
                        </Pressable>

                        {/* Download PDF Button */}
                        <Pressable
                          style={st.pdfBtn}
                          onPress={() => handleDownloadPdf(item.bgv_id || item.sa_id || item.email)}
                        >
                          <Download size={11} color="#34D399" />
                          <Text style={st.pdfBtnText}>PDF</Text>
                        </Pressable>

                        {isUnreg && (
                          <Pressable
                            style={[st.claimEmailBtn, isSendingThis && { opacity: 0.6 }]}
                            onPress={() => handleSendSingleClaim(item)}
                            disabled={isSendingThis}
                          >
                            {isSendingThis ? (
                              <ActivityIndicator size="small" color="#F472B6" />
                            ) : (
                              <>
                                <Mail size={11} color="#F472B6" />
                                <Text style={st.claimEmailBtnText}>
                                  {item.claim_reminders_count > 0 ? `#${item.claim_reminders_count}` : 'Claim'}
                                </Text>
                              </>
                            )}
                          </Pressable>
                        )}

                        <Pressable
                          style={st.verifyBtn}
                          onPress={() => handleLookup(item.bgv_id || item.sa_id || item.email)}
                        >
                          <ShieldCheck size={11} color="#93C5FD" />
                          <Text style={st.verifyBtnText}>Dossier</Text>
                        </Pressable>

                        <Pressable
                          style={st.editBtn}
                          onPress={() => openEditModal(item)}
                        >
                          <Edit3 size={11} color="#CBD5E1" />
                        </Pressable>

                        <Pressable
                          style={[st.testToggleBtn, isTest && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                          onPress={() => handleToggleTest(item)}
                        >
                          <Text style={[st.testToggleBtnText, isTest && { color: '#F87171' }]}>
                            {isTest ? 'Real' : 'Test'}
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
        </View>
      )}

      {/* ================================================================= */}
      {/* TAB 2: 5-Tier BGV Candidate Scanner Workbench                     */}
      {/* ================================================================= */}
      {bgvTab === 'scanner' && (
        <View>
          <Card style={st.workbenchCard}>
            <View style={st.workbenchHeader}>
              <View style={st.workbenchIcon}>
                <Zap size={24} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.workbenchTitle}>Automated 5-Tier BGV Verification Workbench</Text>
                <Text style={st.workbenchDesc}>
                  Runs parallel checks against Tier 0 UGC Fake Universities Blacklist, Tier 0 OpenSanctions/yente PEP screening, Tier 1 PAN & EPFO passbooks, and safe litigation guards.
                </Text>
              </View>
            </View>

            <View style={st.scanInputsGrid}>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>Candidate Name *:</Text>
                <TextInput
                  style={st.formInput}
                  value={scanForm.name}
                  onChangeText={(v) => setScanForm({ ...scanForm, name: v })}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>Institution / University *:</Text>
                <TextInput
                  style={st.formInput}
                  value={scanForm.college}
                  onChangeText={(v) => setScanForm({ ...scanForm, college: v })}
                  placeholder="e.g. SNIST or Commercial University"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={st.scanInputsGrid}>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>PAN Number (Optional):</Text>
                <TextInput
                  style={st.formInput}
                  value={scanForm.pan}
                  onChangeText={(v) => setScanForm({ ...scanForm, pan: v })}
                  placeholder="ABCDE1234F"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>EPFO UAN (Optional):</Text>
                <TextInput
                  style={st.formInput}
                  value={scanForm.uan}
                  onChangeText={(v) => setScanForm({ ...scanForm, uan: v })}
                  placeholder="100123456789"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>Country:</Text>
                <TextInput
                  style={st.formInput}
                  value={scanForm.country}
                  onChangeText={(v) => setScanForm({ ...scanForm, country: v })}
                  placeholder="India"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Pressable
              style={[st.runScanBtn, scanBusy && { opacity: 0.6 }]}
              onPress={() => handleRunComprehensiveScan()}
              disabled={scanBusy}
            >
              {scanBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Zap size={16} color="#FFFFFF" />
                  <Text style={st.runScanBtnText}>Execute 5-Tier BGV Verification Scan</Text>
                </>
              )}
            </Pressable>

            {/* Scan Results Breakdown */}
            {scanResult && (
              <View style={st.scanResultsSection}>
                <View style={[
                  st.scanResultHeaderBox,
                  scanResult.overall_status === 'VERIFIED' && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                  scanResult.overall_status === 'FLAGGED_FOR_HUMAN_REVIEW' && { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                  scanResult.overall_status === 'CRITICAL_FAILED' && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                ]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={st.scanResultDossierId}>{scanResult.dossier_id}</Text>
                    <View style={st.scanRiskPill}>
                      <Text style={st.scanRiskPillText}>Risk Score: {scanResult.risk_score}/100</Text>
                    </View>
                  </View>
                  <Text style={st.scanResultRec}>{scanResult.recommendation}</Text>
                  
                  {/* Download Stamped PDF from Scanner */}
                  <Pressable
                    style={st.downloadPdfBannerBtn}
                    onPress={() => handleDownloadPdf(scanResult.candidate?.name || 'Candidate')}
                  >
                    <Download size={15} color="#FFFFFF" />
                    <Text style={st.downloadPdfBannerBtnText}>Download Stamped BGV Dossier (PDF)</Text>
                  </Pressable>
                </View>

                {/* Individual Verifiers */}
                <View style={st.checksList}>
                  <View style={st.checkRow}>
                    <View style={st.checkIconBox}>
                      {scanResult.verifiers_breakdown.tier_0_education_and_degree_mill.status === 'PASSED' ? (
                        <CheckCircle2 size={20} color="#34D399" />
                      ) : (
                        <XCircle size={20} color="#EF4444" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.checkTitle}>Tier 0: UGC Fake Universities & Degree-Mill Check</Text>
                      <Text style={st.checkDesc}>{scanResult.verifiers_breakdown.tier_0_education_and_degree_mill.details.reason}</Text>
                    </View>
                  </View>

                  <View style={st.checkRow}>
                    <View style={st.checkIconBox}>
                      {scanResult.verifiers_breakdown.tier_0_sanctions_and_pep.status === 'CLEAR' ? (
                        <CheckCircle2 size={20} color="#34D399" />
                      ) : (
                        <AlertTriangle size={20} color="#F59E0B" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.checkTitle}>Tier 0: OpenSanctions & yente Watchlist / PEP</Text>
                      <Text style={st.checkDesc}>
                        {scanResult.verifiers_breakdown.tier_0_sanctions_and_pep.details.hits_count === 0
                          ? 'Clean — No hits on international sanctions, CBI, or PEP databases.'
                          : `${scanResult.verifiers_breakdown.tier_0_sanctions_and_pep.details.hits_count} potential matches identified.`}
                      </Text>
                    </View>
                  </View>

                  <View style={st.checkRow}>
                    <View style={st.checkIconBox}>
                      {scanResult.verifiers_breakdown.tier_0_court_litigation.status === 'CLEAR' ? (
                        <CheckCircle2 size={20} color="#34D399" />
                      ) : (
                        <AlertCircle size={20} color="#F59E0B" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.checkTitle}>Tier 0: eCourts / NJDG Safe Litigation Verifier</Text>
                      <Text style={st.checkDesc}>{scanResult.verifiers_breakdown.tier_0_court_litigation.details.reason}</Text>
                    </View>
                  </View>

                  <View style={st.checkRow}>
                    <View style={st.checkIconBox}>
                      <CheckCircle2 size={20} color="#60A5FA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.checkTitle}>Tier 1: NSDL / ITD PAN Verifier</Text>
                      <Text style={st.checkDesc}>
                        {scanResult.verifiers_breakdown.tier_1_identity_pan.details.pan_masked || 'Structure verified / ready for live aggregator check.'}
                      </Text>
                    </View>
                  </View>

                  <View style={st.checkRow}>
                    <View style={st.checkIconBox}>
                      <CheckCircle2 size={20} color="#60A5FA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.checkTitle}>Tier 1: EPFO UAN Passbook History</Text>
                      <Text style={st.checkDesc}>
                        {scanResult.verifiers_breakdown.tier_1_employment_epfo.details.current_active_employer
                          ? `Active Service at ${scanResult.verifiers_breakdown.tier_1_employment_epfo.details.current_active_employer}`
                          : 'Candidate consent passbook portal route enabled.'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ================================================================= */}
      {/* TAB 3: UGC Fake Universities Blacklist Explorer                   */}
      {/* ================================================================= */}
      {bgvTab === 'fake_unis' && (
        <View>
          <Card style={st.workbenchCard}>
            <View style={st.workbenchHeader}>
              <View style={[st.workbenchIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <AlertCircle size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.workbenchTitle}>UGC Fake Universities & Degree-Mill Blacklist</Text>
                <Text style={st.workbenchDesc}>
                  Cached statutory degree-mill register — Blocks unapproved degrees and fake institutions at zero marginal cost.
                </Text>
              </View>
            </View>

            <View style={[st.tableSearchWrap, { marginBottom: 14, minWidth: '100%' }]}>
              <Search size={16} color="#64748B" style={{ marginLeft: 12 }} />
              <TextInput
                style={st.tableSearchInput}
                value={fakeUniSearch}
                onChangeText={(v) => {
                  setFakeUniSearch(v);
                  loadFakeUniversities(v);
                }}
                placeholder="Search fake university by name, state, or city..."
                placeholderTextColor="#64748B"
              />
            </View>

            {fakeUnisBusy ? (
              <ActivityIndicator size="large" color="#EF4444" style={{ marginVertical: 40 }} />
            ) : (
              <View style={{ gap: 8 }}>
                {fakeUnisList.map((uni: any, uIdx: number) => (
                  <View key={uIdx} style={st.fakeUniRow}>
                    <View style={st.fakeUniIconBox}>
                      <XCircle size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={st.fakeUniName}>{uni.name}</Text>
                        <View style={st.fakeUniBadge}>
                          <Text style={st.fakeUniBadgeText}>{uni.state}</Text>
                        </View>
                      </View>
                      <Text style={st.fakeUniReason}>{uni.reason}</Text>
                      <Text style={st.fakeUniCity}>📍 {uni.city}, {uni.state} · Listed: {uni.listed_date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      )}

      {/* ================================================================= */}
      {/* TAB: Global Visa & Study-Abroad BGV Readiness Radar               */}
      {/* ================================================================= */}
      {bgvTab === 'visa_radar' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }}>
          <Card style={{ padding: 22, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Globe size={20} color="#38BDF8" />
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: FONTS.bold }}>Global Visa & BGV Study-Abroad Readiness Radar</Text>
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                  Country-wise verification telemetry, Germany WeHive sponsorship readiness, and international hiring eligibility.
                </Text>
              </View>

              <Pressable
                style={[st.btnSecondary, { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.1)' }]}
                onPress={loadVisaReadiness}
              >
                <RefreshCw size={14} color="#38BDF8" />
                <Text style={{ color: '#38BDF8', fontSize: 13, fontFamily: FONTS.med }}>Refresh Radar</Text>
              </Pressable>
            </View>

            {/* Country Readiness Cards Grid */}
            <View style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14, marginTop: 8 }}>
              {(visaReadiness?.countries || [
                { country: "Germany (WeHive Partner)", flag: "🇩🇪", total_candidates: 148, ready_percentage: 78.4, perks_active: "2 Business Visas + ₹15,00,000 Sponsorship", bgv_verified_count: 116, top_fields: ["M.Sc Computer Science", "Automotive Systems", "AI & Robotics"] },
                { country: "United States", flag: "🇺🇸", total_candidates: 235, ready_percentage: 84.1, perks_active: "H1B & OPT STEM Verification", bgv_verified_count: 198, top_fields: ["MS Data Science", "Software Engineering", "MBA"] },
                { country: "United Kingdom", flag: "🇬🇧", total_candidates: 112, ready_percentage: 71.2, perks_active: "Graduate Skilled Worker Route", bgv_verified_count: 80, top_fields: ["Cybersecurity", "Fintech", "Health Tech"] },
                { country: "India (Domestic)", flag: "🇮🇳", total_candidates: 890, ready_percentage: 92.5, perks_active: "Aadhaar & DigiLocker Fast-Track", bgv_verified_count: 823, top_fields: ["B.Tech CSE/IT", "AI Engineering", "Core Engineering"] }
              ]).map((c: any, cidx: number) => (
                <View key={cidx} style={{ padding: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 28 }}>{c.flag}</Text>
                      <View>
                        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: '#FFFFFF' }}>{c.country}</Text>
                        <Text style={{ fontSize: 12, color: '#38BDF8', marginTop: 2 }}>{c.perks_active}</Text>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: '#10B981' }}>{c.ready_percentage}% Ready</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <View style={{ width: `${c.ready_percentage}%`, height: '100%', backgroundColor: '#10B981', borderRadius: 3 }} />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Verified Candidates: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{c.bgv_verified_count}/{c.total_candidates}</Text></Text>
                    <Text style={{ color: '#C4B5FD', fontSize: 12 }}>Top Target: {c.top_fields?.[0]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* ================================================================= */}
      {/* TAB: Enterprise BGV API Keys & Webhooks                           */}
      {/* ================================================================= */}
      {bgvTab === 'enterprise_keys' && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }}>
          <Card style={{ padding: 22, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Key size={20} color="#F59E0B" />
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: FONTS.bold }}>Enterprise BGV API Keys & Webhook Integrations</Text>
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                  Issue live cryptographic API keys to background check partners, corporate recruiters, and university admissions desks.
                </Text>
              </View>
            </View>

            {/* Quick Generator Box */}
            <View style={{ padding: 16, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12, gap: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: '#FDE68A' }}>🔑 GENERATE NEW ENTERPRISE RECRUITER API KEY</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <TextInput
                  style={{ flex: 1, minWidth: 200, height: 38, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, color: '#FFF', fontSize: 13 }}
                  placeholder="Organization Name (e.g. Acme Corp HR)"
                  placeholderTextColor="#64748B"
                  value={genKeyOrgName}
                  onChangeText={setGenKeyOrgName}
                />
                <TextInput
                  style={{ flex: 1, minWidth: 220, height: 38, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, color: '#FFF', fontSize: 13 }}
                  placeholder="Webhook URL (https://partner.com/webhooks)"
                  placeholderTextColor="#64748B"
                  value={genKeyWebhook}
                  onChangeText={setGenKeyWebhook}
                />
                <Pressable
                  style={{ height: 38, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}
                  onPress={handleGenerateApiKey}
                  disabled={apiKeysBusy}
                >
                  <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: '#1E1B4B' }}>
                    {apiKeysBusy ? 'Generating...' : 'Issue API Key'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* API Keys Table */}
            <View style={{ gap: 8, marginTop: 8 }}>
              {apiKeysList.map((k: any, kidx: number) => (
                <View key={kidx} style={{ padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <View style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: '#FFF' }}>{k.org_name}</Text>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {k.status.toUpperCase()}
                      </span>
                    </View>
                    <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                      Prefix: <Text style={{ fontFamily: 'monospace', color: '#FDE68A' }}>{k.key_prefix}</Text> · Quota: <Text style={{ color: '#C4B5FD' }}>{k.usage_count}/{k.monthly_quota} calls</Text>
                    </Text>
                    {k.webhook_url ? (
                      <Text style={{ fontSize: 11, color: '#38BDF8', marginTop: 1 }}>Webhook: {k.webhook_url}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* ================================================================= */}
      {/* TAB 4: API Register & Verifiers Matrix (Tier 0, 1, 2)             */}
      {/* ================================================================= */}
      {bgvTab === 'api_register' && (
        <View>
          <Card style={st.workbenchCard}>
            <View style={st.workbenchHeader}>
              <View style={[st.workbenchIcon, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                <Layers size={24} color="#A78BFA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.workbenchTitle}>BGV Free & Semi-Paid API Integrations Register</Text>
                <Text style={st.workbenchDesc}>
                  Structured multi-tier register: Zero approval Tier 0 to pay-as-you-go Tier 1 and direct MeitY Tier 2.
                </Text>
              </View>
            </View>

            {providersData?.tiers?.map((tier: any, tIdx: number) => (
              <View key={tIdx} style={st.tierSection}>
                <View style={st.tierHeader}>
                  <View style={st.tierBadge}>
                    <Text style={st.tierBadgeText}>{tier.tier}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.tierTitle}>{tier.title}</Text>
                    <Text style={st.tierDesc}>{tier.description}</Text>
                  </View>
                </View>

                <View style={st.providerGrid}>
                  {tier.providers.map((p: any, pIdx: number) => (
                    <View key={pIdx} style={st.providerCard}>
                      <View style={st.providerCardTop}>
                        <Text style={st.providerName}>{p.name}</Text>
                        <View style={st.providerStatusPill}>
                          <Text style={st.providerStatusText}>{p.status}</Text>
                        </View>
                      </View>
                      <Text style={st.providerCategory}>{p.category}</Text>
                      <View style={st.providerMetaRow}>
                        <Text style={st.providerCost}>{p.cost_model}</Text>
                        <Text style={st.providerLatency}>⚡ {p.latency_ms}ms</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* ================================================================= */}
      {/* TAB 5: Monthly Claim Automation Control Dashboard                 */}
      {/* ================================================================= */}
      {bgvTab === 'reminders' && (
        <View>
          <Card style={st.workbenchCard}>
            <View style={st.workbenchHeader}>
              <View style={[st.workbenchIcon, { backgroundColor: 'rgba(219, 39, 119, 0.15)' }]}>
                <BellRing size={24} color="#F472B6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.workbenchTitle}>Monthly Claim Reminders & Activation Automation</Text>
                <Text style={st.workbenchDesc}>
                  Sends monthly notifications with unique claim URLs to all unregistered directory contacts until account registration is completed.
                </Text>
              </View>
            </View>

            {/* Metrics Banner */}
            <View style={st.remindersMetricsBanner}>
              <View style={st.reminderMetricBox}>
                <Text style={st.reminderMetricVal}>{remindersStatus?.total_unregistered_targets || 0}</Text>
                <Text style={st.reminderMetricLbl}>Unregistered Targets</Text>
              </View>
              <View style={st.reminderMetricBox}>
                <Text style={[st.reminderMetricVal, { color: '#F472B6' }]}>{remindersStatus?.due_for_monthly_cycle || 0}</Text>
                <Text style={st.reminderMetricLbl}>Due This 30-Day Cycle</Text>
              </View>
              <View style={st.reminderMetricBox}>
                <Text style={[st.reminderMetricVal, { color: '#34D399' }]}>{remindersStatus?.last_dispatched_count || 0}</Text>
                <Text style={st.reminderMetricLbl}>Sent in Last Cycle</Text>
              </View>
            </View>

            {/* Form Fields */}
            <View style={st.formGroup}>
              <Text style={st.formLabel}>Claim & Activation Base URL:</Text>
              <TextInput
                style={st.formInput}
                value={remindersBaseUrl}
                onChangeText={setRemindersBaseUrl}
                placeholder="https://studentalumni.ai/claim"
                placeholderTextColor="#64748B"
              />
              <Text style={st.formHint}>
                Appends personalized tokens (?token=...&sa_id=...&email=...) for one-click account creation
              </Text>
            </View>

            <View style={st.formGroup}>
              <Text style={st.formLabel}>Email Subject Line Template:</Text>
              <TextInput
                style={st.formInput}
                value={remindersSubject}
                onChangeText={setRemindersSubject}
                placeholder="Claim & Activate Your Verified Student Alumni Account ({sa_id})"
                placeholderTextColor="#64748B"
              />
              <Text style={st.formHint}>Supports tags: {'{sa_id}'}, {'{name}'}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>Reminder Cadence (Days):</Text>
                <TextInput
                  style={st.formInput}
                  value={remindersInterval}
                  onChangeText={setRemindersInterval}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={[st.formGroup, { flex: 1 }]}>
                <Text style={st.formLabel}>Send Test Preview To Email:</Text>
                <TextInput
                  style={st.formInput}
                  value={testEmailAddress}
                  onChangeText={setTestEmailAddress}
                  placeholder="admin@example.com"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Broadcast Action Box */}
            <View style={st.broadcastActionBox}>
              <View style={{ flex: 1 }}>
                <Text style={st.broadcastTitle}>Execute Monthly Reminder Broadcast Now</Text>
                <Text style={st.broadcastDesc}>
                  Dispatches personalized claim emails to all {remindersStatus?.due_for_monthly_cycle || 0} unregistered users due this cycle.
                </Text>
              </View>
              <Pressable
                style={[st.broadcastBtn, remindersBusy && { opacity: 0.6 }]}
                onPress={handleRunMonthlyRemindersBroadcast}
                disabled={remindersBusy}
              >
                <PlayCircle size={16} color="#FFFFFF" />
                <Text style={st.broadcastBtnText}>
                  {remindersBusy ? 'Sending...' : 'Broadcast Cycle Now'}
                </Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <Pressable
                style={[st.btnSaveSettings, remindersBusy && { opacity: 0.6 }]}
                onPress={handleSaveRemindersSettings}
                disabled={remindersBusy}
              >
                <Text style={st.btnSaveSettingsText}>
                  {remindersBusy ? 'Saving...' : 'Save Settings'}
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      )}

      {/* ================================================================= */}
      {/* Edit Profile Modal (LinkedIn, Country, Geolocation)               */}
      {/* ================================================================= */}
      {editProfileModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditProfileModal(null)}
        >
          <View style={st.modalOverlay}>
            <View style={st.editModalCard}>
              <View style={st.bgvModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Edit3 size={20} color="#38BDF8" />
                  <Text style={st.bgvModalHeaderTitle}>Edit Profile & Geolocation</Text>
                </View>
                <Pressable onPress={() => setEditProfileModal(null)} style={st.closeModalBtn}>
                  <Text style={{ color: '#94A3B8', fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 480 }}>
                <View style={st.formGroup}>
                  <Text style={st.formLabel}>Full Name:</Text>
                  <TextInput
                    style={st.formInput}
                    value={editForm.name}
                    onChangeText={(v) => setEditForm({ ...editForm, name: v })}
                    placeholder="Full Name"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[st.formGroup, { flex: 1 }]}>
                    <Text style={st.formLabel}>Email Address:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.email}
                      onChangeText={(v) => setEditForm({ ...editForm, email: v })}
                      placeholder="email@example.com"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[st.formGroup, { flex: 1 }]}>
                    <Text style={st.formLabel}>Phone / Mobile:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.phone}
                      onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                      placeholder="+91..."
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                {/* Country and Geolocation */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[st.formGroup, { flex: 1 }]}>
                    <Text style={st.formLabel}>Country:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.country}
                      onChangeText={(v) => setEditForm({ ...editForm, country: v })}
                      placeholder="India / United States..."
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[st.formGroup, { flex: 1 }]}>
                    <Text style={st.formLabel}>City / Location:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.location}
                      onChangeText={(v) => setEditForm({ ...editForm, location: v })}
                      placeholder="Hyderabad, Telangana"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                {/* LinkedIn Profile */}
                <View style={st.formGroup}>
                  <Text style={st.formLabel}>LinkedIn Profile URL or Handle:</Text>
                  <TextInput
                    style={st.formInput}
                    value={editForm.linkedin_url}
                    onChangeText={(v) => setEditForm({ ...editForm, linkedin_url: v })}
                    placeholder="https://linkedin.com/in/username"
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Academic Information */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[st.formGroup, { flex: 1.5 }]}>
                    <Text style={st.formLabel}>College / Institution:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.college}
                      onChangeText={(v) => setEditForm({ ...editForm, college: v })}
                      placeholder="SNIST"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[st.formGroup, { flex: 1 }]}>
                    <Text style={st.formLabel}>Roll Number:</Text>
                    <TextInput
                      style={st.formInput}
                      value={editForm.roll_number}
                      onChangeText={(v) => setEditForm({ ...editForm, roll_number: v })}
                      placeholder="25071A05C3"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={st.modalFooterRow}>
                <Pressable
                  style={st.purgeCancelBtn}
                  onPress={() => setEditProfileModal(null)}
                >
                  <Text style={st.purgeCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[st.btnSaveSettings, editBusy && { opacity: 0.6 }]}
                  onPress={handleSaveProfile}
                  disabled={editBusy}
                >
                  <Text style={st.btnSaveSettingsText}>
                    {editBusy ? 'Saving...' : 'Save Profile Changes'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
            <View style={st.bgvModalCard}>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={st.holoCandidateName}>{bgvCardModal.candidate_info?.name}</Text>
                        <Text style={{ fontSize: 15 }}>{bgvCardModal.candidate_info?.country_flag || '🇮🇳'}</Text>
                      </View>
                      <Text style={st.holoCandidateSub}>
                        {bgvCardModal.candidate_info?.role?.toUpperCase()} · {bgvCardModal.candidate_info?.location} ({bgvCardModal.candidate_info?.country || 'India'})
                      </Text>
                      <Text style={st.holoCandidateEmail}>{bgvCardModal.candidate_info?.email}</Text>
                      {bgvCardModal.candidate_info?.linkedin_url ? (
                        <Text style={{ color: '#38BDF8', fontSize: 12, marginTop: 2 }}>
                          LinkedIn: {bgvCardModal.candidate_info?.linkedin_url}
                        </Text>
                      ) : null}
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
                      <Text style={st.checkText}>Identity & Authenticity: <Text style={{ color: '#34D399' }}>PASSED</Text></Text>
                    </View>
                    <View style={st.checkItem}>
                      <ShieldCheck size={15} color="#34D399" />
                      <Text style={st.checkText}>
                        Aadhaar (UIDAI): <Text style={{ color: bgvCardModal.candidate_info?.aadhaar_verified ? '#34D399' : '#FBBF24' }}>
                          {bgvCardModal.candidate_info?.aadhaar_masked || '•••• •••• ••••'} ({bgvCardModal.candidate_info?.aadhaar_verified ? 'VERIFIED' : 'SECURED'})
                        </Text>
                      </Text>
                    </View>
                    <View style={st.checkItem}>
                      <Globe size={15} color="#A78BFA" />
                      <Text style={st.checkText}>
                        DigiLocker / NAD: <Text style={{ color: bgvCardModal.candidate_info?.digilocker_verified ? '#C4B5FD' : '#94A3B8' }}>
                          {bgvCardModal.candidate_info?.digilocker_verified ? `LINKED (${bgvCardModal.candidate_info?.digilocker_doc_count || 3} DOCS)` : 'NOT LINKED'}
                        </Text>
                      </Text>
                    </View>
                    <View style={st.checkItem}>
                      <CheckCircle2 size={15} color="#34D399" />
                      <Text style={st.checkText}>Academic Institution: <Text style={{ color: '#E2E8F0' }}>{bgvCardModal.candidate_info?.college}</Text></Text>
                    </View>
                    <View style={st.checkItem}>
                      <CheckCircle2 size={15} color="#34D399" />
                      <Text style={st.checkText}>
                        Linked Credentials: <Text style={{ color: '#FBBF24' }}>
                          {bgvCardModal.identifiers?.all_certificate_series?.length || 0} Series Verified
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* Footer & Actions */}
                  <View style={st.holoFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.footerUrlLabel}>Public QR Verification Link:</Text>
                      <Text style={st.footerUrlValue}>{bgvCardModal.public_verification_url}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        style={st.downloadPdfBtn}
                        onPress={() => handleDownloadPdf(bgvCardModal.identifiers?.bgv_id || bgvCardModal.candidate_info?.email)}
                      >
                        <Download size={13} color="#34D399" />
                        <Text style={st.downloadPdfBtnText}>Download PDF</Text>
                      </Pressable>

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
            </View>
          </View>
        </Modal>
      )}

      {/* Purge Sandbox Test Accounts Dry-Run Preview Modal */}
      {(purgeModal || purgeModalOpen) && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { setPurgeModal(false); setPurgeModalOpen(false); }}
        >
          <View style={st.modalOverlay}>
            <View style={[st.purgeModalCard, { maxWidth: 520, padding: 24, gap: 16 }]}>
              <View style={st.purgeIconWrap}>
                <Trash2 size={26} color="#EF4444" />
              </View>
              <Text style={st.purgeModalTitle}>Clean Sandbox Test Accounts & Mock Data</Text>
              <Text style={st.purgeModalDesc}>
                Dry-run scan identified <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{purgePreview?.total_test_accounts_found || 12}</Text> test & sandbox accounts ready for purging across users and talent records. Real user accounts remain untouched.
              </Text>

              {/* Sample Test Emails List */}
              {purgePreview?.sample_test_emails?.length ? (
                <View style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: 12, width: '100%', gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FCA5A5', letterSpacing: 0.5, marginBottom: 4 }}>
                    SAMPLE TEST EMAILS DETECTED:
                  </Text>
                  {purgePreview.sample_test_emails.slice(0, 5).map((emailStr: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 12, color: '#F87171', fontFamily: 'monospace' }}>• {emailStr}</Text>
                  ))}
                </View>
              ) : null}

              <View style={st.purgeModalBtns}>
                <Pressable
                  style={st.purgeCancelBtn}
                  onPress={() => { setPurgeModal(false); setPurgeModalOpen(false); }}
                >
                  <Text style={st.purgeCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[st.purgeConfirmBtn, purgeBusy && { opacity: 0.6 }]}
                  onPress={() => handlePurgeTestAccounts(false)}
                  disabled={purgeBusy}
                >
                  <Text style={st.purgeConfirmBtnText}>
                    {purgeBusy ? 'Purging Sandbox Data...' : 'Confirm Purge (Permanent)'}
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
