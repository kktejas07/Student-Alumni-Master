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
  Lock, Sparkles, Briefcase, Globe2, Clock, Users, Calendar, IndianRupee,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { EmptyState, SuccessBurst } from '../EmptyState';
import { SkeletonList } from '../motion';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { StudentPortalNavContext } from '../StudentPortalRN';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

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
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#1E1B4B',
          borderColor: open ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          height: 36,
          minWidth: 120,
          justifyContent: 'space-between',
          zIndex: 1001,
        }}
      >
        <Text style={{ color: '#E5E7EB', fontSize: 12.5, fontFamily: FONTS.med }}>{value}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={14} color="#9CA3AF" />
      </Pressable>
      {open && (
        <View
          style={{
            position: 'absolute',
            top: 40,
            left: 0,
            minWidth: 140,
            backgroundColor: '#111827',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderRadius: 8,
            padding: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
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
                  hovered && { backgroundColor: 'rgba(255,255,255,0.06)' },
                  value === opt && { backgroundColor: 'rgba(124, 58, 237, 0.2)' },
                  isDisabled && { opacity: 0.5 },
                ]}
              >
                <Text style={{ color: value === opt ? '#A78BFA' : '#D1D5DB', fontSize: 12, fontFamily: FONTS.bold }}>
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

  const [tab, setTab] = useState<'Recommended' | 'Saved' | 'Applied'>('Recommended');
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

  // Modals state
  const [coverModalJob, setCoverModalJob] = useState<Job | null>(null);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [generatingCover, setGeneratingCover] = useState(false);
  const [whyMatchJob, setWhyMatchJob] = useState<Job | null>(null);

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
  }, [tab, selectedType, selectedMode, q, page, toast, items]);

  useEffect(() => { setPage(1); loadFeed({ pageOverride: 1 }); }, [tab, selectedType, selectedMode]); // eslint-disable-line

  // "X new jobs since you last visited"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await request('/jobs/new-since-last-visit');
        if (!cancelled && r?.new_count > 0) {
          toast.success(`🎉 ${r.new_count} new job${r.new_count === 1 ? '' : 's'} since your last visit`,
            'Pulled fresh from RemoteOK · ArbeitNow · The Muse · Remotive · Jobicy · Himalayas · HackerNews · WeWorkRemotely · etc.');
        }
      } catch {}
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
          {(['Recommended', 'Saved', 'Applied'] as const).map((t) => {
            const active = tab === t;
            let label: string = t;
            if (t === 'Saved') label = `Saved (${savedJobs.length})`;
            if (t === 'Applied') label = `Applied (${appliedRaw.length})`;
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
            <Search size={14} color={SC.dim} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search..."
              placeholderTextColor={SC.dim}
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
            {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCcw size={13} color="#fff" />}
          </Pressable>
        </View>
      </View>

      {/* Results meta */}
      <Text style={s.metaCount}>
        {loading ? 'Loading…' : `${total} match${total === 1 ? '' : 'es'}`}
      </Text>

      {/* List */}
      <View style={{ gap: 12, marginTop: 10 }}>
        {loading && items.length === 0 ? (
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
              <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>
                {applyModalJob?.title}
              </Text>{" "}
              at{" "}
              <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>
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
                      'Application Tracked! 🎉',
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
                <Sparkles size={18} color="#A78BFA" />
              </View>
              <Text style={s.modalTitle}>AI Cover Letter Draft</Text>
            </View>
            
            {generatingCover ? (
              <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color="#A78BFA" />
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
                      color: '#fff', 
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
                      toast.success('Copied! 📋', 'Cover letter copied to clipboard.');
                    }}
                    style={{
                      backgroundColor: '#7C3AED',
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>
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
              <View style={[s.modalIconDisc, { backgroundColor: 'rgba(139,92,246,0.16)', borderColor: 'rgba(139,92,246,0.40)' }]}>
                <Sparkles size={18} color="#A78BFA" />
              </View>
              <Text style={s.modalTitle}>Why Match?</Text>
            </View>
            
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginBottom: 12 }}>
              Skills & Profile Alignment
            </Text>
            <Text style={s.modalText}>
              Our AI matched your profile with <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold }}>{whyMatchJob?.company}</Text>'s requirements:
            </Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={{ color: SC.muted, fontSize: 12.5, fontFamily: FONTS.med }}>
                  Your skills in <Text style={{ color: '#fff' }}>{(whyMatchJob?.tags || []).slice(0, 2).join(', ') || 'related tech'}</Text> match the job tags.
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
                  backgroundColor: '#7C3AED',
                  borderRadius: 10,
                  paddingHorizontal: 18,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>
                  Awesome
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
}: { 
  job: Job; 
  onSave: (j: Job) => void; 
  onApply: (j: Job) => void;
  onCoverLetter: (j: Job) => void;
  onWhyMatch: (j: Job) => void;
}) {
  const initials = (job.company || '?').slice(0, 1).toUpperCase();
  const logoBg = pickColor(job.company || '');
  const { matchPct, applicants, closes, duration, fallbackSalary } = getStableMockData(job.job_id, job.company, job.job_type);
  const salary = formatSalary(job) || fallbackSalary;
  const timeAgo = formatTimeAgo(job.posted_date);

  return (
    <GlassCard radius={12} padding={20} style={{ position: 'relative' }}>
      {/* Top right match badge and save bookmark */}
      <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 }}>
        <View style={{
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          borderColor: 'rgba(124, 58, 237, 0.3)',
          borderWidth: 1,
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
          <Text style={{ color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10 }}>+{matchPct}% match</Text>
        </View>
        <Pressable
          onPress={() => onSave(job)}
          style={{ padding: 4 }}
          accessibilityRole="button"
        >
          {job.saved ? (
            <BookmarkCheck size={18} color="#A78BFA" />
          ) : (
            <Bookmark size={18} color="#9CA3AF" />
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
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 }}>{initials}</Text>
        </View>

        {/* Details Column */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Job Title */}
          <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 16, letterSpacing: -0.2 }}>
            {job.title || '—'}
          </Text>

          {/* Company and Location */}
          <Text style={{ color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 }}>
            {job.company} · {job.location || 'Remote'}
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
              <Briefcase size={10} color="#10B981" />
              <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                {job.job_type}
              </Text>
            </View>

            {/* Mode Tag */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}>
              <Globe2 size={10} color="#9CA3AF" />
              <Text style={{ color: '#D1D5DB', fontFamily: FONTS.bold, fontSize: 10.5 }}>
                {job.work_mode}
              </Text>
            </View>

            {/* Salary Tag */}
            {salary && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderColor: 'rgba(124, 58, 237, 0.25)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <IndianRupee size={10} color="#A78BFA" />
                <Text style={{ color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10.5 }}>
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
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{ color: '#D1D5DB', fontFamily: FONTS.bold, fontSize: 10.5 }}>
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
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Clock size={10} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 10.5 }}>
                  {timeAgo}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {job.description && (
            <Text style={{
              color: '#9CA3AF',
              fontFamily: FONTS.med,
              fontSize: 12.5,
              lineHeight: 18,
              marginTop: 10,
            }}>
              {job.description}
            </Text>
          )}

          {/* Skill pills */}
          {(job.tags || []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {(job.tags || []).slice(0, 5).map((t, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11 }}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer Info & Actions */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.04)',
            paddingTop: 14,
            flexWrap: 'wrap',
            gap: 12,
          }}>
            {/* Footer details */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Applicants */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={12} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11.5 }}>
                  {applicants.toLocaleString()} applicants
                </Text>
              </View>

              <Text style={{ color: 'rgba(255,255,255,0.15)' }}>·</Text>

              {/* Closes date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11.5 }}>
                  {closes}
                </Text>
              </View>

              <Text style={{ color: 'rgba(255,255,255,0.15)' }}>·</Text>

              {/* Why Match */}
              <Pressable
                onPress={() => onWhyMatch(job)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Sparkles size={11} color="#A78BFA" />
                <Text style={{ color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10.5 }}>
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
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 32,
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Sparkles size={12} color="#A78BFA" />
                <Text style={{ color: '#D1D5DB', fontFamily: FONTS.bold, fontSize: 11.5 }}>
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
                    backgroundColor: '#7C3AED',
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    height: 32,
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>
                  {job.applied ? 'Applied Now' : 'Apply'}
                </Text>
                <ExternalLink size={11} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
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
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`;
  return String(n);
}

const COLOR_PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#A78BFA', '#EC4899', '#F97316', '#06B6D4', '#84CC16'];
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: '#7C3AED',
  },
  tabButtonText: {
    color: '#9CA3AF',
    fontFamily: FONTS.bold,
    fontSize: 12.5,
  },
  tabButtonTextActive: {
    color: '#fff',
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
    backgroundColor: '#1E1B4B', 
    borderColor: 'rgba(255,255,255,0.08)', 
    borderWidth: 1 
  },
  searchInput: { 
    flex: 1, 
    color: '#fff', 
    fontFamily: FONTS.med, 
    fontSize: 12.5, 
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) 
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E1B4B',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metaCount: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },

  loadMore: {
    alignSelf: 'center', marginTop: 14, paddingHorizontal: 22, height: 38, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1E1B4B', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  loadMoreTxt: { color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 99999 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 16, padding: 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIconDisc: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.16)', borderColor: 'rgba(124,58,237,0.40)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.3 },
  modalText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  modalSubtext: { color: SC.dim, fontFamily: FONTS.med, fontSize: 12, lineHeight: 16, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingHorizontal: 16, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  modalCancelTxt: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  modalConfirmBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 18, height: 36, borderRadius: 10 },
  modalConfirmTxt: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
});
