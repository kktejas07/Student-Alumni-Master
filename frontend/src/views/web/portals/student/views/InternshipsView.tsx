/**
 * Live job feed view — replaces the old mock-driven InternshipsView.
 *
 * Pulls from /api/jobs/feed which aggregates 11 free job APIs (RemoteOK,
 * ArbeitNow, The Muse, Remotive, Jobicy, Himalayas, HackerNews) with year-tier filter applied:
 *   • Year 1, 2 → internships only
 *   • Year 3, 4 → internships + full-time
 *   • Alumni    → full-time + senior
 *
 * Features:
 *   - Tabs (Recommended / Saved / Applied)
 *   - Dropdown filters (All Types / All Modes)
 *   - Search across role/company/city
 *   - Save / Unsave with instant DB persistence
 *   - Apply opens source URL in new tab + tracks via confirmation modal
 *   - Live refresh button next to search
 *   - "Why match?" explanation modal
 *   - "Cover Letter" automatic AI drafting modal
 *   - Premium visual styling matching the exact design system
 */
import React, { useCallback, useEffect, useState, useContext } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions,
  Platform, ActivityIndicator, Linking, Modal, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Search, MapPin, Bookmark, BookmarkCheck, ExternalLink, RefreshCcw,
  Lock, Sparkles, Briefcase, Globe2, Clock, Users, UserPlus, Calendar, IndianRupee,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { EmptyState, SuccessBurst } from '../EmptyState';
import { SkeletonList } from '../motion';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { StudentPortalNavContext } from '../StudentPortalNavContext';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { track, trackClick, trackScreen, logger as analyticsLogger } from '@/src/analytics';

type Job = {
  job_id: string;
  title: string;
  company: string;
  location: string;
  work_mode: string;
  job_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  description?: string;
  tags?: string[];
  posted_date?: string;
  source?: string;
  sources?: string[];
  source_urls?: string[];
  logo_url?: string;
  saved?: boolean;
  applied?: boolean;
  match_score?: number;
  is_recommended?: boolean;
};

type AlumniEntry = {
  id: string;
  name: string;
  photo?: string;
  role?: string;
  grad_year?: number;
  college?: string;
  is_connected: boolean;
  accepts_referrals: boolean;
};

type AlumniSheetState = {
  job: Job;
  items: AlumniEntry[];
  total: number;
  total_from_viewer_college: number;
  loading: boolean;
};

type FeedResponse = {
  items: Job[];
  total: number;
  page: number;
  per_page: number;
  allowed_types: string[];
  user_tier_locked?: boolean;
  message?: string;
  available_sources?: string[];
  fetched_at?: string;
};

const PER_PAGE = 12;

/* ── Custom Dropdown Component ───────────────────────────────────────── */
function CustomDropdown({
  value,
  options,
  onSelect,
  disabledOptions = [],
  onDisabledSelect,
}: {
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  disabledOptions?: string[];
  onDisabledSelect?: (opt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ zIndex: open ? 1000 : 1, position: 'relative' }}>
      {/* Transparent full-screen backdrop — closes menu on outside click */}
      {open && (
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel="Close dropdown backdrop"
          style={{
            position: 'fixed' as any,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
      <Pressable
        onPress={() => {
          trackClick('job_dropdown_toggle', { current_value: value });
          analyticsLogger.debug('[InternshipsView DEBUG] Dropdown toggle pressed', { value });
          setOpen(!open);
        }}
        accessibilityLabel={`Filter: ${value}`}
        accessibilityHint="Tap to show filter dropdown options"
        testID={`job-dropdown-toggle-${value.toLowerCase().replace(/\s+/g, '-')}`}
        accessibilityRole="combobox"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F1F5F9',
          borderColor: open ? '#2563EB' : 'rgba(15,38,71,0.12)',
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          height: 36,
          minWidth: 120,
          justifyContent: 'space-between',
          zIndex: 1001,
        }}
      >
        <Text style={{ color: '#1E293B', fontSize: 12.5, fontFamily: FONTS.med }}>{value}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={14} color="#475569" />
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: 40,
            left: 0,
            minWidth: 140,
            backgroundColor: '#FFFFFF',
            borderColor: 'rgba(15,38,71,0.12)',
            borderWidth: 1,
            borderRadius: 8,
            padding: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 8,
            zIndex: 1002,
          }}
        >
          {options.map((opt) => {
            const isDisabled = disabledOptions.includes(opt);
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  if (isDisabled) {
                    if (onDisabledSelect) onDisabledSelect(opt);
                  } else {
                    onSelect(opt);
                  }
                  setOpen(false);
                }}
                style={({ hovered }: any) => [
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'space-between',
                  },
                  hovered && { backgroundColor: 'rgba(0,0,0,0.04)' },
                  value === opt && { backgroundColor: 'rgba(37,99,235,0.08)' },
                  isDisabled && { opacity: 0.5 },
                ]}
              >
                <Text style={{ color: value === opt ? '#2563EB' : '#1E293B', fontSize: 12, fontFamily: FONTS.bold }}>
                  {opt}
                </Text>
                {isDisabled && <Lock size={10} color={SC.dim} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function InternshipsView() {
  const { width } = useWindowDimensions();
  const toast = useToast();

  const [tab, setTab] = useState<'Recommended' | 'Saved' | 'Applied' | 'Careers'>('Recommended');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedMode, setSelectedMode] = useState<string>('All Modes');
  const [q, setQ] = useState('');

  const portalNav = useContext(StudentPortalNavContext);

  useEffect(() => {
    if (portalNav?.searchQuery) {
      setTab('Recommended');
      setQ(portalNav.searchQuery);
      portalNav.setSearchQuery('');
    }
  }, [portalNav?.searchQuery]);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['Internship']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyModalJob, setApplyModalJob] = useState<Job | null>(null);
  const authUser = useAuthStore((sx) => sx.user);

  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [appliedRaw, setAppliedRaw] = useState<any[]>([]);
  const [careerApps, setCareerApps] = useState<any[]>([]);
  const [careerOpenings, setCareerOpenings] = useState<any[]>([]);
  const [careerSubTab, setCareerSubTab] = useState<'openings' | 'applications'>('openings');

  // Modals state
  const [coverModalJob, setCoverModalJob] = useState<Job | null>(null);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);
  const [whyMatchJob, setWhyMatchJob] = useState<Job | null>(null);

  // Alumni referrals sheet + modal
  const [alumniSheet, setAlumniSheet] = useState<AlumniSheetState | null>(null);
  const [alumniLoadingJobs, setAlumniLoadingJobs] = useState<Set<string>>(new Set());
  const [referralModal, setReferralModal] = useState<{ job: Job; alumni: AlumniEntry } | null>(null);
  const [referralNote, setReferralNote] = useState('');
  const [sendingReferral, setSendingReferral] = useState(false);
  const [myReferrals, setMyReferrals] = useState<any[]>([]);

  const myReferralFor = useCallback((jobId: string, alumniId: string) => {
    return myReferrals.find((x: any) => x.job_id === jobId && x.alumni_id === alumniId) || null;
  }, [myReferrals]);

  // Dedupe referral_accepted events to one per referral per session
  const acceptedTrackedRef = React.useRef<Set<string>>(new Set());
  const markReferralAccepted = useCallback((req: any) => {
    if (!req || (req.status !== 'accepted' && req.status !== 'referred')) return;
    if (acceptedTrackedRef.current.has(req.id)) return;
    acceptedTrackedRef.current.add(req.id);
    track('referral_accepted', {
      referral_id: req.id,
      job_id: req.job_id,
      company: req.job_company,
      status: req.status,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await request('/referrals/my-requests').catch(() => ({ items: [] }));
        if (cancelled) return;
        const items = r?.items || [];
        setMyReferrals(items);
        // Fire referral_accepted when a previously-requested referral has been accepted/referred
        items.forEach((x: any) => markReferralAccepted(x));
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [markReferralAccepted]);

  const loadFeed = useCallback(async (opts?: { append?: boolean; refresh?: boolean; pageOverride?: number }) => {
    const append = opts?.append || false;
    if (!append) setLoading(true);
    try {
      const params: any = { page: opts?.pageOverride ?? page, per_page: PER_PAGE };

      if (selectedType !== 'All Types') {
        params.type = selectedType;
      }
      if (selectedMode !== 'All Modes') {
        params.work_mode = selectedMode;
      }
      if (q.trim()) params.q = q.trim();
      if (opts?.refresh) params.refresh = true;

      // Update lists and counts
      const savedRes: any = await request('/jobs/saved');
      const sList = savedRes.items || [];
      setSavedJobs(sList);

      const appliedRes: any = await request(`/student/my-applications?email=${encodeURIComponent(authUser?.email || '')}`);
      const aList = appliedRes.items || [];
      setAppliedRaw(aList);

      try {
        const [cRes, openRes]: [any, any] = await Promise.all([
          request('/careers/student/my-applications').catch(() => ({ applications: [] })),
          request('/careers?limit=50', { auth: false }).catch(() => ({ openings: [] })),
        ]);
        const cList = cRes?.applications || [];
        const oList = openRes?.openings || [];
        setCareerApps(cList);
        setCareerOpenings(oList);

        if (tab === 'Careers') {
          if (careerSubTab === 'openings') {
            const filtered = oList.filter((op: any) => {
              if (!q.trim()) return true;
              const term = q.toLowerCase();
              return (
                (op.title || '').toLowerCase().includes(term) ||
                (op.company_name || '').toLowerCase().includes(term) ||
                (op.work_mode || '').toLowerCase().includes(term) ||
                (op.location || '').toLowerCase().includes(term) ||
                (op.skills_required || []).some((sk: string) => sk.toLowerCase().includes(term))
              );
            });
            setTotal(filtered.length);
          } else {
            const filtered = cList.filter((c: any) => {
              if (!q.trim()) return true;
              const term = q.toLowerCase();
              return (
                (c.opening?.title || '').toLowerCase().includes(term) ||
                (c.opening?.company_name || '').toLowerCase().includes(term) ||
                (c.status || '').toLowerCase().includes(term)
              );
            });
            setTotal(filtered.length);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        // Continue normally
      }

      if (tab === 'Saved') {
        // Filter locally for fast response
        const filtered = sList.filter((j: any) => {
          const typeMatch = selectedType === 'All Types' || j.job_type === selectedType;
          const modeMatch = selectedMode === 'All Modes' || j.work_mode === selectedMode;
          const qMatch = !q.trim() ||
            (j.title || '').toLowerCase().includes(q.toLowerCase()) ||
            (j.company || '').toLowerCase().includes(q.toLowerCase()) ||
            (j.tags || []).some((t: any) => t.toLowerCase().includes(q.toLowerCase()));
          return typeMatch && modeMatch && qMatch;
        });
        setItems(filtered);
        setTotal(filtered.length);
        return;
      }

      if (tab === 'Applied') {
        const mapped = aList.map((app: any) => {
          // Handle both app.job_id and app.id field names from the API
          const appJobId = app.job_id || app.id;
          const existing = sList.find((it: any) => it.job_id === appJobId) ||
            items.find((it: any) => it.job_id === appJobId);
          if (existing) {
            return { ...existing, applied: true };
          }
          return {
            job_id: appJobId,
            title: app.internship_title || app.title || app.job_title || 'Applied Job',
            company: app.company || app.company_name || '—',
            location: app.location || 'Remote',
            work_mode: app.work_mode || 'Remote',
            job_type: app.job_type || 'Internship',
            description: `Status: ${app.status || 'Submitted'} • Applied on ${app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}`,
            posted_date: app.applied_at,
            applied: true,
            saved: false,
          };
        });

        // On the Applied tab only apply type/mode filters; ignore search query
        // to avoid accidentally hiding applied jobs because user had typed something
        // in the search box on a different tab.
        const filtered = mapped.filter((j: any) => {
          const typeMatch = selectedType === 'All Types' || j.job_type === selectedType;
          const modeMatch = selectedMode === 'All Modes' || j.work_mode === selectedMode;
          return typeMatch && modeMatch;
        });
        setItems(filtered);
        setTotal(filtered.length);
        return;
      }

      // Default: tab === 'Recommended'
      const qs = new URLSearchParams(params).toString();
      const r: FeedResponse = await request(`/jobs/feed?${qs}`);
      setItems((prev) => append ? [...prev, ...(r.items || [])] : (r.items || []));
      setTotal(r.total || 0);
      setAllowedTypes(r.allowed_types || ['Internship']);
      if (r.message) toast.info('Filter unavailable', r.message);
    } catch (e: any) {
      toast.error('Failed to load jobs', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, careerSubTab, selectedType, selectedMode, q, page, toast, items]);

  useEffect(() => { setPage(1); loadFeed({ pageOverride: 1 }); }, [tab, careerSubTab, selectedType, selectedMode]); // eslint-disable-line

  // "X new jobs since you last visited"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await request('/jobs/new-since-last-visit');
        if (!cancelled && r?.new_count > 0) {
          toast.success(` ${r.new_count} new job${r.new_count === 1 ? '' : 's'} since your last visit`,
            'Pulled fresh from RemoteOK · ArbeitNow · The Muse · Remotive · Jobicy · Himalayas · HackerNews · WeWorkRemotely · etc.');
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadFeed({ pageOverride: 1 }); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed({ refresh: true, pageOverride: 1 });
    toast.success('Feed refreshed', 'Fetched the latest jobs from all 11 sources.');
  }, [loadFeed, toast]);

  const onLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadFeed({ append: true, pageOverride: nextPage });
  }, [page, loadFeed]);

  const openAlumniSheet = useCallback(async (job: Job) => {
    setAlumniLoadingJobs((prev) => {
      const next = new Set(prev);
      next.add(job.job_id);
      return next;
    });
    setAlumniSheet({
      job,
      items: [],
      total: 0,
      total_from_viewer_college: 0,
      loading: true,
    });
    try {
      const r: any = await request(`/jobs/${job.job_id}/alumni`);
      setAlumniSheet((prev) => {
        if (!prev) return prev;
        const items = r.items || [];
        return {
          job,
          items,
          total: r.total || items.length,
          total_from_viewer_college: r.total_from_viewer_college || 0,
          loading: false,
        };
      });
    } catch (e: any) {
      setAlumniSheet((prev) => (prev ? { ...prev, loading: false } : prev));
      toast.error('Could not load alumni', e?.message || 'Please try again.');
    } finally {
      setAlumniLoadingJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.job_id);
        return next;
      });
    }
  }, [toast]);

  const getAlumniCount = useCallback((job: Job) => {
    // Lazy-load on first open; after first load, reflect cached sheet
    const cached = alumniSheet?.job.job_id === job.job_id ? alumniSheet : null;
    if (cached && !cached.loading) return { items: cached.items, total: cached.total, fromCollege: cached.total_from_viewer_college };
    return null;
  }, [alumniSheet]);

  const submitReferral = useCallback(async () => {
    if (!referralModal) return;
    setSendingReferral(true);
    try {
      const r: any = await request('/referrals', {
        method: 'POST',
        body: { job_id: referralModal.job.job_id, alumni_id: referralModal.alumni.id, note: referralNote },
      });
      track('referral_requested', {
        job_id: referralModal.job.job_id,
        company: referralModal.job.company,
        alumni_id: referralModal.alumni.id,
        daily_used: r.daily_used,
        daily_limit: r.daily_limit,
      });
      toast.success('Referral requested', 'Your referral request has been sent. We will notify you when it is handled.');
      setReferralModal(null);
      setReferralNote('');
      setAlumniSheet((prev) => (prev ? { ...prev } : prev));
    } catch (e: any) {
      // Surface rate-limit and conflict errors verbatim
      toast.error('Referral not sent', e?.message || 'Please try again.');
    } finally {
      setSendingReferral(false);
    }
  }, [referralModal, referralNote, toast]);

  const onToggleSave = useCallback(async (job: Job) => {
    const next = !job.saved;
    setItems((arr) => arr.map((j) => j.job_id === job.job_id ? { ...j, saved: next } : j));
    try {
      await request(next ? '/jobs/save' : '/jobs/unsave', { method: 'POST', body: { job_id: job.job_id } } as any);

      // Update counts
      const savedRes: any = await request('/jobs/saved');
      setSavedJobs(savedRes.items || []);
    } catch (e: any) {
      setItems((arr) => arr.map((j) => j.job_id === job.job_id ? { ...j, saved: !next } : j));
      toast.error('Could not save', e?.message || 'Please try again.');
    }
  }, [toast]);

  const onApply = useCallback(async (job: Job) => {
    const url = (job.source_urls && job.source_urls[0]) || '';
    if (!url) { toast.warning('No apply link', 'This job did not include an apply URL.'); return; }
    if (Platform.OS === 'web') {
      try {
        const win = window.open(url, '_blank');
        if (win) {
          setApplyModalJob(job);
        } else {
          toast.error('Popup Blocked', 'Please allow popups in your browser to proceed.');
        }
      } catch (e: any) {
        toast.error('Could not open page', e?.message || 'Please try again.');
      }
    } else {
      Linking.openURL(url)
        .then(() => {
          setApplyModalJob(job);
        })
        .catch((err) => {
          toast.error('Could not open link', err?.message || 'No app available to open this link.');
        });
    }
  }, [toast]);

  const isTypeAllowed = (type: string) => {
    if (type === 'All Types' || type === 'Contract') return true;
    return allowedTypes.includes(type);
  };

  // Burst toast on save action
  const [burst, setBurst] = useState<{ show: boolean; label: string }>({ show: false, label: '' });

  const onToggleSaveWithBurst = useCallback(async (job: Job) => {
    const wasSaved = job.saved;
    await onToggleSave(job);
    if (!wasSaved) setBurst({ show: true, label: 'Job saved!' });
  }, [onToggleSave]);

  const generateCoverLetter = useCallback((job: Job) => {
    setGeneratingCover(true);
    setCoverModalJob(job);

    // Simulate AI generation delay
    setTimeout(() => {
      const name = authUser?.full_name || 'Aarav Student';
      const email = authUser?.email || 'aarav.student@studentalumni.in';
      const text = `Subject: Application for ${job.title} at ${job.company}

Dear Hiring Manager,

I am writing to express my enthusiastic interest in the ${job.title} position at ${job.company}. As a student with a strong academic foundation and hands-on project experience, I am confident in my ability to contribute value to your engineering team.

My technical background aligns well with this role. I have worked extensively on software development projects, building robust backend services and interactive frontends. I am particularly drawn to ${job.company} because of your scale and focus on innovative solutions. I am eager to apply my problem-solving skills to the challenges your team is tackling.

Thank you for your time and consideration. I would welcome the opportunity to discuss my qualifications further.

Sincerely,
${name}
${email}`;
      setCoverLetterText(text);
      setGeneratingCover(false);
    }, 1200);
  }, [authUser]);

  return (
    <View accessibilityLabel="Internships and jobs feed">
      <SuccessBurst visible={burst.show} onHide={() => setBurst({ show: false, label: '' })} label={burst.label} />
      {/* Premium Tab Bar and Dropdown Filters */}
      <View style={s.headerRow}>
        {/* Left side: Tabs */}
        <View style={s.tabsContainer}>
          {(['Recommended', 'Saved', 'Applied', 'Careers'] as const).map((t) => {
            const active = tab === t;
            let label: string = t;
            if (t === 'Saved') label = `Saved (${savedJobs.length})`;
            if (t === 'Applied') label = `Applied (${appliedRaw.length})`;
            if (t === 'Careers') label = `Direct Careers (${careerOpenings.length || careerApps.length})`;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  // Clear search query when switching tabs so it doesn't
                  // accidentally filter out results on the new tab
                  if (t !== tab) setQ('');
                  setTab(t);
                }}
                style={[s.tabButton, active && s.tabButtonActive]}
              >
                <Text style={[s.tabButtonText, active && s.tabButtonTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Right side: Dropdowns + Search */}
        <View style={s.filtersContainer}>
          <CustomDropdown
            value={selectedType}
            options={['All Types', 'Internship', 'Full-time', 'Contract']}
            disabledOptions={['Full-time', 'Contract'].filter(opt => !isTypeAllowed(opt))}
            onDisabledSelect={(opt) => {
              toast.info('Tier locked', `Year-1/2 students see internships only. Update your year in profile to unlock ${opt}.`);
            }}
            onSelect={(val) => {
              setSelectedType(val);
              setPage(1);
            }}
          />
          <CustomDropdown
            value={selectedMode}
            options={['All Modes', 'Remote', 'Hybrid', 'Onsite']}
            onSelect={(val) => {
              setSelectedMode(val);
              setPage(1);
            }}
          />
          <View style={s.searchBox}>
            <Search size={14} color="#64748B" />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search..."
              placeholderTextColor="#94A3B8"
              style={s.searchInput}
            />
          </View>
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            style={({ pressed }: any) => [
              s.refreshBtn,
              pressed && { opacity: 0.7 },
              refreshing && { opacity: 0.6 }
            ]}
          >
            {refreshing ? <ActivityIndicator size="small" color="#1E40AF" /> : <RefreshCcw size={13} color="#1E40AF" />}
          </Pressable>
        </View>
      </View>

      {/* Results meta */}
      <Text style={s.metaCount}>
        {loading ? 'Loading…' : `${total} match${total === 1 ? '' : 'es'}`}
      </Text>

      {/* List */}
      <View style={{ gap: 12, marginTop: 10 }}>
        {tab === 'Careers' ? (
          <View style={{ gap: 14 }}>
            {/* Top Sub-Navigation Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setCareerSubTab('openings')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: careerSubTab === 'openings' ? '#7C5CFC' : '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: careerSubTab === 'openings' ? '#FFFFFF' : '#475569' }}>
                    Available Openings ({careerOpenings.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCareerSubTab('applications')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: careerSubTab === 'applications' ? '#7C5CFC' : '#F1F5F9',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: careerSubTab === 'applications' ? '#FFFFFF' : '#475569' }}>
                    My Applications ({careerApps.length})
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = '/careers';
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}
              >
                <Text style={{ color: '#7C5CFC', fontSize: 13, fontFamily: FONTS.bold }}>
                  Explore Full Careers Portal
                </Text>
                <ExternalLink size={14} color="#7C5CFC" />
              </Pressable>
            </View>

            {/* Sub-view: Available Openings */}
            {careerSubTab === 'openings' ? (
              careerOpenings.length === 0 ? (
                <EmptyState
                  variant="generic"
                  title="No direct career openings published right now"
                  body="Super Admin has not published any openings yet. Check back soon or visit the Careers portal."
                  cta={{
                    label: 'Explore Careers Portal',
                    onPress: () => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/careers';
                      }
                    },
                  }}
                />
              ) : (
                careerOpenings.map((op: any) => {
                  const alreadyApplied = careerApps.some(
                    (a: any) =>
                      a.career_opening_id === (op.id || op._id) ||
                      a.opening?.id === (op.id || op._id)
                  );

                  return (
                    <View
                      key={op.id || op._id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: op.featured ? '#7C5CFC' : 'rgba(124, 92, 252, 0.22)',
                        borderWidth: 1.5,
                        borderRadius: 14,
                        padding: 18,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: 'rgba(124, 92, 252, 0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#7C5CFC', fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 }}>
                                FIRST-PARTY CAREER OPENING
                              </Text>
                            </View>
                            {op.featured && (
                              <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontFamily: FONTS.bold }}>FEATURED</Text>
                              </View>
                            )}
                            <Text style={{ color: '#64748B', fontSize: 11, fontFamily: FONTS.med }}>
                              • {op.work_mode || 'REMOTE'} • {op.employment_type?.replace('_', ' ') || 'FULL TIME'}
                            </Text>
                          </View>
                          <Text style={{ color: '#0F172A', fontSize: 18, fontFamily: FONTS.bold }}>
                            {op.title}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 13.5, fontFamily: FONTS.med, marginTop: 2 }}>
                            {op.company_name} {op.location ? `• ${op.location}` : ''}
                          </Text>
                        </View>

                        {alreadyApplied ? (
                          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#10B981' }}>
                            <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: '#10B981' }}>APPLIED</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                window.location.href = `/careers?openingId=${op.id || op._id}`;
                              }
                            }}
                            style={{
                              backgroundColor: '#7C5CFC',
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontFamily: FONTS.bold }}>Apply Direct</Text>
                          </Pressable>
                        )}
                      </View>

                      {op.description && (
                        <Text style={{ color: '#334155', fontSize: 13, lineHeight: 19, marginVertical: 6 }} numberOfLines={2}>
                          {op.description}
                        </Text>
                      )}

                      {op.skills_required && op.skills_required.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {op.skills_required.slice(0, 6).map((sk: string) => (
                            <View key={sk} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ color: '#475569', fontSize: 11.5, fontFamily: FONTS.med }}>{sk}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748B', fontSize: 12, fontFamily: FONTS.med }}>
                          {op.salary_range ? `Compensation: ${op.salary_range}` : 'Competitive compensation'}
                        </Text>
                        <Pressable
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.location.href = `/careers?openingId=${op.id || op._id}`;
                            }
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ color: '#7C5CFC', fontSize: 12, fontFamily: FONTS.bold }}>View Details</Text>
                          <ExternalLink size={12} color="#7C5CFC" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )
            ) : (
              /* Sub-view: My Applications */
              careerApps.length === 0 ? (
                <EmptyState
                  variant="generic"
                  title="No direct career applications yet"
                  body="Apply to verified first-party openings directly through the StudentAlumni Careers portal."
                  cta={{
                    label: 'Explore Careers Portal',
                    onPress: () => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/careers';
                      }
                    },
                  }}
                />
              ) : (
                careerApps.map((app) => {
                  const op = app.opening || {};
                  const st = (app.status || 'APPLIED').toUpperCase();
                  const isSelected = st === 'SELECTED';
                  const isRejected = st === 'REJECTED';
                  const isReview = st === 'UNDER_REVIEW' || st === 'SHORTLISTED' || st === 'INTERVIEW';

                  return (
                    <View
                      key={app.id || app._id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderColor: 'rgba(124, 92, 252, 0.25)',
                        borderWidth: 1.5,
                        borderRadius: 14,
                        padding: 18,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={{ backgroundColor: 'rgba(124, 92, 252, 0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#7C5CFC', fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 }}>
                                FIRST-PARTY CAREER APPLICATION
                              </Text>
                            </View>
                            {op.work_mode && (
                              <Text style={{ color: '#64748B', fontSize: 11, fontFamily: FONTS.med }}>
                                • {op.work_mode}
                              </Text>
                            )}
                          </View>
                          <Text style={{ color: '#0F172A', fontSize: 17, fontFamily: FONTS.bold }}>
                            {op.title || 'Career Opening'}
                          </Text>
                          <Text style={{ color: '#475569', fontSize: 13.5, fontFamily: FONTS.med, marginTop: 2 }}>
                            {op.company_name || 'StudentAlumni'}
                          </Text>
                        </View>

                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 8,
                            backgroundColor: isSelected
                              ? 'rgba(16, 185, 129, 0.12)'
                              : isRejected
                              ? 'rgba(239, 68, 68, 0.12)'
                              : isReview
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(59, 130, 246, 0.12)',
                            borderWidth: 1,
                            borderColor: isSelected
                              ? '#10B981'
                              : isRejected
                              ? '#EF4444'
                              : isReview
                              ? '#F59E0B'
                              : '#3B82F6',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11.5,
                              fontFamily: FONTS.bold,
                              color: isSelected
                                ? '#10B981'
                                : isRejected
                                ? '#EF4444'
                                : isReview
                                ? '#D97706'
                                : '#2563EB',
                            }}
                          >
                            {st.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>

                      <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#64748B', fontSize: 12, fontFamily: FONTS.med }}>
                          Applied: {app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </Text>
                        {app.resume_url ? (
                          <Pressable
                            onPress={() => { if (Platform.OS === 'web') window.open(app.resume_url, '_blank'); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Text style={{ color: '#7C5CFC', fontSize: 12, fontFamily: FONTS.bold }}>View Resume</Text>
                            <ExternalLink size={12} color="#7C5CFC" />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )
            )}
          </View>
        ) : loading && items.length === 0 ? (
          <SkeletonList n={5} kind="job" gap={12} />
        ) : items.length === 0 ? (
          tab === 'Saved' ? (
            <EmptyState
              variant="savedJobs"
              title="No saved jobs yet"
              body="Bookmark roles you love by tapping the ribbon icon — they'll appear here for easy revisits."
              cta={{ label: 'Browse all jobs', onPress: () => setTab('Recommended') }}
            />
          ) : tab === 'Applied' ? (
            <EmptyState
              variant="generic"
              title="No applied jobs yet"
              body="Start applying to jobs to track their progress here."
              cta={{ label: 'Browse all jobs', onPress: () => setTab('Recommended') }}
            />
          ) : (
            <EmptyState
              variant="generic"
              title="No matches yet"
              body="Try a different filter, broaden your search, or hit refresh to pull the latest jobs from all 11 sources."
              cta={{ label: 'Refresh feed', onPress: onRefresh }}
            />
          )
        ) : items.map((j) => (
          <JobCard
            key={j.job_id}
            job={j}
            onSave={onToggleSaveWithBurst}
            onApply={onApply}
            onCoverLetter={generateCoverLetter}
            onWhyMatch={setWhyMatchJob}
            onAlumni={openAlumniSheet}
            alumniCount={getAlumniCount(j)}
          />
        ))}

        {/* Load more */}
        {!loading && tab === 'Recommended' && items.length < total && (
          <Pressable onPress={onLoadMore} style={s.loadMore}>
            <Text style={s.loadMoreTxt}>Load more · {total - items.length} remaining</Text>
          </Pressable>
        )}
      </View>

      {/* Did you apply modal? */}
      <Modal
        visible={applyModalJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setApplyModalJob(null)}
      >
        <View style={s.modalBg}>
          <GlassCard radius={16} padding={22} style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalIconDisc}>
                <Briefcase size={18} color="#FCD34D" />
              </View>
              <Text style={s.modalTitle}>Applying to External Job?</Text>
            </View>
            <Text style={s.modalText}>
              We redirected you to the recruiter's page for{" "}
              <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>
                {applyModalJob?.title}
              </Text>{" "}
              at{" "}
              <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>
                {applyModalJob?.company}
              </Text>.
            </Text>
            <Text style={s.modalSubtext}>
              Once you finish submitting your details on their platform, confirm it here to track its progress in your dashboard!
            </Text>

            <View style={s.modalBtnRow}>
              <Pressable
                onPress={() => setApplyModalJob(null)}
                style={({ hovered }: any) => [
                  s.modalCancelBtn,
                  hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }
                ]}
              >
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (!applyModalJob) return;
                  const job = applyModalJob;
                  setApplyModalJob(null);
                  try {
                    await request(`/student/internships/${job.job_id}/apply`, {
                      method: 'POST',
                      body: {
                        student_email: authUser?.email || undefined,
                        cover_note: 'Applied via external redirection link.'
                      }
                    });
                    toast.success(
                      'Application Tracked! ',
                      `Successfully added ${job.title} at ${job.company} to your My Applications dashboard.`
                    );

                    // Update lists
                    const appliedRes: any = await request(`/student/my-applications?email=${encodeURIComponent(authUser?.email || '')}`);
                    setAppliedRaw(appliedRes.items || []);

                    setItems((arr) =>
                      arr.map((j) =>
                        j.job_id === job.job_id ? { ...j, applied: true } : j
                      )
                    );
                  } catch (err: any) {
                    toast.error('Could not track application', err.message);
                  }
                }}
              >
                <LinearGradient
                  colors={[GRAD.from, GRAD.to]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.modalConfirmBtn}
                >
                  <Text style={s.modalConfirmTxt}>Yes, I've Applied</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* AI Cover Letter Modal */}
      <Modal
        visible={coverModalJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCoverModalJob(null)}
      >
        <View style={s.modalBg}>
          <GlassCard radius={16} padding={22} style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalIconDisc}>
                <Sparkles size={18} color="#3B82F6" />
              </View>
              <Text style={s.modalTitle}>AI Cover Letter Draft</Text>
            </View>

            {generatingCover ? (
              <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13 }}>
                  Drafting professional cover letter...
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}>
                  Tailored for {coverModalJob?.title} at {coverModalJob?.company}:
                </Text>
                <View style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: 10,
                  padding: 12,
                  maxHeight: 300,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)'
                }}>
                  <TextInput
                    multiline
                    value={coverLetterText}
                    onChangeText={setCoverLetterText}
                    style={{
                      color: '#FFFFFF',
                      fontFamily: FONTS.med,
                      fontSize: 12,
                      lineHeight: 16,
                      height: 250,
                      textAlignVertical: 'top'
                    }}
                  />
                </View>
                <View style={[s.modalBtnRow, { marginTop: 16 }]}>
                  <Pressable
                    onPress={() => setCoverModalJob(null)}
                    style={s.modalCancelBtn}
                  >
                    <Text style={s.modalCancelTxt}>Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Clipboard.setString(coverLetterText);
                      toast.success('Copied! ', 'Cover letter copied to clipboard.');
                    }}
                    style={{
                      backgroundColor: '#1E40AF',
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12.5 }}>
                      Copy to Clipboard
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </GlassCard>
        </View>
      </Modal>

      {/* Why Match Modal */}
      <Modal
        visible={whyMatchJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setWhyMatchJob(null)}
      >
        <View style={s.modalBg}>
          <GlassCard radius={16} padding={22} style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconDisc, { backgroundColor: 'rgba(30,64,175,0.16)', borderColor: 'rgba(30,64,175,0.40)' }]}>
                <Sparkles size={18} color="#60A5FA" />
              </View>
              <Text style={s.modalTitle}>Why Match?</Text>
            </View>

            <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14, marginBottom: 12 }}>
              Skills & Profile Alignment
            </Text>
            <Text style={s.modalText}>
              Our AI matched your profile with <Text style={{ color: '#60A5FA', fontFamily: FONTS.bold }}>{whyMatchJob?.company}</Text>'s requirements:
            </Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={{ color: SC.muted, fontSize: 12.5, fontFamily: FONTS.med }}>
                  Your skills in <Text style={{ color: '#FFFFFF' }}>{(whyMatchJob?.tags || []).slice(0, 2).join(', ') || 'related tech'}</Text> match the job tags.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={{ color: SC.muted, fontSize: 12.5, fontFamily: FONTS.med }}>
                  Your academic tier and year are preferred by this recruiter.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={{ color: SC.muted, fontSize: 12.5, fontFamily: FONTS.med }}>
                  Location preference and work mode match your selection.
                </Text>
              </View>
            </View>

            <View style={s.modalBtnRow}>
              <Pressable
                onPress={() => setWhyMatchJob(null)}
                style={{
                  backgroundColor: '#1E40AF',
                  borderRadius: 10,
                  paddingHorizontal: 18,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12.5 }}>
                  Awesome
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Alumni Referrals Sheet */}
      <Modal
        visible={alumniSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAlumniSheet(null)}
      >
        <View style={s.modalBg}>
          <GlassCard radius={16} padding={22} style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconDisc, { backgroundColor: 'rgba(37,99,235,0.16)', borderColor: 'rgba(37,99,235,0.40)' }]}>
                <Users size={18} color="#60A5FA" />
              </View>
              <Text style={s.modalTitle}>
                {alumniSheet?.total_from_viewer_college ? `${alumniSheet.total_from_viewer_college} alumni from your college at ${alumniSheet.job.company}` : `Alumni at ${alumniSheet?.job.company}`}
              </Text>
            </View>
            <Text style={s.modalSubtext}>
              Asking for a referral for <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>{alumniSheet?.job.title}</Text>?
            </Text>

            {alumniSheet?.loading ? (
              <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13 }}>Finding alumni...</Text>
              </View>
            ) : (alumniSheet?.items || []).length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13 }}>
                  No matching alumni available yet. Try another company.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8, marginBottom: 16 }}>
                {(alumniSheet?.items || []).map((a: AlumniEntry) => {
                  const myReq = myReferralFor(alumniSheet!.job.job_id, a.id);
                  const chip = myReq
                    ? { label: myReq.status === 'requested' ? 'Requested' : myReq.status, tone: myReq.status === 'accepted' || myReq.status === 'referred' ? 'ok' : 'warn' }
                    : null;
                  return (
                    <View key={a.id} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {a.photo ? (
                          Platform.OS === 'web'
                            ? <img src={a.photo} style={{ width: 34, height: 34, borderRadius: 17 }} alt="" />
                            : <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 }}>{(a.name || '?').slice(0, 1).toUpperCase()}</Text>
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 }}>{(a.name || '?').slice(0, 1).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 13 }}>{a.name}</Text>
                          {a.is_connected && (
                            <View style={{
                              backgroundColor: 'rgba(16,185,129,0.12)',
                              borderWidth: 1,
                              borderColor: 'rgba(16,185,129,0.35)',
                              borderRadius: 5,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                            }}>
                              <Text style={{ color: '#10B981', fontFamily: FONTS.bold, fontSize: 9 }}>Connected</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 }}>
                          {[a.role, a.college, a.grad_year ? `Class of ${a.grad_year}` : null].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        {a.accepts_referrals && (
                          <View style={{
                            backgroundColor: 'rgba(16,185,129,0.10)',
                            borderWidth: 1,
                            borderColor: 'rgba(16,185,129,0.30)',
                            borderRadius: 5,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}>
                            <Text style={{ color: '#10B981', fontFamily: FONTS.bold, fontSize: 9 }}>Open to referrals</Text>
                          </View>
                        )}
                        {chip && (
                          <View style={{
                            backgroundColor: chip.tone === 'ok' ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.12)',
                            borderWidth: 1,
                            borderColor: chip.tone === 'ok' ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.35)',
                            borderRadius: 5,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}>
                            <Text style={{ color: chip.tone === 'ok' ? '#10B981' : '#F59E0B', fontFamily: FONTS.bold, fontSize: 9 }}>{chip.label}</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        disabled={!a.accepts_referrals || (myReq && myReq.status !== 'declined')}
                        onPress={() => {
                          setReferralModal({ job: alumniSheet!.job, alumni: a });
                          setReferralNote('');
                        }}
                        accessibilityRole="button"
                        style={({ pressed, hovered }: any) => [
                          {
                            borderWidth: 1,
                            borderColor: 'rgba(37,99,235,0.30)',
                            backgroundColor: 'rgba(37,99,235,0.08)',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            height: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: (!a.accepts_referrals || (myReq && myReq.status !== 'declined')) ? 0.45 : 1,
                          },
                          (pressed || hovered) && { opacity: 0.75 },
                        ]}
                      >
                        <Text style={{ color: a.accepts_referrals ? '#60A5FA' : '#64748B', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                          {!a.accepts_referrals ? 'Not open' : myReq ? 'Requested' : 'Request a referral'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={s.modalBtnRow}>
              <Pressable
                onPress={() => setAlumniSheet(null)}
                style={[s.modalCancelBtn]}
              >
                <Text style={s.modalCancelTxt}>Close</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Referral Request Modal */}
      <Modal
        visible={referralModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReferralModal(null)}
      >
        <View style={s.modalBg}>
          <GlassCard radius={16} padding={22} style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconDisc, { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.40)' }]}>
                <UserPlus size={18} color="#34D399" />
              </View>
              <Text style={s.modalTitle}>Request a referral</Text>
            </View>
            <Text style={s.modalText}>
              Ask <Text style={{ fontFamily: FONTS.bold, color: '#34D399' }}>{referralModal?.alumni.name}</Text> to refer you for{' '}
              <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>{referralModal?.job.title}</Text> at{' '}
              <Text style={{ fontFamily: FONTS.bold, color: '#FFFFFF' }}>{referralModal?.job.company}</Text>.
            </Text>
            <TextInput
              value={referralNote}
              onChangeText={(t) => setReferralNote(t.slice(0, 500))}
              placeholder="Add a short note (optional, up to 500 characters)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              style={{
                flex: 1,
                minHeight: 90,
                backgroundColor: 'rgba(0,0,0,0.30)',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#FFFFFF',
                fontFamily: FONTS.med,
                fontSize: 13,
                marginBottom: 10,
              }}
            />
            <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginBottom: 16, textAlign: 'right' }}>
              {referralNote.length}/500
            </Text>
            <View style={s.modalBtnRow}>
              <Pressable
                onPress={() => setReferralModal(null)}
                style={[s.modalCancelBtn]}
              >
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={sendingReferral}
                onPress={submitReferral}
                accessibilityRole="button"
                style={({ pressed }: any) => [
                  {
                    backgroundColor: '#0F766E',
                    borderRadius: 10,
                    paddingHorizontal: 18,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    opacity: sendingReferral ? 0.6 : 1,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {sendingReferral
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <UserPlus size={13} color="#FFFFFF" />}
                <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12.5 }}>
                  {sendingReferral ? 'Sending...' : 'Send request'}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

/* ── Card ───────────────────────────────────────────────────────────── */
function JobCard({
  job,
  onSave,
  onApply,
  onCoverLetter,
  onWhyMatch,
  onAlumni,
  alumniCount,
}: {
  job: Job;
  onSave: (j: Job) => void;
  onApply: (j: Job) => void;
  onCoverLetter: (j: Job) => void;
  onWhyMatch: (j: Job) => void;
  onAlumni?: (j: Job) => void;
  alumniCount?: { items: AlumniEntry[]; total: number; fromCollege: number } | null;
}) {
  const initials = (job.company || '?').slice(0, 1).toUpperCase();
  const logoBg = pickColor(job.company || '');
  const { matchPct, applicants, closes, duration, fallbackSalary } = getStableMockData(job.job_id, job.company, job.job_type);
  const salary = formatSalary(job) || fallbackSalary;
  const timeAgo = formatTimeAgo(job.posted_date);

  return (
    <View style={{
      position: 'relative',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      ...(Platform.OS === 'web' ? { boxShadow: '0 2px 12px rgba(0,0,0,0.07)' } as any : { elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 }),
    }}>
      {/* Top right match badge and save bookmark */}
      <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 }}>
        {job.is_recommended && (
          <View style={{
            backgroundColor: 'rgba(37,99,235,0.08)',
            borderColor: 'rgba(37,99,235,0.25)',
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }}>
            <Text style={{ fontSize: 10 }}></Text>
            <Text style={{ color: '#2563EB', fontFamily: FONTS.bold, fontSize: 10 }}>Recommended</Text>
          </View>
        )}
        <View style={{
          backgroundColor: 'rgba(37,99,235,0.08)',
          borderColor: 'rgba(37,99,235,0.20)',
          borderWidth: 1,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{ color: '#2563EB', fontFamily: FONTS.bold, fontSize: 10 }}>{job.match_score !== undefined ? `${job.match_score}%` : `+${matchPct}%`} match</Text>
        </View>
        <Pressable
          onPress={() => onSave(job)}
          style={{ padding: 4 }}
          accessibilityRole="button"
        >
          {job.saved ? (
            <BookmarkCheck size={18} color="#2563EB" />
          ) : (
            <Bookmark size={18} color="#94A3B8" />
          )}
        </Pressable>
      </View>

      {/* Main Row */}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        {/* Logo box */}
        <View style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          backgroundColor: logoBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 20 }}>{initials}</Text>
        </View>

        {/* Details Column */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Job Title */}
          <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 16, letterSpacing: -0.2 }}>
            {job.title || '—'}
          </Text>

          {/* Company and Location */}
          <Text style={{ color: '#64748B', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 }}>
            <Text
              style={{ color: '#2563EB', ...(Platform.OS === 'web' ? { cursor: 'pointer', textDecorationLine: 'underline' } : { textDecorationLine: 'underline' }) }}
              onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(job.company || '')}`)}
            >
              {job.company}
            </Text> · {job.location || 'Remote'}
          </Text>

          {/* Tags row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
            {/* Job Type Tag */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}>
              <Briefcase size={10} color="#059669" />
              <Text style={{ color: '#065F46', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                {job.job_type}
              </Text>
            </View>

            {/* Mode Tag */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#F1F5F9',
              borderColor: 'rgba(0,0,0,0.08)',
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}>
              <Globe2 size={10} color="#475569" />
              <Text style={{ color: '#334155', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                {job.work_mode}
              </Text>
            </View>

            {/* Salary Tag */}
            {salary && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                borderColor: 'rgba(30, 64, 175, 0.25)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <IndianRupee size={10} color="#1D4ED8" />
                <Text style={{ color: '#1E3A8A', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                  {salary}
                </Text>
              </View>
            )}

            {/* Duration Tag */}
            {duration && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#F1F5F9',
                borderColor: 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{ color: '#334155', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                  {duration}
                </Text>
              </View>
            )}

            {/* Time Ago Tag */}
            {timeAgo && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#F1F5F9',
                borderColor: 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Clock size={10} color="#475569" />
                <Text style={{ color: '#1E293B', fontFamily: FONTS.med, fontSize: 10.5 }}>
                  {timeAgo}
                </Text>
              </View>
            )}
          </View>



          {/* Alumni Referrals Row */}
          {onAlumni && (alumniCount ? alumniCount.total > 0 : true) && (
            <Pressable
              onPress={() => onAlumni(job)}
              accessibilityRole="button"
              style={({ pressed }: any) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 12,
                  borderRadius: 8,
                  padding: 8,
                },
                pressed && { backgroundColor: 'rgba(37,99,235,0.05)' },
              ]}
            >
              {alumniCount ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {(alumniCount.items || []).slice(0, 3).map((a: AlumniEntry, i: number) => (
                      <View key={a.id} style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#E2E8F0',
                        borderWidth: 1,
                        borderColor: '#FFFFFF',
                        marginLeft: i > 0 ? -8 : 0,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 9, color: '#475569', fontFamily: FONTS.bold }}>
                          {(a.name || '?').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ color: '#2563EB', fontFamily: FONTS.bold, fontSize: 11 }}>
                    {alumniCount.total} alumni work here
                    {alumniCount.fromCollege > 0 ? ` · ${alumniCount.fromCollege} from your college` : ''}
                    {' '}
                    · View
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Users size={11} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontFamily: FONTS.bold, fontSize: 11 }}>
                    See alumni at {job.company}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {/* Footer Info & Actions */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            borderTopWidth: 1,
            borderTopColor: 'rgba(0,0,0,0.06)',
            paddingTop: 14,
            flexWrap: 'wrap',
            gap: 12,
          }}>
            {/* Footer details */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Applicants */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={12} color="#94A3B8" />
                <Text style={{ color: '#64748B', fontFamily: FONTS.med, fontSize: 11.5 }}>
                  {applicants.toLocaleString()} applicants
                </Text>
              </View>

              <Text style={{ color: 'rgba(0,0,0,0.15)' }}>·</Text>

              {/* Closes date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#94A3B8" />
                <Text style={{ color: '#64748B', fontFamily: FONTS.med, fontSize: 11.5 }}>
                  {closes}
                </Text>
              </View>

              <Text style={{ color: 'rgba(0,0,0,0.12)' }}>·</Text>

              {/* Why Match */}
              <Pressable
                onPress={() => onWhyMatch(job)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(37,99,235,0.08)',
                  borderColor: 'rgba(37,99,235,0.22)',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Sparkles size={11} color="#2563EB" />
                <Text style={{ color: '#2563EB', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                  Why match?
                </Text>
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => onCoverLetter(job)}
                style={({ pressed }: any) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    borderWidth: 1,
                    borderColor: 'rgba(37,99,235,0.20)',
                    backgroundColor: 'rgba(37,99,235,0.06)',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 32,
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Sparkles size={12} color="#2563EB" />
                <Text style={{ color: '#1E40AF', fontFamily: FONTS.bold, fontSize: 11.5 }}>
                  Cover Letter
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onApply(job)}
                style={({ pressed }: any) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#1E40AF',
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    height: 32,
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 11.5 }}>
                  {job.applied ? 'Applied Now' : 'Apply'}
                </Text>
                <ExternalLink size={11} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */
function formatSalary(j: Job): string {
  if (j.salary_min || j.salary_max) {
    const cur = j.currency || 'USD';
    const sym = cur === 'INR' ? '₹' : cur === 'EUR' ? '€' : '$';
    if (j.salary_min && j.salary_max) return `${sym}${shortMoney(j.salary_min)}–${sym}${shortMoney(j.salary_max)}/yr`;
    if (j.salary_min) return `${sym}${shortMoney(j.salary_min)}+/yr`;
  }
  return '';
}

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const COLOR_PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#60A5FA', '#EC4899', '#F97316', '#06B6D4', '#84CC16'];
function pickColor(seed: string): string {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getStableMockData(jobId: string, company: string, jobType: string) {
  const hash = hashCode(jobId || company || 'default');

  const matchPct = 82 + (hash % 16);
  const applicants = (hash % 230) * 10 + 80;
  const closesOptions = ['Rolling', 'Closes Jul 15, 2026', 'Closes Aug 1, 2026', 'Closes Sep 30, 2026'];
  const closes = closesOptions[hash % closesOptions.length];
  const duration = jobType === 'Internship' ? `${(hash % 2) ? 3 : 6} months` : 'Full-time';

  // Realistic fallback salary
  let fallbackSalary = '';
  if (jobType === 'Internship') {
    const salaries = ['₹35,000/mo', '₹60,000/mo', '₹85,000/mo', '₹1,20,000/mo'];
    fallbackSalary = salaries[hash % salaries.length];
  } else {
    const salaries = ['₹8-12 LPA', '₹14-18 LPA', '₹22-28 LPA', '₹32-38 LPA'];
    fallbackSalary = salaries[hash % salaries.length];
  }

  return { matchPct, applicants, closes, duration, fallbackSalary };
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '2 days ago';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    return `${diffWeeks} weeks ago`;
  } catch {
    return '2 days ago';
  }
}

/* ── Styles ────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ overflow: 'visible' } as any) : {}),
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderColor: 'rgba(15,38,71,0.08)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
  },
  tabButtonText: {
    color: '#1E293B',
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ overflow: 'visible' } as any) : {}),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 200,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#F5F7FC',
    borderColor: 'rgba(15,38,71,0.12)',
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    color: '#1E293B',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F7FC',
    borderColor: 'rgba(15,38,71,0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaCount: { color: '#1E293B', fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 4 },

  loadMore: {
    alignSelf: 'center', marginTop: 14, paddingHorizontal: 22, height: 38, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F7FC', borderColor: 'rgba(15,38,71,0.12)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  loadMoreTxt: { color: '#3B82F6', fontFamily: FONTS.bold, fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 99999 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: '#F5F7FC', borderColor: 'rgba(15,38,71,0.12)', borderWidth: 1, borderRadius: 16, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIconDisc: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(30,64,175,0.16)', borderColor: 'rgba(30,64,175,0.40)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#0F172A', fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.3 },
  modalText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  modalSubtext: { color: SC.dim, fontFamily: FONTS.med, fontSize: 12, lineHeight: 16, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingHorizontal: 16, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  modalCancelTxt: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  modalConfirmBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 18, height: 36, borderRadius: 10 },
  modalConfirmTxt: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 12.5 },
});
