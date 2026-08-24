// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { ShieldOff, RefreshCw, Ban, Undo2, Mail, AlertTriangle, CheckCircle, XCircle, Search, Users, Clock, CheckCircle2 } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { GRAD, SecondaryButton, Card, IconBox, SectionLabel, StatusPill, Toast, useToast, SearchField } from '../applekit';
import { api } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';

type Row = { email?: string; reason?: string; source?: string; kind?: string; created_at?: string; updated_at?: string };

function fmt(iso?: string) { if (!iso) return '—'; const d = new Date(iso); if (Number.isNaN(d.getTime())) return iso; return d.toLocaleString(); }
function kindLabel(kind?: string) { const l: Record<string, string> = { bounce: 'Bounce', form_block: 'Form blocked', skipped_send: 'Send skipped', invalid_format: 'Invalid format', disposable: 'Disposable email', role_account: 'Role account' }; return l[kind || ''] || kind || 'Event'; }
function kindColor(kind?: string): string { const c: Record<string, string> = { bounce: '#EF4444', form_block: '#F59E0B', skipped_send: '#6B7280', invalid_format: '#F97316', disposable: '#EC4899', role_account: '#8B5CF6' }; return c[kind || ''] || '#6B7280'; }

export function EmailQualityView() {
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
  const [selectedSuppressions, setSelectedSuppressions] = useState<Set<string>>(new Set());

  const load = useCallback(async (needle = q) => {
    setLoading(true);
    try { const data: any = await api.emailQualityReport(needle.trim()); setSuppressedCount(data?.suppressed_count || 0); setEvents7d(data?.events_7d || 0); setSuppressions(data?.suppressions || []); setEvents(data?.events || []); setTotalUsers(data?.total_emails || 0); setValidEmails((data?.total_emails || 0) - (data?.suppressed_count || 0)); setInvalidEmails(data?.suppressed_count || 0); } catch (e: any) { flash(e?.message || 'Could not load email health', 'error'); } finally { setLoading(false); }
  }, [q, flash]);

  const getToken = async () => { const { tokenStore } = await import('@/src/models/services/api'); return tokenStore.getAccess() || ''; };
  useEffect(() => { load(''); }, []);

  const runAudit = async () => { setAuditing(true); setAuditResults(null); try { const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || ''; const token = await getToken(); const res = await fetch(`${base}/api/admin/email-quality/audit`, { headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Audit failed'); const data = await res.json(); setAuditResults(data); flash(`Audit complete: ${data.valid} valid, ${data.issue_count} issues found`); } catch (e: any) { flash(e?.message || 'Audit failed', 'error'); } finally { setAuditing(false); } };

  const restore = async (email: string) => { const ok = await confirm({ title: 'Allow this address again?', message: `${email} will be removed from the bounce list. The next send will go to Postal.`, confirmText: 'Restore' }); if (!ok) return; try { await api.unsuppressEmail(email); flash(`Restored ${email}`); load(); } catch (e: any) { flash(e?.message || 'Could not restore', 'error'); } };

  const restoreSelected = async () => { if (selectedSuppressions.size === 0) return; const ok = await confirm({ title: `Restore ${selectedSuppressions.size} emails?`, message: 'These emails will be removed from the bounce list.', confirmText: 'Restore All' }); if (!ok) return; try { const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || ''; const token = await getToken(); const params = new URLSearchParams(); selectedSuppressions.forEach(email => params.append('emails', email)); await fetch(`${base}/api/admin/email-quality/suppressions/bulk?${params}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); flash(`Restored ${selectedSuppressions.size} emails`); setSelectedSuppressions(new Set()); load(); } catch (e: any) { flash(e?.message || 'Could not restore', 'error'); } };

  const restoreAll = async () => { const ok = await confirm({ title: 'Restore ALL suppressed emails?', message: 'This will remove ALL emails from the bounce list. Only do this if you are sure all emails are valid.', confirmText: 'Restore All', danger: true }); if (!ok) return; try { const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || ''; const token = await getToken(); await fetch(`${base}/api/admin/email-quality/suppressions/all`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); flash('All suppressed emails restored'); load(); } catch (e: any) { flash(e?.message || 'Could not restore', 'error'); } };

  const toggleSelectSuppression = (email: string) => { setSelectedSuppressions(prev => { const next = new Set(prev); if (next.has(email)) next.delete(email); else next.add(email); return next; }); };

  const deliveryRate = totalUsers > 0 ? ((validEmails / totalUsers) * 100).toFixed(1) : '0';
  const bounceRate = totalUsers > 0 ? ((invalidEmails / totalUsers) * 100).toFixed(1) : '0';

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <IconBox size={38}><ShieldOff size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Email Health</Text>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 }}>Monitor email deliverability, manage bounces, and clean up invalid addresses. Healthy email lists improve deliverability and protect your sender reputation.</Text>
          </View>
          <SecondaryButton onPress={() => load()}>
            {loading ? <ActivityIndicator size="small" color={SAC.muted} /> : <RefreshCw size={12} color={SAC.muted} />}
            <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Refresh</Text>
          </SecondaryButton>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {[{ icon: <Mail size={18} color="#3B82F6" />, bg: 'rgba(59,130,246,0.15)', val: totalUsers, label: 'Total Emails', valColor: '#fff' },
          { icon: <CheckCircle size={18} color="#10B981" />, bg: 'rgba(16,185,129,0.15)', val: validEmails, label: `Valid (${deliveryRate}%)`, valColor: '#10B981' },
          { icon: <XCircle size={18} color="#EF4444" />, bg: 'rgba(239,68,68,0.15)', val: invalidEmails, label: `Suppressed (${bounceRate}%)`, valColor: '#EF4444' },
          { icon: <AlertTriangle size={18} color="#F59E0B" />, bg: 'rgba(245,158,11,0.15)', val: events7d, label: 'Issues (7 days)', valColor: '#F59E0B' },
        ].map((s, i) => (
          <View key={i} style={{ flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SAC.cardSolid, borderRadius: 12, borderWidth: 1, borderColor: SAC.border, padding: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: s.bg }}>{s.icon}</View>
            <View><Text style={{ fontFamily: FONTS.xbold, fontSize: 18, color: s.valColor }}>{s.val}</Text><Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginTop: 2 }}>{s.label}</Text></View>
          </View>
        ))}
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>DELIVERY HEALTH</SectionLabel>
          <StatusPill kind={Number(deliveryRate) > 90 ? 'success' : Number(deliveryRate) > 70 ? 'warn' : 'danger'} label={`${deliveryRate}% delivery rate`} />
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 12, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 4, width: `${deliveryRate}%` as any, backgroundColor: '#10B981' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>{validEmails} deliverable</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>{invalidEmails} suppressed</Text>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>EMAIL AUDIT</SectionLabel>
          <SecondaryButton onPress={runAudit} disabled={auditing}>
            {auditing ? <ActivityIndicator size="small" color={SAC.muted} /> : <Search size={12} color={SAC.muted} />}
            <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{auditing ? 'Auditing...' : 'Run Audit'}</Text>
          </SecondaryButton>
        </View>
        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 8 }}>Scan all emails in the database for deliverability issues before sending newsletters.</Text>
        {auditResults && (
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center', borderColor: auditResults.health_score > 90 ? '#10B981' : auditResults.health_score > 70 ? '#F59E0B' : '#EF4444' }}>
                <Text style={{ fontFamily: FONTS.xbold, fontSize: 18, color: auditResults.health_score > 90 ? '#10B981' : auditResults.health_score > 70 ? '#F59E0B' : '#EF4444' }}>{auditResults.health_score}%</Text>
              </View>
              <View><Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Email Health Score</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{auditResults.total_scanned} emails scanned</Text></View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[{ icon: <CheckCircle size={16} color="#10B981" />, val: auditResults.valid, label: 'Valid' },
                { icon: <XCircle size={16} color="#EF4444" />, val: auditResults.invalid_format, label: 'Invalid Format' },
                { icon: <Ban size={16} color="#EC4899" />, val: auditResults.disposable, label: 'Disposable' },
                { icon: <Mail size={16} color="#8B5CF6" />, val: auditResults.role_account, label: 'Role Accounts' },
                { icon: <AlertTriangle size={16} color="#F59E0B" />, val: auditResults.suppressed, label: 'Suppressed' },
                { icon: <Users size={16} color="#6B7280" />, val: auditResults.duplicate, label: 'Duplicates' },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  {item.icon}<Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>{item.val}</Text><Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{item.label}</Text>
                </View>
              ))}
            </View>
            {auditResults.issues.length > 0 && (
              <View>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}>{auditResults.issues.length} issues found that may affect deliverability:</Text>
                <View style={{ maxHeight: 200, overflow: 'hidden' }}>
                  {auditResults.issues.slice(0, 20).map((issue: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 4 }}>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${kindColor(issue.reason)}20` }}><Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: kindColor(issue.reason) }}>{kindLabel(issue.reason)}</Text></View>
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONTS.med, fontSize: 11, color: '#fff' }}>{issue.email}</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{issue.source}</Text>
                    </View>
                  ))}
                  {auditResults.issues.length > 20 && <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>...and {auditResults.issues.length - 20} more</Text>}
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>SEARCH</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <SearchField value={q} onChange={setQ} placeholder="Search email address…" width={280} />
            <Pressable onPress={() => load(q)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>SUPPRESSED EMAILS</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <StatusPill kind="warn" label={`${suppressions.length} shown`} />
            {selectedSuppressions.size > 0 && (
              <Pressable onPress={restoreSelected} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(110,231,183,0.35)', backgroundColor: 'rgba(110,231,183,0.1)' }}>
                <Undo2 size={12} color="#6EE7B7" /><Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 11 }}>Restore {selectedSuppressions.size}</Text>
              </Pressable>
            )}
            {suppressions.length > 0 && (
              <Pressable onPress={restoreAll} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11 }}>Restore All</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {loading && suppressions.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}><ActivityIndicator size="small" color={GRAD.from} /></View>
          ) : suppressions.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', gap: 8 }}><CheckCircle size={24} color="#10B981" /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>No suppressed emails. Your list is healthy!</Text></View>
          ) : suppressions.map((row, i) => (
            <View key={row.email || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...(selectedSuppressions.has(row.email || '') ? { backgroundColor: 'rgba(124,58,237,0.08)', borderColor: 'rgba(167,139,250,0.3)' } : {}) }}>
              <Pressable onPress={() => toggleSelectSuppression(row.email || '')} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: selectedSuppressions.has(row.email || '') ? GRAD.from : 'rgba(167,139,250,0.5)', alignItems: 'center', justifyContent: 'center', ...(selectedSuppressions.has(row.email || '') ? { backgroundColor: GRAD.from } : {}) }}>
                {selectedSuppressions.has(row.email || '') && <CheckCircle size={12} color="#fff" />}
              </Pressable>
              <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' }}><Ban size={14} color="#EF4444" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{row.email}</Text>
                <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2, lineHeight: 15 }}>{row.reason || 'hard bounce'}{row.source ? ` · ${row.source}` : ''} · {fmt(row.updated_at || row.created_at)}</Text>
              </View>
              <Pressable onPress={() => restore(row.email || '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(110,231,183,0.35)' }}>
                <Undo2 size={12} color="#6EE7B7" /><Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 12 }}>Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>RECENT ACTIVITY</SectionLabel>
          <StatusPill kind="info" label={`${events.length} events`} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {events.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center', gap: 8 }}><Clock size={24} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>No recent email events. Form blocks and send skips will appear here.</Text></View>
          ) : events.map((row, i) => (
            <View key={`${row.email}-${row.created_at}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${kindColor(row.kind)}15` }}><AlertTriangle size={14} color={kindColor(row.kind)} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{row.email}</Text>
                <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                  <Text style={{ color: kindColor(row.kind), fontFamily: FONTS.bold }}>{kindLabel(row.kind)}</Text> · {row.reason || '—'}{row.source ? ` · ${row.source}` : ''} · {fmt(row.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <SectionLabel>EMAIL HEALTH TIPS</SectionLabel>
        </View>
        <View style={{ marginTop: 12, gap: 10 }}>
          {['Remove bounced emails regularly to maintain sender reputation', 'Use double opt-in for new subscribers to verify email addresses', 'Monitor bounce rates - keep under 2% for good deliverability', 'Clean your list every 3-6 months to remove inactive addresses'].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}><CheckCircle2 size={16} color="#10B981" /><Text style={{ flex: 1, color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 }}>{tip}</Text></View>
          ))}
        </View>
      </Card>
    </View>
  );
}
