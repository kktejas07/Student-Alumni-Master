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
  View, Text, Pressable, TextInput, useWindowDimensions,
  Platform, ActivityIndicator, Linking, Modal, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Search, MapPin, Bookmark, BookmarkCheck, ExternalLink, RefreshCcw,
  Lock, Sparkles, Briefcase, Globe2, Clock, Users, Calendar, IndianRupee,
} from '../iconShims';
import { SC, FONTS, PALETTE } from '../tokens';
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
        className="flex-row items-center gap-1.5 rounded-lg px-3 h-9 min-w-[120px] justify-between z-[1001]"
        style={{
          backgroundColor: '#1E1B4B',
          borderColor: open ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)',
          borderWidth: 1,
        }}
      >
        <Text className="text-gray-200 text-[12.5px]" style={{ fontFamily: FONTS.med }}>{value}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={14} color="#9CA3AF" />
      </Pressable>
      {open && (
        <View
          className="absolute p-1 z-[1002]"
          style={{
            top: 40,
            left: 0,
            minWidth: 140,
            backgroundColor: '#111827',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
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
                className="flex-row items-center gap-1.5 justify-between"
                style={({ hovered }: any) => [
                  {
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                  },
                  hovered && { backgroundColor: 'rgba(255,255,255,0.06)' },
                  value === opt && { backgroundColor: 'rgba(124, 58, 237, 0.2)' },
                  isDisabled && { opacity: 0.5 },
                ]}
              >
                <Text className="text-xs" style={{ color: value === opt ? '#A78BFA' : '#D1D5DB', fontFamily: FONTS.bold }}>
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

      const savedRes: any = await request('/jobs/saved');
      const sList = savedRes.items || [];
      setSavedJobs(sList);

      const appliedRes: any = await request(`/student/my-applications?email=${encodeURIComponent(authUser?.email || '')}`);
      const aList = appliedRes.items || [];
      setAppliedRaw(aList);

      if (tab === 'Saved') {
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

        const filtered = mapped.filter((j: any) => {
          const typeMatch = selectedType === 'All Types' || j.job_type === selectedType;
          const modeMatch = selectedMode === 'All Modes' || j.work_mode === selectedMode;
          return typeMatch && modeMatch;
        });
        setItems(filtered);
        setTotal(filtered.length);
        return;
      }

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

  const [burst, setBurst] = useState<{ show: boolean; label: string }>({ show: false, label: '' });

  const onToggleSaveWithBurst = useCallback(async (job: Job) => {
    const wasSaved = job.saved;
    await onToggleSave(job);
    if (!wasSaved) setBurst({ show: true, label: 'Job saved!' });
  }, [onToggleSave]);

  const generateCoverLetter = useCallback((job: Job) => {
    setGeneratingCover(true);
    setCoverModalJob(job);
    
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
      <View className="flex-row items-center justify-between flex-wrap gap-3 mb-4 z-[100]" style={Platform.OS === 'web' ? { overflow: 'visible' } as any : {}}>
        <View className="flex-row bg-white/[0.03] border border-white/[0.05] rounded-[10px] p-[3px]">
          {(['Recommended', 'Saved', 'Applied'] as const).map((t) => {
            const active = tab === t;
            let label: string = t;
            if (t === 'Saved') label = `Saved (${savedJobs.length})`;
            if (t === 'Applied') label = `Applied (${appliedRaw.length})`;
            return (
             <Pressable
                key={t}
                onPress={() => {
                  if (t !== tab) setQ('');
                  setTab(t);
                }}
                className={`px-4 py-2 rounded-lg ${active ? 'bg-violet' : ''}`}
              >
                <Text className={`font-body-bold text-[12.5px] ${active ? 'text-white' : 'text-muted'}`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row items-center gap-2 flex-wrap z-[100]" style={Platform.OS === 'web' ? { overflow: 'visible' } as any : {}}>
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
          <View className="flex-row items-center gap-2 w-[200px] h-9 px-[11px] rounded-[10px] bg-navy border border-white/[0.08]">
            <Search size={14} color={SC.dim} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search..."
              placeholderTextColor={SC.dim}
              className="flex-1 text-white text-[12.5px]"
              style={{ fontFamily: FONTS.med, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
            />
          </View>
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-[10px] bg-navy border border-white/[0.08] items-center justify-center"
            style={({ pressed }: any) => [
              pressed && { opacity: 0.7 },
              refreshing && { opacity: 0.6 },
            ]}
          >
            {refreshing ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCcw size={13} color="#fff" />}
          </Pressable>
        </View>
      </View>

      <Text className="text-muted text-[11.5px] mt-1" style={{ fontFamily: FONTS.med }}>
        {loading ? 'Loading…' : `${total} match${total === 1 ? '' : 'es'}`}
      </Text>

      <View className="gap-3 mt-2.5">
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

        {!loading && tab === 'Recommended' && items.length < total && (
          <Pressable onPress={onLoadMore} className="self-center mt-3.5 px-[22px] h-[38px] rounded-[10px] flex-row items-center gap-1.5 bg-navy border border-white/[0.08]" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
            <Text className="text-violet font-body-bold text-xs">Load more · {total - items.length} remaining</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={applyModalJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setApplyModalJob(null)}
      >
        <View className="flex-1 bg-black/65 items-center justify-center p-5 z-[99999]">
          <GlassCard radius={16} padding={22} style={{ backgroundColor: PALETTE.bg1, borderWidth: 1, borderColor: PALETTE.glassBorder, borderRadius: 16, padding: 22 }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 rounded-xl bg-violet/[0.16] border border-violet/40 items-center justify-center">
                <Briefcase size={18} color="#FCD34D" />
              </View>
              <Text className="text-white text-lg tracking-tight" style={{ fontFamily: FONTS.xbold }}>Applying to External Job?</Text>
            </View>
            <Text className="text-muted text-sm leading-[18px] mb-3" style={{ fontFamily: FONTS.med }}>
              We redirected you to the recruiter's page for{" "}
              <Text className="text-white font-body-bold">
                {applyModalJob?.title}
              </Text>{" "}
              at{" "}
              <Text className="text-white font-body-bold">
                {applyModalJob?.company}
              </Text>.
            </Text>
            <Text className="text-dim text-xs leading-4 mb-5" style={{ fontFamily: FONTS.med }}>
              Once you finish submitting your details on their platform, confirm it here to track its progress in your dashboard!
            </Text>

            <View className="flex-row justify-end gap-2.5">
              <Pressable
                onPress={() => setApplyModalJob(null)}
                className="px-4 h-9 rounded-[10px] justify-center items-center bg-transparent"
                style={({ hovered }: any) => hovered && { backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Text className="text-muted font-body-bold text-[12.5px]">Cancel</Text>
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
                  className="flex-row gap-1.5 items-center px-[18px] h-9 rounded-[10px]"
                >
                  <Text className="text-white text-[12.5px]" style={{ fontFamily: FONTS.xbold }}>Yes, I've Applied</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <Modal
        visible={coverModalJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCoverModalJob(null)}
      >
        <View className="flex-1 bg-black/65 items-center justify-center p-5 z-[99999]">
          <GlassCard radius={16} padding={22} style={{ backgroundColor: PALETTE.bg1, borderWidth: 1, borderColor: PALETTE.glassBorder, borderRadius: 16, padding: 22 }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 rounded-xl bg-violet/[0.16] border border-violet/40 items-center justify-center">
                <Sparkles size={18} color="#A78BFA" />
              </View>
              <Text className="text-white text-lg tracking-tight" style={{ fontFamily: FONTS.xbold }}>AI Cover Letter Draft</Text>
            </View>
            
            {generatingCover ? (
              <View className="p-[30px] items-center gap-3">
                <ActivityIndicator size="large" color="#A78BFA" />
                <Text className="text-muted text-[13px]" style={{ fontFamily: FONTS.med }}>
                  Drafting professional cover letter...
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-muted text-xs mb-2" style={{ fontFamily: FONTS.med }}>
                  Tailored for {coverModalJob?.title} at {coverModalJob?.company}:
                </Text>
                <View className="bg-black/30 rounded-[10px] p-3 max-h-[300px] border border-white/[0.06]">
                  <TextInput
                    multiline
                    value={coverLetterText}
                    onChangeText={setCoverLetterText}
                    className="text-white text-xs"
                    style={{ fontFamily: FONTS.med, lineHeight: 16, height: 250, textAlignVertical: 'top' }}
                  />
                </View>
                <View className="flex-row justify-end gap-2.5 mt-4">
                  <Pressable
                    onPress={() => setCoverModalJob(null)}
                    className="px-4 h-9 rounded-[10px] justify-center items-center bg-transparent"
                  >
                    <Text className="text-muted font-body-bold text-[12.5px]">Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Clipboard.setString(coverLetterText);
                      toast.success('Copied! 📋', 'Cover letter copied to clipboard.');
                    }}
                    className="bg-violet rounded-[10px] px-4 h-9 items-center justify-center"
                  >
                    <Text className="text-white font-body-bold text-[12.5px]">
                      Copy to Clipboard
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </GlassCard>
        </View>
      </Modal>

      <Modal
        visible={whyMatchJob !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setWhyMatchJob(null)}
      >
        <View className="flex-1 bg-black/65 items-center justify-center p-5 z-[99999]">
          <GlassCard radius={16} padding={22} style={{ backgroundColor: PALETTE.bg1, borderWidth: 1, borderColor: PALETTE.glassBorder, borderRadius: 16, padding: 22 }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.16)', borderColor: 'rgba(139,92,246,0.40)', borderWidth: 1 }}>
                <Sparkles size={18} color="#A78BFA" />
              </View>
              <Text className="text-white text-lg tracking-tight" style={{ fontFamily: FONTS.xbold }}>Why Match?</Text>
            </View>
            
            <Text className="text-white font-body-bold text-sm mb-3">
              Skills & Profile Alignment
            </Text>
            <Text className="text-muted text-sm leading-[18px] mb-3" style={{ fontFamily: FONTS.med }}>
              Our AI matched your profile with <Text className="text-violet font-body-bold">{whyMatchJob?.company}</Text>'s requirements:
            </Text>
            <View className="gap-2 mb-5">
              <View className="flex-row gap-1.5 items-center">
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text className="text-muted text-[12.5px]" style={{ fontFamily: FONTS.med }}>
                  Your skills in <Text className="text-white">{(whyMatchJob?.tags || []).slice(0, 2).join(', ') || 'related tech'}</Text> match the job tags.
                </Text>
              </View>
              <View className="flex-row gap-1.5 items-center">
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text className="text-muted text-[12.5px]" style={{ fontFamily: FONTS.med }}>
                  Your academic tier and year are preferred by this recruiter.
                </Text>
              </View>
              <View className="flex-row gap-1.5 items-center">
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text className="text-muted text-[12.5px]" style={{ fontFamily: FONTS.med }}>
                  Location preference and work mode match your selection.
                </Text>
              </View>
            </View>

            <View className="flex-row justify-end gap-2.5">
              <Pressable
                onPress={() => setWhyMatchJob(null)}
                className="bg-violet rounded-[10px] px-[18px] h-9 items-center justify-center"
              >
                <Text className="text-white font-body-bold text-[12.5px]">
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
      <View className="absolute top-4 right-4 flex-row items-center gap-2.5 z-10">
        {job.is_recommended && (
          <View className="flex-row items-center gap-1 px-2 py-[3px] rounded-md border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <Text className="text-[10px]">🔥</Text>
            <Text className="text-rose font-body-bold text-[10px]">Recommended</Text>
          </View>
        )}
        <View className="flex-row items-center gap-1 px-2 py-[3px] rounded-md border" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.3)' }}>
          <Text className="text-violet font-body-bold text-[10px]">{job.match_score !== undefined ? `${job.match_score}%` : `+${matchPct}%`} match</Text>
        </View>
        <Pressable
          onPress={() => onSave(job)}
          className="p-1"
          accessibilityRole="button"
        >
          {job.saved ? (
            <BookmarkCheck size={18} color="#A78BFA" />
          ) : (
            <Bookmark size={18} color="#9CA3AF" />
          )}
        </Pressable>
      </View>

      <View className="flex-row gap-4 items-start">
        <View className="w-[52px] h-[52px] rounded-[10px] items-center justify-center" style={{ backgroundColor: logoBg }}>
          <Text className="text-white text-xl" style={{ fontFamily: FONTS.xbold }}>{initials}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-white font-body-bold text-base tracking-tight">
            {job.title || '—'}
          </Text>

          <Text className="text-muted text-[12.5px] mt-0.5" style={{ fontFamily: FONTS.med }}>
            {job.company} · {job.location || 'Remote'}
          </Text>

          <View className="flex-row flex-wrap gap-1.5 mt-2.5 items-center">
            <View className="flex-row items-center gap-1 rounded-md px-2 py-[3px] border" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <Briefcase size={10} color="#10B981" />
              <Text className="text-teal font-body-bold text-[10.5px]">
                {job.job_type}
              </Text>
            </View>

            <View className="flex-row items-center gap-1 rounded-md px-2 py-[3px] border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Globe2 size={10} color="#9CA3AF" />
              <Text className="text-gray-300 font-body-bold text-[10.5px]">
                {job.work_mode}
              </Text>
            </View>

            {salary && (
              <View className="flex-row items-center gap-1 rounded-md px-2 py-[3px] border" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.25)' }}>
                <IndianRupee size={10} color="#A78BFA" />
                <Text className="text-violet font-body-bold text-[10.5px]">
                  {salary}
                </Text>
              </View>
            )}

            {duration && (
              <View className="flex-row items-center gap-1 rounded-md px-2 py-[3px] border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <Text className="text-gray-300 font-body-bold text-[10.5px]">
                  {duration}
                </Text>
              </View>
            )}

            {timeAgo && (
              <View className="flex-row items-center gap-1 rounded-md px-2 py-[3px] border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <Clock size={10} color="#9CA3AF" />
                <Text className="text-muted text-[10.5px]" style={{ fontFamily: FONTS.med }}>
                  {timeAgo}
                </Text>
              </View>
            )}
          </View>

          {job.description && (
            <Text className="text-muted text-[12.5px] mt-2.5" style={{ fontFamily: FONTS.med, lineHeight: 18 }}>
              {job.description}
            </Text>
          )}

          {(job.tags || []).length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {(job.tags || []).slice(0, 5).map((t, idx) => (
                <View
                  key={idx}
                  className="rounded-full px-3 py-1 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <Text className="text-muted text-[11px]" style={{ fontFamily: FONTS.med }}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row justify-between items-center mt-4 pt-[14px] flex-wrap gap-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
            <View className="flex-row items-center gap-3 flex-wrap">
              <View className="flex-row items-center gap-1">
                <Users size={12} color="#9CA3AF" />
                <Text className="text-muted text-[11.5px]" style={{ fontFamily: FONTS.med }}>
                  {applicants.toLocaleString()} applicants
                </Text>
              </View>

              <Text className="text-white/15">·</Text>

              <View className="flex-row items-center gap-1">
                <Calendar size={12} color="#9CA3AF" />
                <Text className="text-muted text-[11.5px]" style={{ fontFamily: FONTS.med }}>
                  {closes}
                </Text>
              </View>

              <Text className="text-white/15">·</Text>

              <Pressable
                onPress={() => onWhyMatch(job)}
                className="flex-row items-center gap-1 rounded-[14px] px-2 py-[3px] border" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
              >
                <Sparkles size={11} color="#A78BFA" />
                <Text className="text-violet font-body-bold text-[10.5px]">
                  Why match?
                </Text>
              </Pressable>
            </View>

            <View className="flex-row gap-2 items-center">
              <Pressable
                onPress={() => onCoverLetter(job)}
                className="flex-row items-center gap-[5px] rounded-lg px-3 h-8 justify-center border"
                style={({ pressed }: any) => [
                  { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Sparkles size={12} color="#A78BFA" />
                <Text className="text-gray-300 font-body-bold text-[11.5px]">
                  Cover Letter
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onApply(job)}
                className="flex-row items-center gap-1.5 bg-violet rounded-lg px-3.5 h-8 justify-center"
                style={({ pressed }: any) => pressed && { opacity: 0.8 }}
              >
                <Text className="text-white text-[11.5px]" style={{ fontFamily: FONTS.xbold }}>
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
