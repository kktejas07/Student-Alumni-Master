// @ts-nocheck
/**
 * Super Admin → Email Health.
 * 
 * Comprehensive email health dashboard showing:
 * - Delivery statistics
 * - Bounced/suppressed emails
 * - Invalid email detection
 * - Email verification status
 * - Recent activity timeline
 * - Actions to manage email health
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { 
  ShieldOff, RefreshCw, Ban, Undo2, Mail, AlertTriangle, CheckCircle, 
  XCircle, Search, Users, TrendingUp, TrendingDown, Eye, Trash2,
  CheckCircle2, Clock, FileText, Download, Filter,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD, SecondaryButton, Card, IconBox, SectionLabel,
  StatusPill, Toast, useToast, KpiTile, SearchField,
} from '../applekit';
import { api } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';

type Row = {
  email?: string;
  reason?: string;
  source?: string;
  kind?: string;
  created_at?: string;
  updated_at?: string;
};

function fmt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function kindLabel(kind?: string) {
  const labels: Record<string, string> = {
    'bounce': 'Bounce',
    'form_block': 'Form blocked',
    'skipped_send': 'Send skipped',
    'invalid_format': 'Invalid format',
    ' disposable': 'Disposable email',
    'role_account': 'Role account',
  };
  return labels[kind || ''] || kind || 'Event';
}

function kindColor(kind?: string): string {
  const colors: Record<string, string> = {
    'bounce': '#EF4444',
    'form_block': '#F59E0B',
    'skipped_send': '#6B7280',
    'invalid_format': '#F97316',
    'disposable': '#EC4899',
    'role_account': '#8B5CF6',
  };
  return colors[kind || ''] || '#6B7280';
}

export function EmailQualityView() {
  const T = useSAC();
  Object.assign(st, resolveColors(st, T));
  const { toast, flash, hide } = useToast();
  const { confirm } = useConfirm();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [events7d, setEvents7d] = useState(0);
  const [suppressions, setSuppressions] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [validEmails, setValidEmails] = useState(0);
  const [invalidEmails, setInvalidEmails] = useState(0);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [auditing, setAuditing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedSuppressions, setSelectedSuppressions] = useState<Set<string>>(new Set());

  const load = useCallback(async (needle = q) => {
    setLoading(true);
    try {
      const data: any = await api.emailQualityReport(needle.trim());
      setSuppressedCount(data?.suppressed_count || 0);
      setEvents7d(data?.events_7d || 0);
      setSuppressions(data?.suppressions || []);
      setEvents(data?.events || []);
      setTotalUsers(data?.total_emails || 0);
      setValidEmails((data?.total_emails || 0) - (data?.suppressed_count || 0));
      setInvalidEmails(data?.suppressed_count || 0);
    } catch (e: any) {
      flash(e?.message || 'Could not load email health', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, flash]);

  const getToken = async () => {
    const { tokenStore } = await import('@/src/models/services/api');
    return tokenStore.getAccess() || '';
  };

  useEffect(() => { load(''); }, []);

  const runAudit = async () => {
    setAuditing(true);
    setAuditResults(null);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await getToken();
      const res = await fetch(`${base}/api/admin/email-quality/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Audit failed');
      const data = await res.json();
      setAuditResults(data);
      flash(`Audit complete: ${data.valid} valid, ${data.issue_count} issues found`);
    } catch (e: any) {
      flash(e?.message || 'Audit failed', 'error');
    } finally {
      setAuditing(false);
    }
  };

  const restore = async (email: string) => {
    const ok = await confirm({
      title: 'Allow this address again?',
      message: `${email} will be removed from the bounce list. The next send will go to Postal.`,
      confirmText: 'Restore',
    });
    if (!ok) return;
    try {
      await api.unsuppressEmail(email);
      flash(`Restored ${email}`);
      load();
    } catch (e: any) {
      flash(e?.message || 'Could not restore', 'error');
    }
  };

  const restoreSelected = async () => {
    if (selectedSuppressions.size === 0) return;
    const ok = await confirm({
      title: `Restore ${selectedSuppressions.size} emails?`,
      message: 'These emails will be removed from the bounce list.',
      confirmText: 'Restore All',
    });
    if (!ok) return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await getToken();
      const params = new URLSearchParams();
      selectedSuppressions.forEach(email => params.append('emails', email));
      await fetch(`${base}/api/admin/email-quality/suppressions/bulk?${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      flash(`Restored ${selectedSuppressions.size} emails`);
      setSelectedSuppressions(new Set());
      load();
    } catch (e: any) {
      flash(e?.message || 'Could not restore', 'error');
    }
  };

  const restoreAll = async () => {
    const ok = await confirm({
      title: 'Restore ALL suppressed emails?',
      message: 'This will remove ALL emails from the bounce list. Only do this if you are sure all emails are valid.',
      confirmText: 'Restore All',
      danger: true,
    });
    if (!ok) return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await getToken();
      await fetch(`${base}/api/admin/email-quality/suppressions/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      flash('All suppressed emails restored');
      load();
    } catch (e: any) {
      flash(e?.message || 'Could not restore', 'error');
    }
  };

  const suppressEmails = async (emails: string[], reason: string) => {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await getToken();
      await fetch(`${base}/api/admin/email-quality/suppressions/bulk`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails, reason, source: 'audit' })
      });
      flash(`Suppressed ${emails.length} emails`);
      load();
      if (auditResults) runAudit();
    } catch (e: any) {
      flash(e?.message || 'Could not suppress', 'error');
    }
  };

  const suppressCategory = async (reason: string) => {
    if (!auditResults) return;
    const emails = auditResults.issues
      .filter((i: any) => i.reason === reason)
      .map((i: any) => i.email);
    if (emails.length === 0) return;
    const ok = await confirm({
      title: `Suppress ${emails.length} emails?`,
      message: `Are you sure you want to suppress all emails marked as ${reason}?`,
      confirmText: 'Suppress',
      danger: true,
    });
    if (!ok) return;
    await suppressEmails(emails, reason);
  };

  const syncPostal = async () => {
    setLoading(true);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = await getToken();
      const res = await fetch(`${base}/api/admin/email-quality/postal-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      flash(data.message || 'Postal sync complete');
      load();
    } catch (e: any) {
      flash(e?.message || 'Sync failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectSuppression = (email: string) => {
    setSelectedSuppressions(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const deliveryRate = totalUsers > 0 ? ((validEmails / totalUsers) * 100).toFixed(1) : '0';
  const bounceRate = totalUsers > 0 ? ((invalidEmails / totalUsers) * 100).toFixed(1) : '0';

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      {/* Header */}
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><ShieldOff size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Email Health</Text>
            <Text style={st.sub}>
              Monitor email deliverability, manage bounces, and clean up invalid addresses.
              Healthy email lists improve deliverability and protect your sender reputation.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryButton onPress={() => syncPostal()}>
              <RefreshCw size={12} color={SAC.muted} />
              <Text style={st.secText}>Sync Postal</Text>
            </SecondaryButton>
            <SecondaryButton onPress={() => load()}>
              {loading ? <ActivityIndicator size="small" color={SAC.muted} /> : <RefreshCw size={12} color={SAC.muted} />}
              <Text style={st.secText}>Refresh</Text>
            </SecondaryButton>
          </View>
        </View>
      </Card>

      {/* Stats Row */}
      <View style={st.statsRow}>
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <Mail size={18} color="#3B82F6" />
          </View>
          <View>
            <Text style={st.statValue}>{totalUsers}</Text>
            <Text style={st.statLabel}>Total Emails</Text>
          </View>
        </View>
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <CheckCircle size={18} color="#10B981" />
          </View>
          <View>
            <Text style={[st.statValue, { color: '#10B981' }]}>{validEmails}</Text>
            <Text style={st.statLabel}>Valid ({deliveryRate}%)</Text>
          </View>
        </View>
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <AlertTriangle size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={[st.statValue, { color: '#EF4444' }]}>{invalidEmails}</Text>
            <Text style={st.statLabel}>Bounced ({bounceRate}%)</Text>
          </View>
        </View>
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <AlertTriangle size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={[st.statValue, { color: '#F59E0B' }]}>{events7d}</Text>
            <Text style={st.statLabel}>Issues (7 days)</Text>
          </View>
        </View>
      </View>

      {/* Auto-blocking Configuration Info */}
      <Card>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBox size={32}><ShieldOff size={16} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Automatic Quality Filters</Text>
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: SAC.muted, lineHeight: 20 }}>
            The backend is permanently enforcing the following strict email checks before any email reaches Postal. These cannot be disabled:
          </Text>
          <View style={{ paddingLeft: 10, gap: 6 }}>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: SAC.text }}>✓ <strong style={{ color: '#DDD6FE' }}>Disposable Domains:</strong> Automatically blocked via GitHub daily updates (e.g. Yopmail, Mailinator, etc.)</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: SAC.text }}>✓ <strong style={{ color: '#DDD6FE' }}>Junk Catchers:</strong> Known test addresses are dropped (e.g. test@gmail.com, asdf@...)</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: SAC.text }}>✓ <strong style={{ color: '#DDD6FE' }}>Duplicates:</strong> Pre-filtered at the form submission level (one registration per email).</Text>
          </View>
        </View>
      </Card>

      {/* Delivery Health Card */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>DELIVERY HEALTH</SectionLabel>
          <StatusPill 
            kind={Number(deliveryRate) > 90 ? 'success' : Number(deliveryRate) > 70 ? 'warn' : 'danger'} 
            label={`${deliveryRate}% delivery rate`} 
          />
        </View>
        <View style={st.healthBar}>
          <View style={[st.healthBarFill, { width: `${deliveryRate}%`, backgroundColor: '#10B981' }]} />
        </View>
        <View style={st.healthLabels}>
          <Text style={st.healthLabel}>{validEmails} deliverable</Text>
          <Text style={st.healthLabel}>{invalidEmails} suppressed</Text>
        </View>
      </Card>

      {/* Audit Section */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>EMAIL AUDIT</SectionLabel>
          <SecondaryButton onPress={runAudit} disabled={auditing}>
            {auditing ? <ActivityIndicator size="small" color={SAC.muted} /> : <Search size={12} color={SAC.muted} />}
            <Text style={st.secText}>{auditing ? 'Auditing...' : 'Run Audit'}</Text>
          </SecondaryButton>
        </View>
        <Text style={[st.muted, { marginTop: 8 }]}>
          Scan all emails in the database for deliverability issues before sending newsletters.
        </Text>
        
        {auditResults && (
          <View style={{ marginTop: 16, gap: 12 }}>
            {/* Health Score */}
            <View style={st.auditScoreRow}>
              <View style={[st.auditScoreCircle, { borderColor: auditResults.health_score > 90 ? '#10B981' : auditResults.health_score > 70 ? '#F59E0B' : '#EF4444' }]}>
                <Text style={[st.auditScoreValue, { color: auditResults.health_score > 90 ? '#10B981' : auditResults.health_score > 70 ? '#F59E0B' : '#EF4444' }]}>
                  {auditResults.health_score}%
                </Text>
              </View>
              <View>
                <Text style={st.auditScoreLabel}>Email Health Score</Text>
                <Text style={st.muted}>{auditResults.total_scanned} emails scanned</Text>
              </View>
            </View>

            {/* Audit Stats */}
            <View style={st.auditStatsGrid}>
              <View style={st.auditStatItem}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={st.auditStatValue}>{auditResults.valid}</Text>
                <Text style={st.auditStatLabel}>Valid</Text>
              </View>
              <View style={st.auditStatItem}>
                <XCircle size={16} color="#EF4444" />
                <Text style={st.auditStatValue}>{auditResults.invalid_format}</Text>
                <Text style={st.auditStatLabel}>Invalid Format</Text>
              </View>
              <View style={st.auditStatItem}>
                <Ban size={16} color="#EC4899" />
                <Text style={st.auditStatValue}>{auditResults.disposable}</Text>
                <Text style={st.auditStatLabel}>Disposable</Text>
              </View>
              <View style={st.auditStatItem}>
                <Mail size={16} color="#8B5CF6" />
                <Text style={st.auditStatValue}>{auditResults.role_account}</Text>
                <Text style={st.auditStatLabel}>Role Accounts</Text>
              </View>
              <View style={st.auditStatItem}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={st.auditStatValue}>{auditResults.suppressed}</Text>
                <Text style={st.auditStatLabel}>Suppressed</Text>
              </View>
              <View style={st.auditStatItem}>
                <Users size={16} color="#6B7280" />
                <Text style={st.auditStatValue}>{auditResults.duplicate}</Text>
                <Text style={st.auditStatLabel}>Duplicates</Text>
              </View>
            </View>

            {/* Bulk Actions */}
            {auditResults.issues.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                <SecondaryButton onPress={() => suppressCategory('invalid_format')} disabled={auditResults.invalid_format === 0}>
                  <Text style={st.secText}>Suppress Invalid</Text>
                </SecondaryButton>
                <SecondaryButton onPress={() => suppressCategory('disposable')} disabled={auditResults.disposable === 0}>
                  <Text style={st.secText}>Suppress Disposables</Text>
                </SecondaryButton>
                <SecondaryButton onPress={() => suppressCategory('role_account')} disabled={auditResults.role_account === 0}>
                  <Text style={st.secText}>Suppress Role Accounts</Text>
                </SecondaryButton>
              </View>
            )}

            {/* Issues List */}
            {auditResults.issues.length > 0 && (
              <View>
                <Text style={[st.muted, { marginBottom: 8 }]}>
                  {auditResults.issues.length} issues found that may affect deliverability:
                </Text>
                <View style={{ maxHeight: 200, overflow: 'hidden' }}>
                  {auditResults.issues.slice(0, 20).map((issue: any, i: number) => (
                    <View key={i} style={st.auditIssueRow}>
                      <View style={[st.issueBadge, { backgroundColor: `${kindColor(issue.reason)}20` }]}>
                        <Text style={[st.issueBadgeText, { color: kindColor(issue.reason) }]}>
                          {kindLabel(issue.reason)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={st.issueEmail}>{issue.email}</Text>
                      <Text style={st.issueSource}>{issue.source}</Text>
                      <Pressable 
                        onPress={() => suppressEmails([issue.email], issue.reason)} 
                        style={[st.restoreBtn, { borderColor: 'rgba(239,68,68,0.35)', paddingVertical: 4 }]}
                      >
                        <Text style={[st.restoreText, { color: '#FCA5A5' }]}>Suppress</Text>
                      </Pressable>
                    </View>
                  ))}
                  {auditResults.issues.length > 20 && (
                    <Text style={st.muted}>...and {auditResults.issues.length - 20} more</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Search */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>SEARCH</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <SearchField value={q} onChange={setQ} placeholder="Search email address…" width={280} />
            <Pressable onPress={() => load(q)} style={st.searchGo}>
              <Text style={st.secText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* Suppressed Emails */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>SUPPRESSED EMAILS</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <StatusPill kind="warn" label={`${suppressions.length} shown`} />
            {selectedSuppressions.size > 0 && (
              <Pressable onPress={restoreSelected} style={st.restoreAllBtn}>
                <Undo2 size={12} color="#6EE7B7" />
                <Text style={st.restoreAllText}>Restore {selectedSuppressions.size}</Text>
              </Pressable>
            )}
            {suppressions.length > 0 && (
              <Pressable onPress={restoreAll} style={st.restoreAllBtnDanger}>
                <Text style={st.restoreAllTextDanger}>Restore All</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {loading && suppressions.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={GRAD.from} />
            </View>
          ) : suppressions.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', gap: 8 }}>
              <CheckCircle size={24} color="#10B981" />
              <Text style={st.muted}>No suppressed emails. Your list is healthy!</Text>
            </View>
          ) : (
            suppressions.map((row, i) => (
              <View key={row.email || i} style={[st.listRow, selectedSuppressions.has(row.email || '') && st.listRowSelected]}>
                <Pressable 
                  onPress={() => toggleSelectSuppression(row.email || '')}
                  style={[st.checkbox, selectedSuppressions.has(row.email || '') && st.checkboxChecked]}
                >
                  {selectedSuppressions.has(row.email || '') && <CheckCircle size={12} color="#fff" />}
                </Pressable>
                <View style={[st.rowIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                  <Ban size={14} color="#EF4444" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={st.emailText}>{row.email}</Text>
                  <Text numberOfLines={1} style={st.rowMeta}>
                    {row.reason || 'hard bounce'}
                    {row.source ? ` · ${row.source}` : ''}
                    {' · '}{fmt(row.updated_at || row.created_at)}
                  </Text>
                </View>
                <Pressable onPress={() => restore(row.email || '')} style={st.restoreBtn}>
                  <Undo2 size={12} color="#6EE7B7" />
                  <Text style={st.restoreText}>Restore</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </Card>

      {/* Recent Activity */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>RECENT ACTIVITY</SectionLabel>
          <StatusPill kind="info" label={`${events.length} events`} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {events.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', gap: 8 }}>
              <Clock size={24} color={SAC.muted} />
              <Text style={st.muted}>No recent email events. Form blocks and send skips will appear here.</Text>
            </View>
          ) : (
            events.map((row, i) => (
              <View key={`${row.email}-${row.created_at}-${i}`} style={st.listRow}>
                <View style={[st.rowIcon, { backgroundColor: `${kindColor(row.kind)}15` }]}>
                  <AlertTriangle size={14} color={kindColor(row.kind)} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={st.emailText}>{row.email}</Text>
                  <Text numberOfLines={1} style={st.rowMeta}>
                    <Text style={{ color: kindColor(row.kind), fontFamily: FONTS.bold }}>{kindLabel(row.kind)}</Text>
                    {' · '}{row.reason || '—'}
                    {row.source ? ` · ${row.source}` : ''}
                    {' · '}{fmt(row.created_at)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </Card>

      {/* Tips */}
      <Card>
        <View style={st.cardHeader}>
          <SectionLabel>EMAIL HEALTH TIPS</SectionLabel>
        </View>
        <View style={{ marginTop: 12, gap: 10 }}>
          <View style={st.tipRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={st.tipText}>Remove bounced emails regularly to maintain sender reputation</Text>
          </View>
          <View style={st.tipRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={st.tipText}>Use double opt-in for new subscribers to verify email addresses</Text>
          </View>
          <View style={st.tipRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={st.tipText}>Monitor bounce rates - keep under 2% for good deliverability</Text>
          </View>
          <View style={st.tipRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={st.tipText}>Clean your list every 3-6 months to remove inactive addresses</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SAC.cardSolid, borderRadius: 12, borderWidth: 1, borderColor: SAC.border,
    padding: 12,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FONTS.xbold, fontSize: 18, color: SAC.text },
  statLabel: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginTop: 2 },
  
  // Health bar
  healthBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 12, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  healthLabel: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted },
  
  // Card
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  searchGo: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  
  // List rows
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emailText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 },
  rowMeta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2, lineHeight: 15 },
  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(110,231,183,0.35)',
  },
  restoreText: { color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 12 },
  
  // Selection & Restore
  listRowSelected: { backgroundColor: 'rgba(124,58,237,0.08)', borderColor: 'rgba(167,139,250,0.3)' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  restoreAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(110,231,183,0.35)', backgroundColor: 'rgba(110,231,183,0.1)',
  },
  restoreAllText: { color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 11 },
  restoreAllBtnDanger: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.1)',
  },
  restoreAllTextDanger: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11 },

  // Audit
  auditScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  auditScoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  auditScoreValue: { fontFamily: FONTS.xbold, fontSize: 18 },
  auditScoreLabel: { fontFamily: FONTS.bold, fontSize: 14, color: SAC.text },
  auditStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  auditStatItem: {
    flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  auditStatValue: { fontFamily: FONTS.bold, fontSize: 14, color: SAC.text },
  auditStatLabel: { fontFamily: FONTS.med, fontSize: 10, color: SAC.muted },
  auditIssueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8,
    borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.02)',
    marginBottom: 4,
  },
  issueBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  issueBadgeText: { fontFamily: FONTS.bold, fontSize: 9 },
  issueEmail: { flex: 1, fontFamily: FONTS.med, fontSize: 11, color: SAC.text },
  issueSource: { fontFamily: FONTS.med, fontSize: 10, color: SAC.dim },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 },
});
