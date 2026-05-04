/**
 * Live job feed view — replaces the old mock-driven InternshipsView.
 *
 * Pulls from /api/jobs/feed which aggregates 5 free job APIs (RemoteOK,
 * ArbeitNow, The Muse, Remotive, Jobicy) with year-tier filter applied:
 *   • Year 1, 2 → internships only
 *   • Year 3, 4 → internships + full-time
 *   • Alumni    → full-time + senior
 *
 * Features:
 *   - Filter chips (All / Internship / Full-time / Remote / Saved)
 *   - Search across role/company/city
 *   - Save / Unsave with instant DB persistence
 *   - Apply opens source URL in new tab + tracks via /jobs/track-apply
 *   - Live refresh button (pulls fresh data from upstream APIs)
 *   - "Locked" hint for filters outside the user's tier
 *   - Pagination via Load more
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions,
  Platform, ActivityIndicator, Linking,
} from 'react-native';
import {
  Search, MapPin, Bookmark, BookmarkCheck, ExternalLink, RefreshCcw,
  Lock, Sparkles, Briefcase, Globe2,
} from '../iconShims';
import { SC, FONTS } from '../tokens';
import { EmptyState, SuccessBurst } from '../EmptyState';
import { SkeletonList } from '../motion';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';

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

export function InternshipsView() {
  const { width } = useWindowDimensions();
  const toast = useToast();

  const [filter, setFilter] = useState<'All' | 'Internship' | 'Full-time' | 'Remote' | 'Saved'>('All');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['Internship']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async (opts?: { append?: boolean; refresh?: boolean; pageOverride?: number }) => {
    const append = opts?.append || false;
    if (!append) setLoading(true);
    try {
      const params: any = { page: opts?.pageOverride ?? page, per_page: PER_PAGE };
      if (filter === 'Internship') params.type = 'Internship';
      else if (filter === 'Full-time') params.type = 'Full-time';
      else if (filter === 'Remote') params.work_mode = 'Remote';
      if (q.trim()) params.q = q.trim();
      if (opts?.refresh) params.refresh = true;

      if (filter === 'Saved') {
        const r: any = await request('/jobs/saved');
        setItems(r.items || []);
        setTotal((r.items || []).length);
        setAllowedTypes((prev) => prev);
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
  }, [filter, q, page, toast]);

  useEffect(() => { setPage(1); loadFeed({ pageOverride: 1 }); }, [filter]); // eslint-disable-line

  // "X new jobs since you last visited" — fired once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await request('/jobs/new-since-last-visit');
        if (!cancelled && r?.new_count > 0) {
          toast.success(`🎉 ${r.new_count} new job${r.new_count === 1 ? '' : 's'} since your last visit`,
            'Pulled fresh from RemoteOK · ArbeitNow · The Muse · Remotive · Jobicy');
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { if (filter !== 'Saved') { setPage(1); loadFeed({ pageOverride: 1 }); } }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed({ refresh: true, pageOverride: 1 });
    toast.success('Feed refreshed', 'Fetched the latest jobs from all 5 sources.');
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
    } catch (e: any) {
      // revert
      setItems((arr) => arr.map((j) => j.job_id === job.job_id ? { ...j, saved: !next } : j));
      toast.error('Could not save', e?.message || 'Please try again.');
    }
  }, [toast]);

  const onApply = useCallback(async (job: Job) => {
    const url = (job.source_urls && job.source_urls[0]) || '';
    if (!url) { toast.warning('No apply link', 'This job did not include an apply URL.'); return; }
    try {
      await request('/jobs/track-apply', { method: 'POST', body: { job_id: job.job_id, source_url: url } } as any);
    } catch {}
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url).catch(() => {});
    setItems((arr) => arr.map((j) => j.job_id === job.job_id ? { ...j, applied: true } : j));
  }, [toast]);

  const FILTERS = ['All', 'Internship', 'Full-time', 'Remote', 'Saved'] as const;
  const isFilterAllowed = (f: typeof FILTERS[number]) => {
    if (f === 'All' || f === 'Remote' || f === 'Saved') return true;
    return allowedTypes.includes(f);
  };

  // Burst toast on save action
  const [burst, setBurst] = useState<{ show: boolean; label: string }>({ show: false, label: '' });

  // Wrap save handler to show burst overlay
  const onToggleSaveWithBurst = useCallback(async (job: Job) => {
    const wasSaved = job.saved;
    await onToggleSave(job);
    if (!wasSaved) setBurst({ show: true, label: 'Job saved!' });
  }, [onToggleSave]);

  return (
    <View accessibilityLabel="Internships and jobs feed">
      <SuccessBurst visible={burst.show} onHide={() => setBurst({ show: false, label: '' })} label={burst.label} />
      {/* Tier hint banner */}
      <View style={s.tierBanner}>
        <View style={s.tierBadge}>
          <Briefcase size={14} color="#FCD34D" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.tierTxt}>
            Live jobs from <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold }}>5 sources</Text> · personalised to your tier
          </Text>
          <Text style={s.tierSub}>Allowed for you: {allowedTypes.join(' · ')}</Text>
        </View>
        <Pressable onPress={onRefresh} disabled={refreshing} style={[s.tierCta, refreshing && { opacity: 0.6 }]}>
          {refreshing ? <ActivityIndicator size="small" color={SC.accentBright} /> : <RefreshCcw size={11} color={SC.accentBright} />}
          <Text style={s.tierCtaText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {/* Filter row */}
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const allowed = isFilterAllowed(f);
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => allowed ? setFilter(f) : toast.info('Tier locked', `Year-1/2 students see internships only. Update your year in profile to unlock ${f}.`)}
                style={[s.chip, active && s.chipOn, !allowed && s.chipLocked]}
                testID={`jobs-filter-${f.toLowerCase()}`}
              >
                {!allowed && <Lock size={10} color={SC.dim} />}
                <Text style={{ color: active ? '#fff' : (allowed ? SC.muted : SC.dim), fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.searchBox}>
          <Search size={14} color={SC.dim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Role, company, city" placeholderTextColor={SC.dim} style={s.searchInput} />
        </View>
      </View>

      {/* Results meta */}
      <Text style={s.metaCount}>
        {loading ? 'Loading…' : `${total} match${total === 1 ? '' : 'es'} ${filter !== 'All' ? `· ${filter}` : ''}`}
      </Text>

      {/* List */}
      <View style={{ gap: 10, marginTop: 8 }}>
        {loading && items.length === 0 ? (
          <SkeletonList n={5} kind="job" gap={10} />
        ) : items.length === 0 ? (
          filter === 'Saved' ? (
            <EmptyState
              variant="savedJobs"
              title="No saved jobs yet"
              body="Bookmark roles you love by tapping the ribbon icon — they'll appear here for easy revisits."
              cta={{ label: 'Browse all jobs', onPress: () => setFilter('All') }}
            />
          ) : (
            <EmptyState
              variant="generic"
              title="No matches yet"
              body="Try a different filter, broaden your search, or hit refresh to pull the latest jobs from all 5 sources."
              cta={{ label: 'Refresh feed', onPress: onRefresh }}
            />
          )
        ) : items.map((j) => (
          <JobCard key={j.job_id} job={j} onSave={onToggleSaveWithBurst} onApply={onApply} />
        ))}

        {/* Load more */}
        {!loading && filter !== 'Saved' && items.length < total && (
          <Pressable onPress={onLoadMore} style={s.loadMore}>
            <Text style={s.loadMoreTxt}>Load more · {total - items.length} remaining</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ── Card ───────────────────────────────────────────────────────────── */
function JobCard({ job, onSave, onApply }: { job: Job; onSave: (j: Job) => void; onApply: (j: Job) => void }) {
  const initials = (job.company || '?').slice(0, 1).toUpperCase();
  const logoBg = pickColor(job.company || '');
  const salary = formatSalary(job);

  return (
    <View style={s.row} testID={`job-card-${job.job_id}`}>
      <View style={[s.logo, { backgroundColor: logoBg }]}>
        <Text style={s.logoText}>{initials}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text numberOfLines={1} style={s.role}>{job.title || '—'}</Text>
          <View style={[s.typePill, job.job_type === 'Internship' ? s.typePillIntern : s.typePillFt]}>
            <Text style={[s.typePillTxt, job.job_type === 'Internship' && { color: '#86EFAC' }]}>{job.job_type}</Text>
          </View>
          {job.work_mode === 'Remote' && (
            <View style={s.modePill}>
              <Globe2 size={9} color="#A78BFA" />
              <Text style={s.modePillTxt}>Remote</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          <Text style={s.meta}>{job.company}</Text>
          <Text style={s.dot}>·</Text>
          <MapPin size={11} color={SC.muted} />
          <Text style={s.meta} numberOfLines={1}>{job.location}</Text>
          {(job.sources || []).length > 0 && (
            <>
              <Text style={s.dot}>·</Text>
              <Text style={s.sourceTag}>via {(job.sources || []).join(' + ')}</Text>
            </>
          )}
        </View>
        {salary && <Text style={s.stipend}>{salary}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={() => onSave(job)}
            style={s.iconBtn}
            testID={`job-save-${job.job_id}`}
            accessibilityRole="button"
            accessibilityLabel={job.saved ? `Unsave ${job.title} at ${job.company}` : `Save ${job.title} at ${job.company}`}
            accessibilityState={{ selected: !!job.saved }}
          >
            {job.saved ? <BookmarkCheck size={14} color={SC.accentBright} /> : <Bookmark size={14} color={SC.muted} />}
          </Pressable>
          <Pressable
            onPress={() => onApply(job)}
            style={s.applyBtn}
            testID={`job-apply-${job.job_id}`}
            accessibilityRole="button"
            accessibilityLabel={job.applied ? `Already applied to ${job.title}` : `Apply to ${job.title} at ${job.company}`}
            accessibilityState={{ disabled: !!job.applied }}
          >
            <Text style={s.applyText}>{job.applied ? 'Applied' : 'Apply'}</Text>
            <ExternalLink size={11} color="#fff" />
          </Pressable>
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
    if (j.salary_min && j.salary_max) return `${sym}${shortMoney(j.salary_min)}–${shortMoney(j.salary_max)} / yr`;
    if (j.salary_min) return `${sym}${shortMoney(j.salary_min)}+ / yr`;
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

/* ── Styles ────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  tierBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.18)', borderColor: 'rgba(245,158,11,0.45)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  tierTxt: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  tierSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  tierCta: {
    flexDirection: 'row', gap: 5, alignItems: 'center',
    paddingHorizontal: 12, height: 30, borderRadius: 8,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tierCtaText: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11 },

  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SC.primary, borderColor: SC.primary },
  chipLocked: { opacity: 0.55, ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}) },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 240, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },

  metaCount: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 6 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  logo: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  role: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, maxWidth: 240 },
  dot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  sourceTag: { color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5, fontStyle: 'italic' },
  stipend: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12, marginTop: 4 },

  typePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  typePillIntern: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.40)' },
  typePillFt:     { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.40)' },
  typePillTxt: { color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 10 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1 },
  modePillTxt: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 10 },

  iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, alignItems: 'center', justifyContent: 'center' },
  applyBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: SC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  applyText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },

  empty: { padding: 40, alignItems: 'center', gap: 12, backgroundColor: SC.card, borderRadius: 12, borderWidth: 1, borderColor: SC.border },
  emptyTxt: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center' },

  loadMore: {
    alignSelf: 'center', marginTop: 14, paddingHorizontal: 22, height: 38, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  loadMoreTxt: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12 },
});
