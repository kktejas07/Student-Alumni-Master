/**
 * Admin Approvals — pending mentor queue with approve/reject + detail review panel.
 *
 * Click row → SlidePanel with full mentor profile (LinkedIn, bio, expertise,
 * education, expected rate, languages) + Approve/Reject footer.
 *
 * Reject opens an inline reason TextInput before confirming. Reasons are
 * persisted on the user document (rejection_reason) and surfaced to the
 * mentor as a notification.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, TextInput } from 'react-native';
import {
  Check, X, Clock, Briefcase, Link2 as Linkedin, ChevronRight, AlertTriangle,
  Mail, Phone, GraduationCap, Languages, Tag, IndianRupee,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip, ActionButton } from './primitives';
import { SlidePanel } from './SlidePanel';
import { ADMIN_THEME as T } from './theme';

type TabKey = 'pending' | 'approved' | 'rejected';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ items: any[]; counts: any }>(`/admin/approvals?status=${tab}`);
      setItems(r.items || []);
      setCounts(r.counts || {});
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Open detail panel on row click
  const openDetail = useCallback(async (m: any) => {
    setSelected(m);
    setDetail(null);
    setDetailLoading(true);
    setRejectMode(false);
    setRejectReason('');
    setError(null);
    try {
      const r = await request<any>(`/admin/mentors/${m.id}`);
      setDetail(r);
    } catch (e: any) {
      setError(e.message || 'Failed to load details');
    } finally { setDetailLoading(false); }
  }, []);

  const closeDetail = useCallback(() => {
    setSelected(null);
    setDetail(null);
    setRejectMode(false);
    setRejectReason('');
    setError(null);
  }, []);

  // Quick action from row buttons
  const quickAct = async (id: string, action: 'approve' | 'reject') => {
    setWorking(id);
    try {
      await request(`/admin/mentors/${id}/${action}`, {
        method: 'POST',
        body: action === 'reject' ? { reason: '' } : undefined,
      } as any);
      await load();
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally { setWorking(null); }
  };

  // From detail panel
  const approveFromPanel = async () => {
    if (!selected?.id) return;
    setWorking(selected.id);
    try {
      await request(`/admin/mentors/${selected.id}/approve`, { method: 'POST' } as any);
      closeDetail();
      await load();
    } catch (e: any) {
      setError(e.message || 'Approve failed');
    } finally { setWorking(null); }
  };

  const rejectFromPanel = async () => {
    if (!selected?.id) return;
    setWorking(selected.id);
    try {
      await request(`/admin/mentors/${selected.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason.trim() || 'Application not approved' },
      } as any);
      closeDetail();
      await load();
    } catch (e: any) {
      setError(e.message || 'Reject failed');
    } finally { setWorking(null); }
  };

  return (
    <AdminLayout
      title="Approvals"
      subtitle="Mentor applications awaiting your review"
      pendingCount={counts.pending || 0}
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key] || 0;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              testID={`approvals-tab-${t.key}`}
              style={({ hovered }: any) => [
                styles.tab, active && styles.tabActive,
                hovered && !active && { backgroundColor: 'rgba(245,158,11,0.06)' },
              ]}
            >
              <Text style={[styles.tabText, active && { color: T.text }]}>{t.label}</Text>
              <View style={[styles.tabCount, active && { backgroundColor: T.accent }]}>
                <Text style={[styles.tabCountText, active && { color: T.text }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={{ alignItems: 'center', padding: 60 }}>
          <ActivityIndicator color={T.light} size="large" />
        </View>
      )}

      {!loading && items.length === 0 && (
        <GlassCard style={{ alignItems: 'center', padding: 40 }}>
          <Clock size={36} color={T.textMute} />
          <Text style={[styles.emptyText, { marginTop: 14 }]}>No {tab} requests at the moment.</Text>
        </GlassCard>
      )}

      {!loading && items.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => openDetail(m)}
          testID={`approval-row-${m.id}`}
          style={({ hovered }: any) => [
            { marginBottom: 14 },
            hovered && ({ transform: [{ translateY: -1 }] } as any),
          ]}
        >
          <GlassCard>
            <View style={styles.cardRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <View style={styles.avatar}><Briefcase size={16} color={T.light} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.email} numberOfLines={1}>{m.email}</Text>
                  </View>
                  {m.priority === 'high' && <StatusChip label="High Priority" tone="warn" />}
                </View>
                <View style={styles.metaRow}>
                  {!!m.title && <Text style={styles.meta}>💼 {m.title}</Text>}
                  {!!m.organization && <Text style={styles.meta}>🏢 {m.organization}</Text>}
                  {!!m.category && <Text style={styles.meta}>🏷️ {m.category.replace(/_/g, ' ')}</Text>}
                  {m.years_of_experience != null && <Text style={styles.meta}>⏱ {m.years_of_experience} yrs exp</Text>}
                  {!!m.linkedin_url && (
                    <Pressable
                      onPress={(e: any) => { e.stopPropagation && e.stopPropagation(); Linking.openURL(m.linkedin_url); }}
                    >
                      <View style={[styles.meta, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Linkedin size={11} color={T.light} />
                        <Text style={styles.metaLink}>LinkedIn</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
              {tab === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8 }} onStartShouldSetResponder={() => true}>
                  <ActionButton
                    label={working === m.id ? 'Working…' : 'Approve'}
                    icon={Check}
                    onPress={() => quickAct(m.id, 'approve')}
                    testID={`approve-${m.id}`}
                  />
                  <ActionButton
                    label="Reject"
                    variant="danger"
                    icon={X}
                    onPress={() => quickAct(m.id, 'reject')}
                    testID={`reject-${m.id}`}
                  />
                  <View style={{ width: 4 }} />
                  <ActionButton
                    label="Review"
                    icon={ChevronRight}
                    variant="ghost"
                    onPress={() => openDetail(m)}
                    testID={`review-${m.id}`}
                  />
                </View>
              )}
              {tab !== 'pending' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <StatusChip label={tab === 'approved' ? 'Approved' : 'Rejected'} tone={tab === 'approved' ? 'good' : 'bad'} />
                  <ChevronRight size={14} color="rgba(255,255,255,0.35)" />
                </View>
              )}
            </View>
          </GlassCard>
        </Pressable>
      ))}

      {/* Detail review panel */}
      <SlidePanel
        open={!!selected}
        onClose={closeDetail}
        title={selected?.name || 'Mentor Review'}
        subtitle={selected?.email}
        width={500}
        footer={tab === 'pending' && !rejectMode ? (
          <>
            <ActionButton label="Reject" icon={X} variant="danger"
              onPress={() => setRejectMode(true)} testID="panel-reject-init"
            />
            <View style={{ flex: 1 }} />
            <ActionButton
              label={working === selected?.id ? 'Approving…' : 'Approve'}
              icon={Check} onPress={approveFromPanel} testID="panel-approve"
            />
          </>
        ) : tab === 'pending' && rejectMode ? (
          <>
            <ActionButton label="Cancel" variant="ghost" onPress={() => { setRejectMode(false); setRejectReason(''); }} />
            <View style={{ flex: 1 }} />
            <ActionButton
              label={working === selected?.id ? 'Rejecting…' : 'Confirm reject'}
              icon={X} variant="danger" onPress={rejectFromPanel}
              testID="panel-confirm-reject"
            />
          </>
        ) : null}
      >
        {detailLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={T.light} />
          </View>
        )}

        {!detailLoading && rejectMode && (
          <View style={styles.rejectBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color={T.bad} />
              <Text style={styles.rejectTitle}>Reason for rejection</Text>
            </View>
            <Text style={styles.rejectHint}>
              The mentor will see this in their notification. Keep it kind & specific.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Not enough industry experience yet — please reapply after 1 year."
              placeholderTextColor="rgba(255,255,255,0.30)"
              multiline
              numberOfLines={4}
              style={styles.rejectInput}
              testID="panel-reject-reason"
            />
          </View>
        )}

        {!detailLoading && detail && !rejectMode && (
          <View>
            <View style={styles.headerChips}>
              <StatusChip
                label={detail.mentor_status || 'pending'}
                tone={detail.mentor_status === 'approved' ? 'good' : detail.mentor_status === 'rejected' ? 'bad' : 'warn'}
              />
              {detail.years_of_experience != null && (
                <StatusChip label={`${detail.years_of_experience} yrs exp`} tone="neutral" />
              )}
              {detail.category && (
                <StatusChip label={detail.category.replace(/_/g, ' ')} tone="neutral" />
              )}
            </View>

            {detail.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Bio</Text>
                <Text style={styles.bodyText}>{detail.bio}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Contact & Profile</Text>
              <Row icon={Mail}      label="Email"        value={detail.email} />
              <Row icon={Phone}     label="Phone"        value={detail.phone} />
              <Row icon={Briefcase} label="Job Title"    value={detail.job_title} />
              <Row icon={Briefcase} label="Organization" value={detail.organization} />
              <Row icon={Tag}       label="Category"     value={detail.category && detail.category.replace(/_/g, ' ')} />
              {detail.linkedin_url && (
                <Pressable
                  onPress={() => Linking.openURL(detail.linkedin_url)}
                  style={styles.linkedinBtn}
                  testID="panel-linkedin"
                >
                  <Linkedin size={14} color={T.light} />
                  <Text style={styles.linkedinText} numberOfLines={1}>Open LinkedIn profile</Text>
                </Pressable>
              )}
            </View>

            {!!detail.expertise_areas?.length && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Expertise</Text>
                <View style={styles.chipWrap}>
                  {detail.expertise_areas.map((e: string, i: number) => (
                    <View key={i} style={styles.softChip}>
                      <Text style={styles.softChipText}>{e}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!detail.skills?.length && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Skills</Text>
                <View style={styles.chipWrap}>
                  {detail.skills.map((s: string, i: number) => (
                    <View key={i} style={styles.softChip}>
                      <Text style={styles.softChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!detail.education?.length && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Education</Text>
                {detail.education.map((ed: any, i: number) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <GraduationCap size={13} color={T.light} />
                      <Text style={styles.eduDegree} numberOfLines={1}>
                        {ed.degree || ed.title || 'Degree'}
                      </Text>
                    </View>
                    <Text style={styles.eduInst} numberOfLines={1}>
                      {ed.institution || ed.school} {ed.year && `· ${ed.year}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Other Details</Text>
              <Row icon={IndianRupee} label="Expected rate"
                value={detail.expected_rate_inr ? `₹${Number(detail.expected_rate_inr).toLocaleString('en-IN')}/session` : null}
              />
              <Row icon={Languages} label="Languages"
                value={detail.languages?.length ? detail.languages.join(', ') : null}
              />
              <Row icon={Clock} label="Availability" value={detail.availability} />
              <Row icon={Clock} label="Applied"
                value={detail.created_at && new Date(detail.created_at).toLocaleString()}
              />
              {detail.rejection_reason && (
                <View style={[styles.field, { marginTop: 8 }]}>
                  <Text style={styles.fieldLabel}>Previous rejection reason</Text>
                  <Text style={styles.bodyText}>{detail.rejection_reason}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SlidePanel>
    </AdminLayout>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: any }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.field}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={11} color={T.textMute} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: { backgroundColor: T.glassMd, borderColor: T.borderMd },
  tabText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  tabCount: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  tabCountText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 38, height: 38, borderRadius: 11, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  email: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  meta: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  metaLink: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  emptyText: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 13 },

  // ── Detail panel
  headerChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  section: {
    marginTop: 4, marginBottom: 14,
    borderTopColor: 'rgba(245,158,11,0.10)', borderTopWidth: 1, paddingTop: 14,
  },
  sectionLabel: {
    color: T.light, fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  field: { paddingVertical: 8 },
  fieldLabel: {
    color: T.textMute, fontFamily: 'DMSans_500Medium',
    fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  fieldValue: { color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 4, lineHeight: 18 },
  bodyText: { color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 20 },
  linkedinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9,
    backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  linkedinText: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  chipWrap: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  softChip: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.25)', borderWidth: 1,
  },
  softChipText: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  eduDegree: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  eduInst:   { color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 12, marginLeft: 21, marginTop: 2 },

  rejectBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1,
    padding: 14, borderRadius: 12, marginBottom: 14,
  },
  rejectTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  rejectHint: { color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6, lineHeight: 18 },
  rejectInput: {
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 96, textAlignVertical: 'top',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: 'rgba(239,68,68,0.30)', borderWidth: 1, borderRadius: 9,
    color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1,
    padding: 10, borderRadius: 9, marginTop: 14,
  },
  errorText: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 12 },
});
