// registrations, volunteers, live scan, internal hiring, and passcode panels — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBaseUrl } from '@/src/lib/env';
import { api, request } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';
import { ImportPanel } from '@/src/views/web/admin/ImportPage';
import { Card, GRAD, GradientButton, IconBox, KpiTile, SearchField, SecondaryButton, StatusPill, TopTabs, useToast } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { Award, Bot, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, CreditCard, Download, Edit2, Eye, FileSpreadsheet, GraduationCap, Layout, Lock, Mail, MapPin, Pencil, Phone, Play, PlusCircle, RefreshCw, ScanLine, Search, Send, Sparkles, Star, Ticket, Trash2, Upload, UserCheck, Users, X, XCircle, Zap } from 'lucide-react-native';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Field, FieldRow, IconAction, SelectNative, Tip, cs } from '../fields/echoCmsFields';
import { SessionPassesOverview } from '../modal/echoCmsModal';
import { triggerExportCsv } from '../shared/echoCmsShared';

export function RegistrationsPanel() {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ events: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [eventSlug, setEventSlug] = useState('all');
  const [detailRow, setDetailRow] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'free' | 'admin' | 'paid' | 'pending' | 'failed' | 'team'>('all');
  const [auditEventFilter, setAuditEventFilter] = useState<string>('all');
  const [razorpayFees, setRazorpayFees] = useState<Record<string, { fee: number; tax: number; net: number; amount?: number; error?: string }>>({});
  const [fetchingFees, setFetchingFees] = useState(false);


  const [editingTeamReg, setEditingTeamReg] = useState<any>(null);
  const [editTeamMembers, setEditTeamMembers] = useState<any[]>([]);
  const [editTeamName, setEditTeamName] = useState('');


  const [page, setPage] = useState(0);
  const PER_PAGE = 20;
  const { flash } = useToast();
  const [showImport, setShowImport] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendProfileReminders = async () => {
    const ok = await confirm({
      title: 'Send Profile & SA Reminders',
      message: 'Send automated 100% profile & SA account reminders via Email + WhatsApp to all incomplete registrants?',
      confirmText: 'Send Reminders',
    });
    if (!ok) return;
    setSendingReminders(true);
    try {
      const res = await api.adminEchoSendProfileReminders({ target_group: 'all_incomplete', channel: 'both' });
      flash(`Loop Agent Dispatched! Processed: ${res?.processed_count}, Emails: ${res?.emails_sent}, WhatsApp: ${res?.whatsapp_sent}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleIssueCert = async (reg: any) => {
    try {
      const res = await api.adminEchoIssueCertificate(reg.id);
      flash(`Certificate issued for ${reg.full_name}! Code: ${res?.code}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to issue certificate');
    }
  };

  const saAccountBadge = (reg: any) => {
    if (reg.is_profile_100) {
      return (
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#34D399' }}>
            SA Member ✓ (100%)
          </Text>
        </View>
      );
    }
    if (reg.has_sa_account) {
      return (
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(245,179,66,0.18)', borderWidth: 1, borderColor: 'rgba(245,179,66,0.4)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#F5B342' }}>
            SA Member ({reg.profile_completion_pct || 0}%)
          </Text>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#FCA5A5' }}>
          No SA Account
        </Text>
      </View>
    );
  };

  useEffect(() => { setPage(0); }, [q, status, eventSlug, rows]);

  const exportAuditCSV = useCallback(() => {
    if (!auditData?.registrations) return;
    const rows = auditData.registrations;
    const headers = ['Name', 'Email', 'Event', 'Type', 'Team Size', 'Fee (DB)', 'RP Fee', 'RP Tax', 'RP Net', 'Payment ID', 'Status', 'Is Free', 'Is Admin', 'Is Team Member'];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      const pid = r.payment_id || '';
      const rpFee = razorpayFees[pid];
      const vals = [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.email || '').replace(/"/g, '""')}"`,
        `"${(r.slug || '').replace(/"/g, '""')}"`,
        r.reg_type || 'individual',
        r.team_size || 1,
        r.fee || 0,
        rpFee?.fee ?? '',
        rpFee?.tax ?? '',
        rpFee?.net ?? '',
        pid,
        r.status || '',
        r.is_free ? 'Yes' : 'No',
        r.is_admin_pay ? 'Yes' : 'No',
        r.is_team_member ? 'Yes' : 'No',
      ];
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [auditData, razorpayFees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, rev] = await Promise.all([
        api.adminEchoRegistrations(),
        api.adminEchoRevenue(),
      ]);
      setRows(regs?.items || []);
      setRevenue(rev || { events: [], totals: {} });
    } catch {
      flash('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const r = await api.adminRevenueAudit();
      setAuditData(r);
      setShowAudit(true);
    } catch {
      flash('Failed to load audit data');
    } finally { setAuditLoading(false); }
  };

  const deleteReg = async (id: string) => {
    const ok = await confirm({
      title: 'Delete registration',
      message: 'Delete this registration? This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.adminEchoDeleteRegistration(id);
      setRows((prev) => prev.filter((r) => r.id !== id && r._id !== id));
      flash('Registration deleted');
    } catch {
      flash('Failed to delete registration');
    } finally {
      setDeleting(null);
    }
  };

  
  const handleEditTeam = (r: any) => {
    setEditingTeamReg(r);
    setEditTeamName(r.team_name || '');
    const members = [...(r.team_members || [])];

    const size = r.team_size || 1;
    while (members.length < size - 1) {
      members.push({ name: '', email: '', phone: '' });
    }
    setEditTeamMembers(members);
  };

  const saveTeamMembers = async () => {
    if (!editingTeamReg) return;
    setActioning(editingTeamReg.id);
    try {
      await api.adminEchoUpdateTeam(editingTeamReg.id, editTeamMembers, editTeamName);
      flash('Team members updated successfully');
      setEditingTeamReg(null);
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to update team members');
    } finally {
      setActioning(null);
    }
  };

  const resendTickets = async (r: any) => {
    setActioning(r.id);
    try {
      await api.adminEchoResendTickets(r.id);
      flash('Tickets and coupons resent successfully');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to resend tickets');
    } finally {
      setActioning(null);
    }
  };

  const sendReminder = async (r: any) => {
    setActioning(r.id);
    try {
      await api.adminEchoSendPaymentReminder(r.id);
      flash('Payment reminder emailed to the attendee');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to send reminder');
    } finally {
      setActioning(null);
    }
  };

  const markFailed = async (r: any) => {
    const ok = await confirm({
      title: 'Mark as failed',
      message: 'Mark this registration as failed? No ticket or pass will be issued, and the attendee will be emailed.',
      confirmText: 'Mark failed',
      danger: true,
    });
    if (!ok) return;
    setActioning(r.id);
    try {
      await api.adminEchoMarkRegistrationFailed(r.id);
      flash('Registration marked as failed');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to mark as failed');
    } finally {
      setActioning(null);
    }
  };

  const markPaid = async (r: any) => {
    const ok = await confirm({
      title: 'Mark as paid',
      message: 'Mark this registration as paid? This will issue a ticket, invoice, and provision an SA account. Only use if Razorpay confirms the payment was captured.',
      confirmText: 'Confirm payment',
    });
    if (!ok) return;
    setActioning(r.id);
    try {
      await api.adminEchoMarkRegistrationPaid(r.id);
      flash('Registration marked as paid — ticket and invoice issued');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to mark as paid');
    } finally {
      setActioning(null);
    }
  };

  const [resending, setResending] = useState<string | null>(null);
  const [syncingTeams, setSyncingTeams] = useState(false);

  const resendAccountTickets = async (r: any) => {
    const regId = r.id || r._id;
    if (!regId) return;
    const isTeam = r.registration_type === 'team';
    const ok = await confirm({
      title: 'Resend Account Credentials & Tickets?',
      message: `This will provision Student Alumni accounts for ${isTeam ? 'all team members (' + (r.team_size || 1) + ' members)' : r.full_name}, generate unique QR entry passes, and email login credentials and passes.`,
      confirmText: 'Resend & Issue Passes',
    });
    if (!ok) return;
    setResending(regId);
    try {
      const res = await api.adminEchoResendAccountTickets(regId);
      flash(res?.message || 'Accounts and tickets successfully sent!');
      await load();
      if (detailRow && (detailRow.id === regId || detailRow._id === regId)) {
        setDetailRow((prev: any) => ({ ...prev, has_account: true, ticket_issued: true }));
      }
    } catch (err: any) {
      flash(err?.message || 'Failed to resend accounts and tickets');
    } finally {
      setResending(null);
    }
  };

  const rescuePayment = async (r: any) => {
    const regId = r.id || r._id;
    if (!regId) return;
    const ok = await confirm({
      title: 'Rescue Payment?',
      message: `This will contact Razorpay to verify if payment was captured for ${r.full_name}. If confirmed paid, the registration will be fully activated (QR, coupons, email sent).`,
      confirmText: 'Rescue Payment',
    });
    if (!ok) return;
    setActioning(regId);
    try {
      const res = await api.adminEchoRescuePayment(regId);
      if (res?.ok) {
        flash(res.message || 'Payment rescued and registration finalized!');
        await load();
      } else {
        flash(res?.message || 'Could not rescue — payment not confirmed on Razorpay.');
      }
    } catch (err: any) {
      flash(err?.message || 'Rescue failed. Try providing ?payment_id=pay_xxx manually.');
    } finally {
      setActioning(null);
    }
  };

  const syncAllTeams = async () => {
    const ok = await confirm({
      title: 'Sync & Resend All Team Accounts & Passes?',
      message: 'This will scan all paid/registered team registrations, ensure every team member has an SA Student account, generate individual QR tickets, and email login credentials and entry passes.',
      confirmText: 'Sync All Teams',
    });
    if (!ok) return;
    setSyncingTeams(true);
    try {
      const res = await api.adminEchoSyncTeams();
      flash(`Successfully fulfilled ${res?.total_members_synced || 0} team members across ${res?.teams_processed || 0} teams!`);
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to sync teams');
    } finally {
      setSyncingTeams(false);
    }
  };

  const [dedupingCoupons, setDedupingCoupons] = useState(false);
  const dedupCoupons = async () => {
    const ok = await confirm({
      title: 'Remove Duplicate Coupons?',
      message: 'This will scan all echo_coupons and delete duplicates, keeping only the oldest coupon per (registrant, session) pair. Used coupons are never deleted.',
      confirmText: 'Run Dedup',
    });
    if (!ok) return;
    setDedupingCoupons(true);
    try {
      const res = await api.adminEchoDedupCoupons();
      flash(`Dedup complete! ${res?.deleted || 0} duplicate coupons removed across ${res?.duplicate_groups_found || 0} groups. ${res?.skipped_used || 0} skipped (already used).`);
    } catch (err: any) {
      flash(err?.message || 'Dedup failed');
    } finally {
      setDedupingCoupons(false);
    }
  };

  const [broadcastSummary, setBroadcastSummary] = useState<any>(null);
  const [broadcastModal, setBroadcastModal] = useState<any>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadBroadcastSummary = async () => {
    try {
      const summary = await api.adminEchoBroadcastSummary(eventSlug === 'all' ? undefined : eventSlug);
      setBroadcastSummary(summary);
    } catch (_) {}
  };

  useEffect(() => {
    loadBroadcastSummary();
  }, [eventSlug]);

  const openBroadcast = (targetGroup: 'pending_unpaid' | 'confirmed_paid' | 'unregistered_students') => {
    const selectedEvent = uniqueEvents.find((e: any) => e.slug === eventSlug);
    const eventName = selectedEvent?.title || 'SNIST HackWave 3.0';
    let defaultSubj = '';
    if (targetGroup === 'pending_unpaid') {
      defaultSubj = `Action Required: Complete your payment & pass for ${eventName}`;
    } else if (targetGroup === 'confirmed_paid') {
      defaultSubj = `Important Event Notice & Schedule Updates — ${eventName}`;
    } else {
      defaultSubj = `→ Invitation: Register your team for ${eventName}`;
    }
    setBroadcastModal({
      target_group: targetGroup,
      subject: defaultSubj,
      custom_message: '',
      slug: eventSlug === 'all' ? undefined : eventSlug,
    });
  };

  const submitBroadcast = async () => {
    if (!broadcastModal) return;
    setBroadcasting(true);
    try {
      const res = await api.adminEchoBroadcastSend(broadcastModal);
      flash(res?.message || `Successfully sent broadcast!`);
      setBroadcastModal(null);
      await load();
      await loadBroadcastSummary();
    } catch (err: any) {
      flash(err?.message || 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase();
    const matchQ = !s
      || r.full_name?.toLowerCase().includes(s)
      || r.email?.toLowerCase().includes(s)
      || r.college?.toLowerCase().includes(s)
      || r.event_title?.toLowerCase().includes(s);
    const matchStatus = status === 'all' || r.payment_status === status;
    const matchEvent = eventSlug === 'all' || r.slug === eventSlug;
    return matchQ && matchStatus && matchEvent;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  const uniqueEvents = Array.from(new Set(rows.map((r: any) => r.slug).filter(Boolean)))
    .map((slug) => rows.find((r: any) => r.slug === slug))
    .filter(Boolean)
    .map((r: any) => ({ slug: r.slug, title: r.event_title || r.slug }));

  const fmtAmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const paid = filtered.filter((r) => r.payment_status === 'paid');
  const realPayments = paid.filter((r) => Number(r.fee || 0) > 0 && !(r.payment_id || '').startsWith('ADMIN_PAY_'));
  // Deduplicate team payments: each team member has the full team fee,
  // but Razorpay only captures once per payment_id
  const seenPids = new Set<string>();
  const dedupedPayments = realPayments.filter((r) => {
    const pid = r.payment_id || '';
    if (seenPids.has(pid)) return false;
    seenPids.add(pid);
    return true;
  });
  const pending = filtered.filter((r) => r.payment_status === 'pending');
  const failed = filtered.filter((r) => r.payment_status === 'failed');
  const revenueTotal = dedupedPayments.reduce((a, r) => a + Number(r.fee || 0), 0);

  return (
    <View>
      {/* Revenue KPIs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <KpiTile Icon={Users} label="Total Registrations" value={String(filtered.length)} />
        <KpiTile Icon={Check} label="Paid" value={String(paid.length)} />
        <KpiTile Icon={Clock} label="Pending" value={String(pending.length)} />
        <KpiTile Icon={XCircle} label="Failed" value={String(failed.length)} />
        <KpiTile Icon={Zap} label="Revenue (filtered)" value={fmtAmt(revenueTotal)} delta="real-time" deltaKind="success" />
        <Pressable onPress={loadAudit} disabled={auditLoading} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E40AF',
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          opacity: auditLoading ? 0.6 : 1,
        }}>
          {auditLoading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={14} color="#fff" />}
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>{auditLoading ? 'Loading…' : 'Revenue Audit'}</Text>
        </Pressable>
        <Pressable onPress={() => window.open('/echo/admin/scan', '_blank')} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED',
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
        }}>
          <ScanLine size={14} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Scan Coupons</Text>
        </Pressable>
        <Pressable
          onPress={syncAllTeams}
          disabled={syncingTeams}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: syncingTeams ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
            borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} color="#34D399" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#34D399' }}>
            {syncingTeams ? 'Syncing...' : 'Sync & Resend Team Passes'}
          </Text>
        </Pressable>
        <Pressable
          onPress={dedupCoupons}
          disabled={dedupingCoupons}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: dedupingCoupons ? 'rgba(251,146,60,0.2)' : 'rgba(251,146,60,0.1)',
            borderWidth: 1, borderColor: 'rgba(251,146,60,0.3)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          }}
        >
          <Trash2 size={14} color="#FB923C" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#FB923C' }}>
            {dedupingCoupons ? 'Removing dupes...' : 'Dedup Coupons'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const apiBase = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || 'http://localhost:8000';
            const exportUrl = `${apiBase}/api/echo/admin/export-csv${eventSlug !== 'all' ? `?slug=${eventSlug}` : ''}`;
            if (typeof window !== 'undefined') {
              window.open(exportUrl, '_blank');
            }
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#059669',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          }}
        >

          <Download size={14} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Export CSV (Registrations)</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const apiBase = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) || 'http://localhost:8000';
            const exportUrl = `${apiBase}/api/echo/admin/export-incomplete-profiles-csv?filter_type=all${eventSlug !== 'all' ? `&slug=${eventSlug}` : ''}`;
            if (typeof window !== 'undefined') {
              window.open(exportUrl, '_blank');
            }
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#7C5CFC',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          }}
        >
          <Download size={14} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Export Incomplete &amp; No-Account CSV</Text>
        </Pressable>
      </View>

      {/* Segmented Audience Broadcasts & Notices */}
      <Card style={{ marginBottom: 18, backgroundColor: 'rgba(15,23,42,0.65)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Targeted Broadcasts &amp; Notices</Text>
            <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: SAC.muted, marginTop: 2 }}>
              Differentiate communication between unpaid cart registrants, confirmed attendees, and platform students
            </Text>
          </View>
          <StatusPill kind="info" label="Multi-Channel Notifications" />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {/* Card 1: Unpaid / Pending Recovery */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(245,158,11,0.05)',
            borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#FCD34D' }}>Unpaid Registrants</Text>
                <View style={{ backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#FBBF24' }}>
                    {broadcastSummary?.pending_unpaid ?? pending.length} Pending
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Users with Student Alumni accounts whose registration payment is incomplete. Sends direct payment resume link &amp; event handbook.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('pending_unpaid')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#D97706', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Send size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Send Payment Recovery Notice</Text>
            </Pressable>
          </View>

          {/* Card 2: Confirmed Attendees */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(16,185,129,0.05)',
            borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#6EE7B7' }}>Confirmed Attendees</Text>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#34D399' }}>
                    {broadcastSummary?.confirmed_paid ?? paid.length} Confirmed
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Attendees and teammates with active QR entry passes. Sends official timetable, track rules, meal pass guide &amp; handbook.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('confirmed_paid')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#059669', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Mail size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Send Event Notice &amp; Updates</Text>
            </Pressable>
          </View>

          {/* Card 3: Platform Students */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(99,102,241,0.05)',
            borderWidth: 1, borderColor: 'rgba(129,140,248,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#A5B4FC' }}>Platform Students</Text>
                <View style={{ backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#818CF8' }}>
                    {broadcastSummary?.unregistered_students ?? 0} Unregistered
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Active Student Alumni members who have not registered for this event yet. Sends invitation newsletter with direct register link.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('unregistered_students')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#6366F1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Zap size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Send Event Invitation</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {/* Per-event revenue */}
      {revenue.events?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Event Revenue Breakdown</Text>
            <StatusPill kind="info" label={`${revenue.events.length} events`} />
          </View>
          <View style={{ gap: 8 }}>
            {revenue.events.map((ev: any, i: number) => (
              <View key={ev.slug + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GRAD.to }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: SAC.text }}>{ev.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>
                    {ev.paid} paid · {ev.pending} pending · {ev.free} free
                  </Text>
                </View>
                <Text style={{ fontFamily: FONTS.xbold, fontSize: 12.5, color: '#86EFAC' }}>{fmtAmt(ev.revenue)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Session Passes Overview */}
      {uniqueEvents.length > 0 && (
        <SessionPassesOverview events={uniqueEvents} onRefresh={load} />
      )}

      {/* Search + filter */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <SearchField value={q} onChange={setQ} placeholder="Search attendee, email, event…" />
        </View>
        {uniqueEvents.length > 1 && (
          <select
            value={eventSlug}
            onChange={(e: any) => setEventSlug(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 12px', color: SAC.text, fontSize: 12, fontFamily: 'DM Sans',
              outline: 'none', cursor: 'pointer', minWidth: 140,
            }}
          >
            <option value="all" style={{ background: '#1e1b4b', color: SAC.text }}>All Events</option>
            {uniqueEvents.map((ev: any) => (
              <option key={ev.slug} value={ev.slug} style={{ background: '#1e1b4b', color: SAC.text }}>{ev.title}</option>
            ))}
          </select>
        )}
        <TopTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' },
            { id: 'failed', label: 'Failed' },
          ]}
          active={status}
          onChange={setStatus}
        />
        <SecondaryButton onPress={load}><RefreshCw size={12} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 }}>Refresh</Text></SecondaryButton>
        <Pressable
          onPress={() => setShowImport(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#7C3AED',
            borderRadius: 8, paddingHorizontal: 13, paddingVertical: 8, cursor: 'pointer',
          }}
        >
          <FileSpreadsheet size={13} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Import Tickets</Text>
        </Pressable>
        <Pressable
          onPress={() => triggerExportCsv()}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#059669',
            borderRadius: 8, paddingHorizontal: 13, paddingVertical: 8, cursor: 'pointer',
          }}
        >
          <Download size={13} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Export All Events (CSV)</Text>
        </Pressable>
      </View>

      {/* Registrations table */}
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>No registrations found</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted, textAlign: 'center', maxWidth: 320 }}>
              Registrations appear here the moment attendees sign up for an event.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 1050, flex: 1 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ flex: 1.5, minWidth: 160, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ATTENDEE</Text>
                <Text style={{ width: 140, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>SA ACCOUNT & PROFILE</Text>
                <Text style={{ width: 60, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>TYPE</Text>
                <Text style={{ width: 45, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>SIZE</Text>
                <Text style={{ flex: 1.3, minWidth: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>AMOUNT</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>PAYMENT</Text>
                <Text style={{ width: 130, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ECHO CERTIFICATE</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>DATE</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {paged.map((r: any, i: number) => {
                const isTeam = r.registration_type === 'team' || !!r.team_name || (r.team_size && r.team_size > 1);
                return (
                <View key={r.id || i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ flex: 1.5, minWidth: 160 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: SAC.text }}>{r.full_name || '—'}</Text>
                      {r.source && r.source !== 'our_platform' && r.source !== 'studentalumni' && (
                        <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: r.source === 'unstop' ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)', borderWidth: 1, borderColor: r.source === 'unstop' ? 'rgba(124,58,237,0.45)' : 'rgba(14,165,233,0.45)' }}>
                          <Text numberOfLines={1} style={{ fontFamily: FONTS.xbold, fontSize: 8, color: r.source === 'unstop' ? '#C4B5FD' : '#7DD3FC', letterSpacing: 0.4 }}>{r.source.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{r.email || r.phone || ''}</Text>
                    {isTeam && (
                      <View style={{ marginTop: 6, gap: 4 }}>
                        {r.team_name && (
                          <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#C4B5FD' }}>
                            Team: {r.team_name}
                          </Text>
                        )}
                        {(r.team_members?.length || 0) > 0 && r.team_members.slice(0, 2).map((member: any, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: FONTS.xbold, fontSize: 7, color: '#C4B5FD' }}>{idx + 2}</Text>
                            </View>
                            <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim, flex: 1 }}>
                              {member.name || member.email || '—'}
                            </Text>
                          </View>
                        ))}
                        {(r.team_members?.length || 0) > 2 && (
                          <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: SAC.dim }}>
                            +{r.team_members.length - 2} more
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* SA Account & Profile Column */}
                  <View style={{ width: 140, justifyContent: 'center', paddingRight: 6 }}>
                    {saAccountBadge(r)}
                  </View>

                  <View style={{ width: 60 }}>
                    <View style={{ 
                      backgroundColor: isTeam ? 'rgba(124,58,237,0.15)' : 'rgba(52,211,153,0.15)',
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                      borderWidth: 1, borderColor: isTeam ? 'rgba(124,58,237,0.3)' : 'rgba(52,211,153,0.3)',
                      alignSelf: 'flex-start', alignItems: 'center'
                    }}>
                      <Text style={{ fontFamily: FONTS.xbold, fontSize: 9, color: isTeam ? '#C4B5FD' : '#6EE7B7' }}>
                        {isTeam ? 'TEAM' : 'IND'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 45, paddingTop: 4 }}>
                    <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#e5e7eb' }}>
                      {isTeam ? (r.team_size > 1 ? r.team_size : 1) : 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1.3, minWidth: 150 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{r.event_title || r.slug || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{r.college || ''}</Text>
                  </View>
                  <View style={{ width: 90, minWidth: 0, paddingTop: 2 }}>
                    {r.is_team_member ? (
                      <View>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 11.5, color: '#C4B5FD' }}>
                          Team Pass
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim, marginTop: 1 }}>
                          {r.team_leader_name ? `Paid by ${r.team_leader_name.split(' ')[0]}` : 'Covered in Team'}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 12, color: SAC.text }}>
                          {Number(r.fee || 0) > 0 ? `₹${Number(r.fee).toLocaleString('en-IN')}` : 'FREE'}
                        </Text>
                        {isTeam && (r.team_size > 1 || (r.team_members?.length || 0) > 0) && (
                          <Text style={{ fontFamily: FONTS.med, fontSize: 9.5, color: '#A78BFA', marginTop: 1 }}>
                            {(r.team_size || (r.team_members?.length + 1))} Passes
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ width: 90, minWidth: 0 }}>
                    <StatusPill
                      kind={r.payment_status === 'paid' ? 'success' : r.payment_status === 'pending' ? 'warn' : r.payment_status === 'failed' ? 'danger' : 'neutral'}
                      label={(r.payment_status || '—').toUpperCase()}
                    />
                  </View>

                  {/* ECHO Certificate Column */}
                  <View style={{ width: 130, justifyContent: 'center', paddingRight: 6 }}>
                    {r.has_certificate ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,92,252,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Award size={11} color="#C9A7FF" />
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#D8B4FE' }}>
                          {r.certificate?.verification_code || 'Issued'}
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleIssueCert(r)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' }}>
                        <Award size={11} color="#A78BFA" />
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#A78BFA' }}>Issue Cert</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={{ width: 90, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>
                      {(r.registered_at || '').slice(0, 10) || '—'}
                    </Text>
                  </View>
                  <View style={{ width: 110, flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                    <IconAction icon={<Eye size={14} color="#818CF8" />} label="View" color="#818CF8" onPress={() => setDetailRow(r)} />
                    <IconAction
                      icon={<UserCheck size={14} color="#34D399" />}
                      label="Hire / Convert to Intern"
                      color="#34D399"
                      bg="rgba(16,185,129,0.18)"
                      onPress={async () => {
                        try {
                          await api.adminEchoConvertIntern({
                            reg_id: r.id,
                            target_stage: 'unpaid_intern',
                            full_name: r.full_name,
                            email: r.email,
                            phone: r.phone,
                            college: r.college,
                            slug: r.slug,
                          });
                          flash(`Converted ${r.full_name} to Unpaid Intern candidate!`);
                        } catch (e: any) {
                          flash(e?.message || 'Conversion failed');
                        }
                      }}
                    />
                    {(r.payment_status === 'paid' || Number(r.fee || 0) === 0) && (
                      <IconAction
                        icon={<Send size={14} color="#A78BFA" />}
                        label="Resend Account & Pass"
                        color="#A78BFA"
                        bg="rgba(124,58,237,0.15)"
                        onPress={() => resendAccountTickets(r)}
                        disabled={resending === (r.id || r._id)}
                      />
                    )}
                    {r.payment_status === 'pending' && (
                      <>
                        <IconAction
                          icon={<Mail size={14} color="#FBBF24" />}
                          label="Remind"
                          color="#FBBF24"
                          bg="rgba(245,158,11,0.15)"
                          onPress={() => sendReminder(r)}
                          disabled={actioning === r.id}
                        />
                        <IconAction
                          icon={<XCircle size={14} color="#F87171" />}
                          label="Mark failed"
                          color="#F87171"
                          bg="rgba(239,68,68,0.15)"
                          danger
                          onPress={() => markFailed(r)}
                          disabled={actioning === r.id}
                        />
                      </>
                    )}
                    {(r.payment_status === 'failed' || r.payment_status === 'pending') && (
                      <IconAction
                        icon={<CheckCircle size={14} color="#34D399" />}
                        label="Rescue Payment"
                        color="#34D399"
                        bg="rgba(16,185,129,0.15)"
                        onPress={() => rescuePayment(r)}
                        disabled={actioning === (r.id || r._id)}
                      />
                    )}
                    <IconAction
                      icon={<Trash2 size={14} color="#F87171" />}
                      label="Delete"
                      color="#F87171"
                      bg={deleting === (r.id || r._id) ? 'rgba(100,100,100,0.15)' : 'rgba(239,68,68,0.15)'}
                      danger
                      onPress={() => deleteReg(r.id || r._id)}
                      disabled={deleting === (r.id || r._id)}
                    />
                  </View>
                </View>
                );
              })}
            </View>
          </ScrollView>
        )}
        {/* Pagination */}
        {filtered.length > PER_PAGE && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 10, paddingHorizontal: 14,
            borderTopWidth: 1, borderTopColor: SAC.border, flexWrap: 'wrap', gap: 10,
          }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
              Showing {safePage * PER_PAGE + 1}–{Math.min((safePage + 1) * PER_PAGE, filtered.length)} of {filtered.length}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Pressable
                onPress={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: safePage === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: safePage === 0 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: safePage === 0 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} color={SAC.text} />
              </Pressable>
              {Array.from({ length: totalPages }, (_, p) => p).map((p) => {
                if (totalPages > 7 && Math.abs(p - safePage) > 2 && p !== 0 && p !== totalPages - 1) {
                  return null;
                }
                return (
                  <Pressable key={p} onPress={() => setPage(p)} style={{
                    minWidth: 30, alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 6, borderRadius: 7,
                    backgroundColor: p === safePage ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: p === safePage ? '#7C3AED' : SAC.border,
                  }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: p === safePage ? '#fff' : SAC.text }}>{p + 1}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: safePage >= totalPages - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: safePage >= totalPages - 1 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} color={SAC.text} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      {/* Import Tickets Modal */}
      <Modal visible={showImport} transparent animationType="fade" onRequestClose={() => setShowImport(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(6,6,20,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            width: '100%', maxWidth: 900,
            backgroundColor: '#10182E',
            borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
            borderRadius: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.55, shadowRadius: 30,
            elevation: 12,
            maxHeight: '88vh' as any,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <View>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Import Ticketed Buyers</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted, marginTop: 2 }}>
                  Link buyers from Unstop, Student Alumni, or another platform to accounts
                </Text>
              </View>
              <Pressable onPress={() => setShowImport(false)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
            </View>
            <ScrollView style={{ padding: 20, maxHeight: '78vh' as any }} contentContainerStyle={{ gap: 12 }}>
              <ImportPanel />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      {detailRow && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setDetailRow(null)}>
          <View style={{ flex: 1, backgroundColor: SAC.panel2, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: '100%', maxWidth: 680,
              backgroundColor: '#141A2D',
              borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
              borderRadius: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.55, shadowRadius: 30,
              elevation: 12,
              maxHeight: '85vh' as any,
            }}>
              {/* Fixed Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Registration Details</Text>
                  {detailRow.registration_type === 'team' && (
                    <View style={{ backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontFamily: FONTS.xbold, fontSize: 10, color: '#C4B5FD' }}>TEAM</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => setDetailRow(null)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
              </View>

              {/* Scrollable Content */}
              <ScrollView style={{ maxHeight: '60vh' as any }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* 2-Column Grid Layout */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Name', value: detailRow.full_name, col: true },
                  { label: 'Email', value: detailRow.email, col: true },
                  { label: 'Phone', value: detailRow.phone, col: true },
                  { label: 'College', value: detailRow.college, col: true },
                  { label: 'Branch', value: detailRow.branch, col: false },
                  { label: 'Year', value: detailRow.year, col: false },
                  { label: 'Event', value: detailRow.event_title || detailRow.slug, col: true },
                  { label: 'Fee', value: Number(detailRow.fee || 0) > 0 ? `₹${Number(detailRow.fee).toLocaleString('en-IN')}` : 'FREE', col: false },
                  { label: 'Payment Status', value: (detailRow.payment_status || '—').toUpperCase(), col: false },
                  { label: 'Payment ID', value: detailRow.payment_id, col: true },
                  { label: 'Team Name', value: detailRow.team_name, col: detailRow.registration_type === 'team' },
                  { label: 'Team Size', value: detailRow.team_size > 1 ? `${detailRow.team_size} members` : null, col: detailRow.registration_type === 'team' },
                  { label: 'Ticket / Pass', value: detailRow.ticket_issued ? 'Issued — QR pass generated' : 'Not issued', col: true },
                  { label: 'Invoice', value: detailRow.invoice_issued ? (detailRow.invoice_no || 'Issued') : 'Not issued', col: true },
                  { label: 'SA Account', value: detailRow.has_account ? 'Yes' : 'No', col: false },
                  { label: 'Checked In', value: detailRow.checked_in_at ? new Date(detailRow.checked_in_at).toLocaleString() : 'No', col: false },
                  { label: 'Registered', value: detailRow.registered_at ? new Date(detailRow.registered_at).toLocaleString() : '—', col: true },
                  { label: 'Reminder Sent', value: detailRow.reminder_sent_at ? new Date(detailRow.reminder_sent_at).toLocaleString() : null, col: true },
                ].filter(item => item.value).map((item) => (
                  <View key={item.label} style={{ 
                    width: item.col ? '100%' : '48%', 
                    minWidth: item.col ? '100%' : 140,
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    borderRadius: 8, 
                    padding: 10,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                  }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{item.value || '—'}</Text>
                  </View>
                ))}
              </View>

                            {/* Team Members (if team registration) */}
              {detailRow.registration_type === 'team' && (
                <View style={{ backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: SAC.text }}>
                          Team: {detailRow.team_name || 'Team Registration'}
                        </Text>
                        <View style={{ backgroundColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: FONTS.xbold, fontSize: 10, color: '#DDD6FE' }}>
                            {((detailRow.team_members?.length || 0) + 1)} Passes Total
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: '#C4B5FD', marginTop: 2 }}>
                        1 Captain Pass ({detailRow.full_name}) + {(detailRow.team_members || []).length} Teammate Passes · {fmtAmt(detailRow.fee)} Paid
                      </Text>
                    </View>
                    {!editingTeamReg ? (
                      <Pressable onPress={() => handleEditTeam(detailRow)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                        <Pencil size={12} color="#C4B5FD" />
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#C4B5FD' }}>Edit Members</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  
                  {!editingTeamReg ? (
                    <View style={{ gap: 8 }}>
                      {(detailRow.team_members || []).map((member: any, idx: number) => {
                        const memberRegId = member.reg_id || `${detailRow.id || detailRow._id}_M${idx + 1}`;
                        const saId = member.sa_unique_id || `SA-STU-${(member.email || '').split('@')[0]}`;
                        return (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#C4B5FD' }}>{idx + 2}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }} numberOfLines={1}>
                                  {member.name || `Team Member ${idx + 2}`}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                  <View style={{ backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }}>
                                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#34D399' }}>Account Active</Text>
                                  </View>
                                  <View style={{ backgroundColor: 'rgba(124,58,237,0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' }}>
                                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#C4B5FD' }}>Pass Active</Text>
                                  </View>
                                </View>
                              </View>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginTop: 2 }}>
                                {member.email || '—'} {member.phone ? `• ${member.phone}` : ''}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#94A3B8' }}>
                                  SA ID: <Text style={{ color: '#E2E8F0', fontFamily: FONTS.bold }}>{saId}</Text>
                                </Text>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#94A3B8' }}>
                                  Pass ID: <Text style={{ color: '#E2E8F0', fontFamily: FONTS.bold }}>{memberRegId}</Text>
                                </Text>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#34D399' }}>
                                  • Covered under Team Pass
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#F59E0B', marginBottom: 8 }}>Team Name</Text>
                        <TextInput
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12 }}
                          placeholder="Enter team name"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={editTeamName}
                          onChangeText={setEditTeamName}
                        />
                      </View>
                      
                      {editTeamMembers.map((m, idx) => (
                        <View key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#C4B5FD', marginBottom: 8 }}>Team Member {idx + 2}</Text>
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}
                            placeholder="Full Name"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={m.name}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].name = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}
                            placeholder="Email Address"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            autoCapitalize="none"
                            value={m.email}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].email = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12 }}
                            placeholder="Phone (Optional)"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="numeric"
                            value={m.phone}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].phone = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Pressable onPress={() => setEditingTeamReg(null)} style={{ flex: 1, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, alignItems: 'center' }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.dim }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          saveTeamMembers().then(() => {
                            setDetailRow(prev => ({ ...prev, team_members: editTeamMembers, team_name: editTeamName }));
                          });
                        }} style={{ flex: 1, padding: 10, backgroundColor: '#7C3AED', borderRadius: 6, alignItems: 'center' }}>
                          {actioning === editingTeamReg?.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Save</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Session Coupons */}
              {(detailRow.coupons || []).length > 0 && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Session Coupons</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>{detailRow.coupons.length} issued</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(detailRow.coupons || []).map((c: any, ci: number) => (
                      <View key={ci} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 7,
                        paddingHorizontal: 10, paddingVertical: 8,
                        borderWidth: 1, borderColor: c.used ? 'rgba(16,185,129,0.30)' : 'rgba(167,139,250,0.25)',
                        minWidth: 140,
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.text }}>
                            {c.session_name || c.session_key}
                          </Text>
                          <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>
                            {c.session_day > 1 ? `Day ${c.session_day} · ` : ''}{c.coupon_code || ''}
                          </Text>
                          {c.used && (
                            <View style={{ marginTop: 4, gap: 2 }}>
                              {c.used_at && (
                                <Text style={{ fontFamily: FONTS.med, fontSize: 8.5, color: '#A78BFA' }}>
                                  Scanned: {new Date(c.used_at).toLocaleString()}
                                </Text>
                              )}
                              {c.scanned_location && (
                                <Text style={{ fontFamily: FONTS.med, fontSize: 8.5, color: '#A78BFA' }}>
                                  Location: {c.scanned_location}
                                </Text>
                              )}
                              {(c.scanned_lat || c.scanned_lng) && (
                                <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: '#6B7280' }}>
                                  Geo: {c.scanned_lat?.toFixed(4) || '—'}, {c.scanned_lng?.toFixed(4) || '—'}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                        <View style={{
                          borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3,
                          backgroundColor: c.used ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.15)',
                        }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: c.used ? '#34D399' : '#A78BFA' }}>
                            {c.used ? 'USED' : 'ACTIVE'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              </ScrollView>

              {/* Fixed Footer */}
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {(detailRow.payment_status === 'paid' || Number(detailRow.fee || 0) === 0) ? (
                  <Pressable
                    onPress={() => resendAccountTickets(detailRow)}
                    disabled={resending === (detailRow.id || detailRow._id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: '#7C3AED',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                      opacity: resending === (detailRow.id || detailRow._id) ? 0.6 : 1,
                    }}
                  >
                    <Send size={13} color="#C4B5FD" />
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11.5, color: '#DDD6FE' }}>
                      {resending === (detailRow.id || detailRow._id) ? 'Sending...' : 'Resend Accounts & Reissue Tickets'}
                    </Text>
                  </Pressable>
                ) : <View />}
                <GradientButton onPress={() => setDetailRow(null)} size="sm">
                  <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                </GradientButton>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Broadcast / Notice Modal */}
      {broadcastModal && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setBroadcastModal(null)}>
          <View style={{ flex: 1, backgroundColor: SAC.panel2, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: '100%', maxWidth: 620,
              backgroundColor: '#141A2D',
              borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
              borderRadius: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.6, shadowRadius: 32,
              elevation: 12, overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>
                    {broadcastModal.target_group === 'pending_unpaid' && 'Send Payment Recovery Notice'}
                    {broadcastModal.target_group === 'confirmed_paid' && 'Send Attendee Notice & Handbook'}
                    {broadcastModal.target_group === 'unregistered_students' && 'Send Event Invitation Newsletter'}
                  </Text>
                </View>
                <Pressable onPress={() => setBroadcastModal(null)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
              </View>

              {/* Body */}
              <ScrollView style={{ padding: 20, maxHeight: '65vh' as any }} contentContainerStyle={{ gap: 14 }}>
                {/* Target Audience Pill */}
                <View style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>Target Segment</Text>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#E2E8F0', marginTop: 2 }}>
                    {broadcastModal.target_group === 'pending_unpaid' && `Pending Unpaid Registrants (${broadcastSummary?.pending_unpaid ?? pending.length} users)`}
                    {broadcastModal.target_group === 'confirmed_paid' && `Confirmed Active Attendees (${broadcastSummary?.confirmed_paid ?? paid.length} users)`}
                    {broadcastModal.target_group === 'unregistered_students' && `Platform Students (${broadcastSummary?.unregistered_students ?? 0} users)`}
                  </Text>
                </View>

                {/* Email Subject */}
                <View>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 6 }}>Email Subject Line</Text>
                  <TextInput
                    value={broadcastModal.subject}
                    onChangeText={(t) => setBroadcastModal((prev: any) => ({ ...prev, subject: t }))}
                    placeholder="Enter email subject..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                      color: SAC.text, fontSize: 13.5, fontFamily: FONTS.regular,
                    }}
                  />
                </View>

                {/* Custom Message Body */}
                <View>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 6 }}>
                    Custom Announcement / Note <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>(Optional)</Text>
                  </Text>
                  <TextInput
                    value={broadcastModal.custom_message}
                    onChangeText={(t) => setBroadcastModal((prev: any) => ({ ...prev, custom_message: t }))}
                    placeholder="Add an optional message or highlight for recipients..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                      color: SAC.text, fontSize: 13, fontFamily: FONTS.regular, minHeight: 90, textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* Included Assets info */}
                <View style={{ padding: 12, backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#C4B5FD' }}>✓ Automatic Attachments &amp; Links Included:</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 11.5, color: '#DDD6FE', marginTop: 4, lineHeight: 16 }}>
                    • Attached PDF: <strong style={{ color: SAC.text }}>HackWave_3.0_Event_Handbook.pdf</strong><br/>
                    • Personalized pass registration / checkout / ticket links<br/>
                    • Real-time payment verification and QR entry credentials
                  </Text>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <SecondaryButton onPress={() => setBroadcastModal(null)} size="sm">
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                </SecondaryButton>
                <GradientButton
                  onPress={submitBroadcast}
                  disabled={broadcasting}
                  size="sm"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Send size={13} color="#fff" />
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>
                      {broadcasting ? 'Sending Broadcast...' : 'Send Broadcast'}
                    </Text>
                  </View>
                </GradientButton>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Revenue Audit Modal */}
      <Modal visible={showAudit} transparent animationType="fade" onRequestClose={() => setShowAudit(false)}>
        <View style={{ flex: 1, backgroundColor: SAC.panel2, justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, maxWidth: 960, width: '100%', alignSelf: 'center', maxHeight: '90vh' as any }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: FONTS.xbold, fontSize: 16, color: SAC.text }}>Revenue Audit — DB vs Razorpay</Text>
              <Pressable onPress={() => setShowAudit(false)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <X size={16} color="#fff" />
              </Pressable>
            </View>
            {auditData && (
              <>
                {/* Summary */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Registrations', value: String(auditData.summary?.total_registrations || 0), color: SAC.text, filter: 'all' as const },
                    { label: 'DB Razorpay Total', value: fmtAmt(auditData.summary?.db_total_razorpay || 0), color: '#86EFAC', filter: 'paid' as const },
                    { label: 'Admin Overrides', value: fmtAmt(auditData.summary?.db_total_admin_override || 0), color: '#FBBF24', filter: 'admin' as const },
                    { label: 'Free Accounts', value: String(auditData.summary?.db_total_free || 0), color: '#C4B5FD', filter: 'free' as const },
                    { label: 'Pending', value: fmtAmt(auditData.summary?.db_total_pending || 0), color: '#F59E0B', filter: 'all' as const },
                    { label: 'Failed', value: fmtAmt(auditData.summary?.db_total_failed || 0), color: '#EF4444', filter: 'failed' as const },
                  ].map((t) => (
                    <Pressable key={t.label} onPress={() => setAuditFilter(t.filter)} style={{
                      flex: 1, minWidth: 100, backgroundColor: auditFilter === t.filter ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 10, padding: 10, borderWidth: 1, borderColor: auditFilter === t.filter ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                    }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9, letterSpacing: 0.3 }}>{t.label}</Text>
                      <Text style={{ color: t.color, fontFamily: FONTS.xbold, fontSize: 14, marginTop: 3 }}>{t.value}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Team vs Individual breakdown */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.10)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)' }}>
                    <Text style={{ color: '#93C5FD', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.5 }}>TEAMS</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Registrations</Text>
                        <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.teams?.count || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Members</Text>
                        <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.teams?.members_total || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Revenue</Text>
                        <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 18 }}>{fmtAmt(auditData.summary?.teams?.revenue || 0)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                    <Text style={{ color: '#6EE7B7', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.5 }}>INDIVIDUALS</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Registrations</Text>
                        <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.individuals?.count || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Revenue</Text>
                        <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 18 }}>{fmtAmt(auditData.summary?.individuals?.revenue || 0)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Razorpay breakdown */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Razorpay Gross', value: fmtAmt(auditData.summary?.razorpay_gross || 0), color: '#C4B5FD' },
                    { label: 'Razorpay Fees', value: fmtAmt(auditData.summary?.razorpay_fees || 0), color: '#FCA5A5' },
                    { label: 'Razorpay Tax', value: fmtAmt(auditData.summary?.razorpay_tax || 0), color: '#FCA5A5' },
                    { label: 'Razorpay Settled', value: fmtAmt(auditData.summary?.razorpay_settled || 0), color: '#93C5FD' },
                    { label: 'Discrepancy', value: fmtAmt(auditData.summary?.discrepancy || 0), color: Math.abs(auditData.summary?.discrepancy || 0) > 100 ? '#F87171' : '#86EFAC' },
                  ].map((t) => (
                    <View key={t.label} style={{ flex: 1, minWidth: 110, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9, letterSpacing: 0.3 }}>{t.label}</Text>
                      <Text style={{ color: t.color, fontFamily: FONTS.xbold, fontSize: 14, marginTop: 3 }}>{t.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Total deduction from fetched RP fees */}
                {Object.keys(razorpayFees).length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.xbold, fontSize: 10 }}>TOTAL DEDUCTIONS (per-transaction)</Text>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 10 }}>Fees: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0), 0).toFixed(2)}</Text>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 10 }}>Tax: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.tax || 0), 0).toFixed(2)}</Text>
                    <Text style={{ color: '#EF4444', fontFamily: FONTS.xbold, fontSize: 10 }}>Total: ₹{(Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0) + (f.tax || 0), 0)).toFixed(2)}</Text>
                    <Text style={{ color: '#86EFAC', fontFamily: FONTS.med, fontSize: 10 }}>Net received: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.net || 0), 0).toFixed(2)}</Text>
                  </View>
                )}

                {/* Registration list with filters */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>REGISTRATIONS ({auditData.registrations?.length || 0})</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={exportAuditCSV} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: '#22C55E' }}>
                    <Text style={{ color: '#22C55E', fontFamily: FONTS.semi, fontSize: 9.5 }}>Export CSV</Text>
                  </Pressable>
                  {[
                    { key: 'all', label: 'All', count: auditData.registrations?.length || 0 },
                    { key: 'free', label: 'Free (₹0)', count: (auditData.registrations || []).filter((r: any) => r.fee <= 0 && r.status === 'paid' && !r.is_team_member && !r.is_admin_pay).length },
                    { key: 'admin', label: 'Admin Override', count: (auditData.registrations || []).filter((r: any) => r.is_admin_pay).length },
                    { key: 'paid', label: 'Paid', count: (auditData.registrations || []).filter((r: any) => r.status === 'paid' && r.fee > 0 && !r.is_admin_pay).length },
                    { key: 'team', label: 'Team Members', count: (auditData.registrations || []).filter((r: any) => r.is_team_member).length },
                    { key: 'pending', label: 'Pending', count: (auditData.registrations || []).filter((r: any) => r.status === 'pending').length },
                    { key: 'failed', label: 'Failed', count: (auditData.registrations || []).filter((r: any) => r.status === 'failed').length },
                  ].map((f) => (
                    <Pressable key={f.key} onPress={() => setAuditFilter(f.key as any)} style={{
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                      backgroundColor: auditFilter === f.key ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: auditFilter === f.key ? '#7C3AED' : 'rgba(255,255,255,0.1)',
                    }}>
                      <Text style={{ color: auditFilter === f.key ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 9.5 }}>
                        {f.label} ({f.count})
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {/* Per-event filter */}
                {auditData.registrations && (() => {
                  const slugs = [...new Set((auditData.registrations || []).map((r: any) => r.slug).filter(Boolean))] as string[];
                  if (slugs.length <= 1) return null;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9 }}>Event:</Text>
                      <Pressable onPress={() => setAuditEventFilter('all')} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: auditEventFilter === 'all' ? '#3B82F6' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: auditEventFilter === 'all' ? '#3B82F6' : 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: auditEventFilter === 'all' ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 8.5 }}>All</Text>
                      </Pressable>
                      {slugs.map((slugItem) => (
                        <Pressable key={slugItem} onPress={() => setAuditEventFilter(slugItem)} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: auditEventFilter === slugItem ? '#3B82F6' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: auditEventFilter === slugItem ? '#3B82F6' : 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ color: auditEventFilter === slugItem ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 8.5 }}>{slugItem}</Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })()}
                {/* Fetch Razorpay Fees button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Pressable
                    onPress={async () => {
                      setFetchingFees(true);
                      try {
                        const pids = (auditData.registrations || [])
                          .map((r: any) => r.payment_id)
                          .filter((pid: string) => pid && !pid.startsWith('ADMIN_PAY_'));
                        const unique = [...new Set(pids)] as string[];
                        // Only fetch payment_ids not already in cache
                        const toFetch = unique.filter((pid: string) => !(pid in razorpayFees));
                        if (toFetch.length > 0) {
                          const res = await api.adminRazorpayPaymentFees(toFetch);
                          setRazorpayFees(prev => ({ ...prev, ...(res?.fees || {}) }));
                        }
                      } catch { /* ignore */ }
                      setFetchingFees(false);
                    }}
                    disabled={fetchingFees}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: fetchingFees ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: fetchingFees ? 'rgba(255,255,255,0.1)' : '#F59E0B' }}
                  >
                    <Text style={{ color: fetchingFees ? SAC.muted : '#F59E0B', fontFamily: FONTS.semi, fontSize: 9.5 }}>
                      {fetchingFees ? 'Fetching…' : Object.keys(razorpayFees).length > 0 ? `RP Fees Loaded (${Object.keys(razorpayFees).length})` : 'Fetch Razorpay Fees'}
                    </Text>
                  </Pressable>
                  {Object.keys(razorpayFees).length > 0 && (
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>
                      Total RP Fees: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0), 0).toFixed(2)} · Tax: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.tax || 0), 0).toFixed(2)}
                    </Text>
                  )}
                </View>
                <ScrollView style={{ maxHeight: 360 }}>
                  {(auditData.registrations || []).filter((r: any) => {
                    if (auditEventFilter !== 'all' && r.slug !== auditEventFilter) return false;
                    if (auditFilter === 'all') return true;
                    if (auditFilter === 'free') return r.fee <= 0 && r.status === 'paid' && !r.is_team_member && !r.is_admin_pay;
                    if (auditFilter === 'admin') return r.is_admin_pay;
                    if (auditFilter === 'paid') return r.status === 'paid' && r.fee > 0 && !r.is_admin_pay;
                    if (auditFilter === 'team') return r.is_team_member;
                    if (auditFilter === 'pending') return r.status === 'pending';
                    if (auditFilter === 'failed') return r.status === 'failed';
                    return true;
                  }).map((r: any, i: number) => {
                    const rpFee = razorpayFees[r.payment_id];
                    const hasDiscrepancy = rpFee && !rpFee.error && r.fee > 0 && Math.abs(r.fee - rpFee.net) > 1;
                    return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 6, backgroundColor: hasDiscrepancy ? 'rgba(239,68,68,0.08)' : undefined }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: r.is_free ? '#C4B5FD' : r.is_admin_pay ? '#FBBF24' : r.status === 'paid' ? '#34D399' : r.status === 'pending' ? '#F59E0B' : '#EF4444' }} />
                      <View style={{ flex: 2, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 10.5 }} numberOfLines={1}>{r.name}</Text>
                          {r.source && r.source !== 'our_platform' && r.source !== 'studentalumni' && (
                            <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, backgroundColor: r.source === 'unstop' ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)', borderWidth: 1, borderColor: r.source === 'unstop' ? 'rgba(124,58,237,0.45)' : 'rgba(14,165,233,0.45)' }}>
                              <Text style={{ fontFamily: FONTS.xbold, fontSize: 7, color: r.source === 'unstop' ? '#C4B5FD' : '#7DD3FC', letterSpacing: 0.4 }}>{r.source.toUpperCase()}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 8 }} numberOfLines={1}>{r.email}</Text>
                      </View>
                      <Text style={{ width: 45, color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }} numberOfLines={1}>{r.reg_type}{r.team_size > 1 ? `(${r.team_size})` : ''}</Text>
                      <Text style={{ width: 50, color: r.fee > 0 ? '#86EFAC' : r.fee === 0 ? '#C4B5FD' : '#EF4444', fontFamily: FONTS.xbold, fontSize: 10 }}>₹{r.fee}</Text>
                      {razorpayFees[r.payment_id] && !razorpayFees[r.payment_id].error ? (
                        <Text style={{ width: 80, color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 8.5 }} numberOfLines={1}>-₹{(razorpayFees[r.payment_id].fee || 0).toFixed(0)}f -₹{(razorpayFees[r.payment_id].tax || 0).toFixed(0)}t</Text>
                      ) : null}
                      {razorpayFees[r.payment_id] && !razorpayFees[r.payment_id].error ? (
                        <Text style={{ width: 55, color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 9.5 }}>₹{(razorpayFees[r.payment_id].net || 0).toFixed(0)}</Text>
                      ) : null}
                      <Text style={{ flex: 1, minWidth: 60, color: r.is_admin_pay ? '#FBBF24' : '#93C5FD', fontFamily: FONTS.med, fontSize: 8 }} numberOfLines={1}>{r.payment_id || '—'}</Text>
                      <Text style={{ width: 42, color: r.status === 'paid' ? '#34D399' : r.status === 'pending' ? '#FBBF24' : '#EF4444', fontFamily: FONTS.xbold, fontSize: 8, letterSpacing: 0.3 }}>{(r.status || '').slice(0, 4).toUpperCase()}</Text>
                    </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Volunteers Panel ──────────────────────────────────────────────────────────
export function VolunteersPanel() {
  const { confirm } = useConfirm();
  const [showcases, setShowcases] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addSlug, setAddSlug] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('volunteer');
  const [q, setQ] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [removing, setRemoving] = useState<string | null>(null);
  const { flash } = useToast();

  const apiBase = getBaseUrl();

  const authToken = async () => {
    const { tokenStore } = await import('@/src/models/services/api');
    const token = await tokenStore.getAccess();
    return token || '';
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await authToken();
      const [volResp, showResp] = await Promise.all([
        fetch(`${apiBase}/api/echo/admin/volunteers`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`${apiBase}/api/echo/admin/showcases`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      if (volResp.ok) {
        const data = await volResp.json();
        setItems(data.volunteers || []);
      }
      if (showResp.ok) {
        const data = await showResp.json();
        const list = Array.isArray(data) ? data : (data.items || data.showcases || []);
        setShowcases(list.map((scItem: any) => ({ slug: scItem.slug, title: scItem.title || scItem.slug })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setAdding(true);
    setAddSlug(showcases.length === 1 ? showcases[0].slug : '');
    setEmail('');
    setRole('volunteer');
  };

  const addVolunteer = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !addSlug) return;
    setSaving(true);
    try {
      const token = await authToken();
      const resp = await fetch(`${apiBase}/api/echo/admin/${addSlug}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: e, role }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed to add');
      flash(data.has_account ? `${e} added as ${role} — has SA account` : `${e} added as ${role} — will get access on signup`);
      setAdding(false);
      setEmail('');
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to add volunteer');
    } finally {
      setSaving(false);
    }
  };

  const removeVolunteer = async (v: any) => {
    const ok = await confirm({
      title: 'Remove volunteer',
      message: `Remove ${v.email} as ${v.role} for ${v.event_title || v.slug}?`,
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setRemoving(v._id);
    try {
      const token = await authToken();
      await fetch(`${apiBase}/api/echo/admin/${v.slug}/volunteers/${v._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setItems((prev) => prev.filter((x) => x._id !== v._id));
      flash('Volunteer removed');
    } catch { flash('Failed to remove volunteer'); }
    setRemoving(null);
  };

  const filtered = items.filter((v) => {
    const s = q.toLowerCase();
    const matchQ = !s || v.email?.toLowerCase().includes(s) || (v.user_name || '').toLowerCase().includes(s) || (v.event_title || '').toLowerCase().includes(s);
    const matchEvent = filterEvent === 'all' || v.slug === filterEvent;
    return matchQ && matchEvent;
  });

  const uniqueEvents = Array.from(new Set(items.map((v) => v.slug).filter(Boolean)));

  return (
    <View style={{ gap: 16 }}>
      {/* Header + Add button */}
      <Card style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Volunteers & Ambassadors</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 3 }}>
              Registered users who can scan coupons at the venue. They get access to the scanner page only.
            </Text>
          </View>
          <GradientButton onPress={openAdd} size="sm">
            <PlusCircle size={13} color="#fff" />
            <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 }}>Add Volunteer</Text>
          </GradientButton>
        </View>

        {/* Add wizard */}
        {adding && (
          <View style={{ marginTop: 12, backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>New Volunteer</Text>
              <Pressable onPress={() => setAdding(false)} style={{ padding: 4 }}><X size={16} color={SAC.muted} /></Pressable>
            </View>

            {!addSlug ? (
              <>
                <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                  Step 1 · Select the event this person will help with
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {showcases.length === 0 && (
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.dim }}>No showcases found. Create an event first.</Text>
                  )}
                  {showcases.map((scItem) => (
                    <Pressable
                      key={scItem?.slug || Math.random()}
                      onPress={() => scItem?.slug && setAddSlug(scItem.slug)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9,
                        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>{scItem?.title || scItem?.slug}</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{scItem?.slug}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                    Step 2 · Email & role for{' '}
                    <Text style={{ color: '#C4B5FD' }}>{showcases.find((s) => s.slug === addSlug)?.title || addSlug}</Text>
                  </Text>
                  <Pressable onPress={() => setAddSlug('')} style={{ padding: 4 }}>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: '#A78BFA' }}>← change event</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, marginBottom: 4 }}>Email</Text>
                    <TextInput value={email} onChangeText={setEmail} placeholder="volunteer@email.com"
                      placeholderTextColor="#475569" keyboardType="email-address" autoCapitalize="none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, color: SAC.text, fontSize: 13 }} />
                  </View>
                  <View style={{ width: 140 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, marginBottom: 4 }}>Role</Text>
                    <SelectNative value={role} onChange={setRole} options={['volunteer', 'ambassador']} />
                  </View>
                  <GradientButton onPress={addVolunteer} loading={saving} disabled={saving || !email.trim()} size="sm">
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Add</Text>
                  </GradientButton>
                </View>
              </>
            )}
          </View>
        )}

        {/* Search + filter */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchField value={q} onChange={setQ} placeholder="Search name, email, event…" width="260px" />
          <select
            value={filterEvent}
            onChange={(e: any) => setFilterEvent(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 12px', color: SAC.text, fontSize: 12, fontFamily: 'DM Sans',
              outline: 'none', cursor: 'pointer', minWidth: 150,
            }}
          >
            <option value="all" style={{ background: '#1e1b4b', color: SAC.text }}>All Events</option>
            {uniqueEvents.map((slug) => (
              <option key={slug} value={slug} style={{ background: '#1e1b4b', color: SAC.text }}>
                {items.find((v) => v.slug === slug)?.event_title || slug}
              </option>
            ))}
          </select>
        </View>
      </Card>

      {/* Volunteers table */}
      <Card style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted }}>
            {filtered.length > 0 ? `${filtered.length} volunteer${filtered.length > 1 ? 's' : ''}` : 'No volunteers'}
          </Text>
          <Pressable onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 4 }}>
            <RefreshCw size={12} color={SAC.muted} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>No volunteers yet</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, textAlign: 'center', maxWidth: 340 }}>
              {items.length === 0
                ? 'Add volunteers to let them scan coupons at the venue.'
                : 'No volunteers match your search / filter.'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 760, flex: 1 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ flex: 1.5, minWidth: 200, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>VOLUNTEER</Text>
                <Text style={{ flex: 1.5, minWidth: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ROLE</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STATUS</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ADDED</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {filtered.map((v) => (
                <View key={v._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ flex: 1.5, minWidth: 200 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: SAC.text }}>{v.email}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{v.user_name || '—'}</Text>
                  </View>
                  <View style={{ flex: 1.5, minWidth: 180 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{v.event_title || v.slug || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{v.slug}</Text>
                  </View>
                  <View style={{ width: 110, minWidth: 0 }}>
                    <StatusPill kind="info" label={(v.role || 'volunteer').toUpperCase()} />
                  </View>
                  <View style={{ width: 110, minWidth: 0 }}>
                    <StatusPill kind={v.has_account ? 'success' : 'warn'} label={v.has_account ? 'Active' : 'Pending'} />
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                      {v.created_at ? new Date(v.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </Text>
                  </View>
                  <View style={{ width: 90, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    <Tip label="Remove volunteer">
                      <Pressable onPress={() => removeVolunteer(v)} style={cs.iconBtn}>
                        {removing === v._id ? <ActivityIndicator size={12} color="#F87171" /> : <Trash2 size={13} color="#F87171" />}
                      </Pressable>
                    </Tip>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </View>
  );
}


// ── Live Scan Monitor Panel ───────────────────────────────────────────────────
export function LiveScanMonitorPanel() {
  const { flash } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<{ reg: any; coupon: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'not_checked'>('all');
  const [couponFilter, setCouponFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [saFilter, setSaFilter] = useState<'all' | 'complete_100' | 'incomplete' | 'no_account'>('all');
  const [editingReg, setEditingReg] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const PER_PAGE = 20;

  useEffect(() => {
    if (editingReg) {
      setEditEmail(editingReg.email);
      setEditName(editingReg.full_name);
    }
  }, [editingReg]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminEchoRegistrations();
      setData(res?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => { setPage(0); }, [q, statusFilter, couponFilter, saFilter]);

  const stats = useMemo(() => {
    let checkedIn = 0;
    let couponsUsed = 0;
    let lunch = 0;
    let swag = 0;
    let others = 0;
    let saMembers = 0;
    let sa100 = 0;
    let noAccount = 0;
    let certIssued = 0;

    data.forEach(reg => {
      if (reg.checked_in_at) checkedIn++;
      if (reg.has_sa_account) saMembers++;
      if (reg.is_profile_100) sa100++;
      if (!reg.has_sa_account) noAccount++;
      if (reg.has_certificate) certIssued++;

      if (reg.coupons) {
        reg.coupons.forEach((c: any) => {
          if (c.used) {
            couponsUsed++;
            const name = c.session_name?.toLowerCase() || '';
            if (name.includes('lunch')) lunch++;
            else if (name.includes('swag') || name.includes('tshirt') || name.includes('t-shirt')) swag++;
            else others++;
          }
        });
      }
    });

    return { checkedIn, couponsUsed, lunch, swag, others, saMembers, sa100, noAccount, certIssued };
  }, [data]);

  const filtered = data.filter(d => {
    const matchesSearch = !q || 
      d.full_name?.toLowerCase().includes(q.toLowerCase()) || 
      d.email?.toLowerCase().includes(q.toLowerCase()) || 
      d.id?.toLowerCase().includes(q.toLowerCase()) ||
      d.team_name?.toLowerCase().includes(q.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'checked_in' && d.checked_in_at) ||
      (statusFilter === 'not_checked' && !d.checked_in_at);
    
    const hasUsedCoupons = d.coupons?.some((c: any) => c.used);
    const hasUnusedCoupons = d.coupons?.some((c: any) => !c.used);
    const matchesCoupon = couponFilter === 'all' ||
      (couponFilter === 'used' && hasUsedCoupons) ||
      (couponFilter === 'unused' && hasUnusedCoupons);

    const matchesSa = saFilter === 'all' ||
      (saFilter === 'complete_100' && d.is_profile_100) ||
      (saFilter === 'incomplete' && d.has_sa_account && !d.is_profile_100) ||
      (saFilter === 'no_account' && !d.has_sa_account);
    
    return matchesSearch && matchesStatus && matchesCoupon && matchesSa;
  });
  
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleSendProfileReminders = async () => {
    const ok = await confirm({
      title: 'Send Profile & SA Reminders',
      message: 'Send automated 100% profile & SA account reminders via Email + WhatsApp to all incomplete registrants?',
      confirmText: 'Send Reminders',
    });
    if (!ok) return;
    setSendingReminders(true);
    try {
      const res = await api.adminEchoSendProfileReminders({ target_group: 'all_incomplete', channel: 'both' });
      flash(`Loop Agent Dispatched! Processed: ${res?.processed_count}, Emails: ${res?.emails_sent}, WhatsApp: ${res?.whatsapp_sent}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to send reminders', 'error');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleIssueCert = async (reg: any) => {
    try {
      const res = await api.adminEchoIssueCertificate(reg.id);
      flash(`Certificate issued for ${reg.full_name}! Code: ${res?.code}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to issue certificate', 'error');
    }
  };

  const handleIssue3Certs = async (reg: any) => {
    try {
      const res = await request(`/echo/admin/registrations/${reg.id}/issue-3-certificates`, { method: 'POST' });
      flash(`All 3 certificates issued for ${reg.full_name}! (Built by Sunset, Hackwave 3.0, Cyber Conclave)`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to issue 3 certificates', 'error');
    }
  };

  const handleResetCerts = async (reg: any) => {
    const ok = await confirm({
      title: 'Reset Certificate Status',
      message: `Reset issued flags for ${reg.full_name} (${reg.email})? Existing certificates stay verifiable; the row returns to "Issue All 3 Certs" so you can re-issue.`,
      confirmText: 'Reset & Re-issue',
      danger: true,
    });
    if (!ok) return;
    try {
      await request(`/echo/admin/registrations/${reg.id}/reset-certificates`, { method: 'POST' });
      flash(`Certificate status reset for ${reg.full_name}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to reset', 'error');
    }
  };

  const handleBulkDispatch3Certs = async () => {
    const ok = await confirm({
      title: 'Dispatch 3 Certs to 100% Profiles',
      message: 'Run the autonomous agent to issue and deliver all 3 certificates (Built by Sunset, Hackwave 3.0, Cyber Conclave) via Email & WhatsApp to attendees with 100% completed profiles?',
      confirmText: 'Dispatch Certificates',
    });
    if (!ok) return;
    setSendingReminders(true);
    try {
      const res = await api.adminEchoSendProfileReminders({ target_group: 'complete_100_dispatch', channel: 'both' });
      flash(`Autonomous Agent Dispatched 3 Certificates! Processed: ${res?.processed_count}, Emails: ${res?.emails_sent}, WhatsApp: ${res?.whatsapp_sent}`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to dispatch certificates', 'error');
    } finally {
      setSendingReminders(false);
    }
  };

  const [bulkIssuing, setBulkIssuing] = useState(false);
  const handleBulkIssueAll = async () => {
    const ok = await confirm({
      title: 'Issue 3 Certs to ALL',
      message: `Issue all 3 certificates to ALL ${data.length} registrants at once + send each person their 3 individual emails? Already-issued users are skipped automatically.`,
      confirmText: 'Issue to All',
    });
    if (!ok) return;
    setBulkIssuing(true);
    try {
      const res = await api.adminEchoBulkIssue3Certs();
      flash(res?.message || `Bulk issue complete: ${res?.processed} processed, ${res?.emails_sent} emails sent`);
      load();
    } catch (err: any) {
      flash(err?.message || 'Bulk issue failed', 'error');
    } finally {
      setBulkIssuing(false);
    }
  };

  const sourceBadge = (s: string | null | undefined) => {
    if (!s || s === 'our_platform' || s === 'studentalumni') return null;
    const isUnstop = s === 'unstop';
    return (
      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start',
        backgroundColor: isUnstop ? 'rgba(124,58,237,0.18)' : 'rgba(14,165,233,0.18)',
        borderWidth: 1, borderColor: isUnstop ? 'rgba(124,58,237,0.45)' : 'rgba(14,165,233,0.45)' }}>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.xbold, fontSize: 8, letterSpacing: 0.4, color: isUnstop ? '#C4B5FD' : '#7DD3FC' }}>
          {s.toUpperCase()}
        </Text>
      </View>
    );
  };

  const saAccountBadge = (reg: any) => {
    const pct = reg.profile_completion_pct || 0;
    if (reg.is_profile_100 || pct >= 100) {
      return (
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#34D399' }}>
            Profile 100% Complete ✓
          </Text>
        </View>
      );
    }
    if (pct > 0) {
      return (
        <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(245,179,66,0.18)', borderWidth: 1, borderColor: 'rgba(245,179,66,0.4)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#F5B342' }}>
            Profile ({pct}%) · Incomplete
          </Text>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#FCA5A5' }}>
          Profile (0%) · Incomplete
        </Text>
      </View>
    );
  };

  const fmtStamp = (v: any) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    const date = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  };

  const openMap = (lat?: number, lng?: number) => {
    if (lat && lng && typeof window !== 'undefined') {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    }
  };

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [certTitle, setCertTitle] = useState('Built by Sunset — Project Build Certificate');
  const [certRecipientEmail, setCertRecipientEmail] = useState('');
  const [certIssuer, setCertIssuer] = useState('StudentAlumni × Hackwave 3.0');
  const [uploadingCert, setUploadingCert] = useState(false);

  const handleCustomUploadCert = async () => {
    if (!certRecipientEmail) {
      flash('Please enter attendee email', 'error');
      return;
    }
    setUploadingCert(true);
    try {
      const res: any = await request('/certificates/upload', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: certRecipientEmail,
          title: certTitle,
          issuer: certIssuer,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      flash(`Certificate uploaded & dual-synced! Code: ${res?.verification_code || 'Issued'}`);
      setUploadModalVisible(false);
      setCertRecipientEmail('');
      load();
    } catch (err: any) {
      flash(err?.message || 'Upload failed', 'error');
    } finally {
      setUploadingCert(false);
    }
  };

  const [loopAgentStatus, setLoopAgentStatus] = useState<any>(null);
  const [loopAgentLoading, setLoopAgentLoading] = useState(false);

  const fetchLoopAgentStatus = useCallback(async () => {
    try {
      const res: any = await request('/echo/admin/loop-agent/status');
      setLoopAgentStatus(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchLoopAgentStatus();
  }, [fetchLoopAgentStatus]);

  const handleToggleLoopAgent = async (start: boolean) => {
    setLoopAgentLoading(true);
    try {
      const endpoint = start ? '/echo/admin/loop-agent/start?interval_seconds=86400' : '/echo/admin/loop-agent/stop';
      const res: any = await request(endpoint, { method: 'POST' });
      flash(res?.message || (start ? '24h Daily Loop Agent activated!' : 'Loop Agent paused.'));
      fetchLoopAgentStatus();
    } catch (err: any) {
      flash(err?.message || 'Failed to update loop agent status', 'error');
    } finally {
      setLoopAgentLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, gap: 20 }}>
      {/* 24h Daily Autonomous Profile Loop Agent Banner */}
      <View style={{ backgroundColor: 'rgba(124,92,252,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)', padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 280 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Bot size={20} color="#C9A7FF" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>
                24h Autonomous Daily Profile Alert Loop Agent
              </Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: loopAgentStatus?.is_running ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: loopAgentStatus?.is_running ? '#10B981' : '#F59E0B' }}>
                <Text style={{ color: loopAgentStatus?.is_running ? '#34D399' : '#FBBF24', fontFamily: FONTS.bold, fontSize: 11 }}>
                  {loopAgentStatus?.is_running ? '● DAILY LOOP ACTIVE (24h)' : '● IDLE / MANUAL'}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: '#C7D2FE' }}>
              Automatically scans incomplete profiles daily at 09:00 UTC, dispatches email & WhatsApp completion alerts, and auto-issues all 3 certificates upon 100% completion.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {loopAgentStatus?.is_running ? (
              <Pressable
                onPress={() => handleToggleLoopAgent(false)}
                disabled={loopAgentLoading}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#EF4444' }}>
                <X size={14} color="#FCA5A5" />
                <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 }}>⏸️ Pause 24h Loop</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleToggleLoopAgent(true)}
                disabled={loopAgentLoading}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#10B981' }}>
                <Play size={14} color="#6EE7B7" />
                <Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 12 }}>▶️ Enable 24h Daily Loop</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSendProfileReminders}
              disabled={sendingReminders}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C5CFC', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Zap size={14} color="#FFF" />
              <Text style={{ color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 }}>
                {sendingReminders ? 'Sending Alerts...' : '⚡ Trigger Daily Alert Loop Now'}
              </Text>
            </Pressable>
          </View>
        </View>

        {loopAgentStatus?.last_run_stats && (
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted }}>
              🕒 Last Execution: <Text style={{ color: '#FFF', fontFamily: FONTS.bold }}>{loopAgentStatus.last_run_at ? new Date(loopAgentStatus.last_run_at).toLocaleString() : 'Never'}</Text>
            </Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted }}>
              📧 Daily Emails Sent: <Text style={{ color: '#34D399', fontFamily: FONTS.bold }}>{loopAgentStatus.last_run_stats.emails_sent || 0}</Text>
            </Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted }}>
              💬 WhatsApp Alerts: <Text style={{ color: '#34D399', fontFamily: FONTS.bold }}>{loopAgentStatus.last_run_stats.whatsapp_sent || 0}</Text>
            </Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted }}>
              🔄 Total Cycles: <Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold }}>{loopAgentStatus.total_cycles_executed || 0}</Text>
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: SAC.text }}>Live Scan & SA Member Monitor</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted }}>Real-time check-ins, 100% profile completion, and ECHO certificates</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={handleSendProfileReminders}
            disabled={sendingReminders}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,92,252,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#7C5CFC' }}>
            <Sparkles size={14} color="#C9A7FF" />
            <Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold, fontSize: 12 }}>
              {sendingReminders ? 'Loop Agent Sending...' : '⚡ Send 100% Profile & SA Reminders'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleBulkDispatch3Certs}
            disabled={sendingReminders}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#10B981' }}>
            <Award size={14} color="#6EE7B7" />
            <Text style={{ color: '#6EE7B7', fontFamily: FONTS.bold, fontSize: 12 }}>
              🎓 Dispatch 3 Certs to 100% Profiles
            </Text>
          </Pressable>

          <Pressable
            onPress={handleBulkIssueAll}
            disabled={bulkIssuing || sendingReminders}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.22)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#F59E0B', opacity: (bulkIssuing || sendingReminders) ? 0.6 : 1 }}>
            <Award size={14} color="#FCD34D" />
            <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 12 }}>
              {bulkIssuing ? 'Issuing to All…' : '🎓 Issue 3 Certs to ALL'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setUploadModalVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3B82F6' }}>
            <Upload size={14} color="#93C5FD" />
            <Text style={{ color: '#93C5FD', fontFamily: FONTS.bold, fontSize: 12 }}>
              ⬆️ Upload Cert & Dual-Sync
            </Text>
          </Pressable>

          <View style={{ width: 220 }}>
            <SearchField value={q} onChange={setQ} placeholder="Search name, email, ID..." />
          </View>
          <SecondaryButton onPress={load}><RefreshCw size={14} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>Refresh</Text></SecondaryButton>
        </View>
      </View>

      {/* Filter row */}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {/* SA Account & Profile filter */}
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'complete_100', label: '100% Profile' },
            { id: 'incomplete', label: 'Incomplete (<100%)' },
            { id: 'no_account', label: 'No SA Account' },
          ].map(f => (
            <Pressable key={f.id} onPress={() => setSaFilter(f.id as any)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: saFilter === f.id ? 'rgba(124,92,252,0.3)' : 'transparent' }}>
              <Text style={{ fontSize: 12, fontFamily: FONTS.med, color: saFilter === f.id ? '#D8B4FE' : SAC.muted }}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Status filter */}
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { id: 'all', label: 'All Status' },
            { id: 'checked_in', label: 'Checked In' },
            { id: 'not_checked', label: 'Not Checked In' },
          ].map(f => (
            <Pressable key={f.id} onPress={() => setStatusFilter(f.id as any)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: statusFilter === f.id ? 'rgba(139,92,246,0.25)' : 'transparent' }}>
              <Text style={{ fontSize: 12, fontFamily: FONTS.med, color: statusFilter === f.id ? '#A78BFA' : SAC.muted }}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Coupon filter */}
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { id: 'all', label: 'All Coupons' },
            { id: 'used', label: 'Scanned' },
            { id: 'unused', label: 'Not Scanned' },
          ].map(f => (
            <Pressable key={f.id} onPress={() => setCouponFilter(f.id as any)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: couponFilter === f.id ? 'rgba(16,185,129,0.25)' : 'transparent' }}>
              <Text style={{ fontSize: 12, fontFamily: FONTS.med, color: couponFilter === f.id ? '#34D399' : SAC.muted }}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Reset filters */}
        {(statusFilter !== 'all' || couponFilter !== 'all' || saFilter !== 'all' || q) && (
          <Pressable onPress={() => { setStatusFilter('all'); setCouponFilter('all'); setSaFilter('all'); setQ(''); }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
            <Text style={{ fontSize: 12, fontFamily: FONTS.med, color: '#FCA5A5' }}>Clear Filters</Text>
          </Pressable>
        )}
      </View>

      {/* KPI tiles */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile Icon={CheckCircle} label="Event Check-Ins" value={String(stats.checkedIn)} />
        <KpiTile Icon={UserCheck} label="SA Members" value={`${stats.saMembers} (${stats.sa100} 100%)`} />
        <KpiTile Icon={Award} label="Certificates Issued" value={String(stats.certIssued)} />
        <KpiTile Icon={Ticket} label="Coupons Scanned" value={String(stats.couponsUsed)} />
        <KpiTile Icon={Users} label="Total Registrations" value={String(data.length)} />
      </View>

      {/* Summary Banner */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', padding: 12, backgroundColor: 'rgba(124,92,252,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,92,252,0.2)' }}>
        <Text style={{ fontSize: 12, color: '#D8B4FE', fontFamily: FONTS.med }}>
          📊 SA Accounts: <Text style={{ fontFamily: FONTS.bold, color: '#FFF' }}>{stats.saMembers}</Text> Members | <Text style={{ fontFamily: FONTS.bold, color: '#34D399' }}>{stats.sa100}</Text> 100% Completed | <Text style={{ fontFamily: FONTS.bold, color: '#FCA5A5' }}>{stats.noAccount}</Text> No Account
        </Text>
        <Text style={{ fontSize: 12, color: '#A78BFA', fontFamily: FONTS.med }}>
          🎓 Certificates: <Text style={{ fontFamily: FONTS.bold, color: '#FFF' }}>{stats.certIssued}</Text> Issued
        </Text>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ flex: 1.6, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase' }}>Attendee</Text>
          <Text style={{ flex: 1.1, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase' }}>SA Account & Profile</Text>
          <Text style={{ flex: 0.7, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase' }}>Status</Text>
          <Text style={{ flex: 1.4, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase' }}>Check-In / Time</Text>
          <Text style={{ flex: 1.8, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase' }}>Coupons & Certificate</Text>
          <Text style={{ flex: 1.0, fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted, textTransform: 'uppercase', textAlign: 'right' }}>Actions</Text>
        </View>
        
        {loading && data.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={GRAD.to} /></View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: SAC.muted, fontFamily: FONTS.med }}>No registrations found.</Text></View>
        ) : (
          paginated.map(reg => (
            <View key={reg.id} style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ flex: 1.6, justifyContent: 'center', paddingRight: 10 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text, marginBottom: 2 }}>{reg.full_name || 'Unknown'}</Text>
                <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 4 }}>{reg.email}</Text>
                <Text style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>ID: {reg.id}</Text>
              </View>

              <View style={{ flex: 1.1, justifyContent: 'center', gap: 4, paddingRight: 8 }}>
                {saAccountBadge(reg)}
                {reg.sa_account?.sa_id && (
                  <Text style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#A78BFA' }}>
                    SA ID: {reg.sa_account.sa_id}
                  </Text>
                )}
                {reg.last_profile_reminder_at && (
                  <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                    Reminded {reg.profile_reminder_count || 1}x
                  </Text>
                )}
              </View>
              
              <View style={{ flex: 0.7, justifyContent: 'center' }}>
                <StatusPill 
                  kind={reg.checked_in_at ? 'info' : reg.ticket_issued ? 'success' : 'warn'} 
                  label={reg.checked_in_at ? 'Scanned' : reg.ticket_issued ? 'Issued' : 'Pending'} 
                />
              </View>

              <View style={{ flex: 1.4, justifyContent: 'center', paddingRight: 10 }}>
                {reg.checked_in_at ? (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={13} color="#34D399" />
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#34D399' }}>Checked in</Text>
                    </View>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: '#6EE7B7', marginTop: 3 }}>
                      {fmtStamp(reg.checked_in_at)}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Not Checked In</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                      Reg: {fmtStamp(reg.registered_at)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 2.0, justifyContent: 'center', gap: 4 }}>
                {reg.certificates_3_status ? (
                  <View style={{ gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#D8B4FE' }}>🌅 Sunset:</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: reg.certificates_3_status.built_by_sunset?.issued ? '#34D399' : 'rgba(255,255,255,0.4)' }}>
                        {reg.certificates_3_status.built_by_sunset?.issued ? `✓ ${reg.certificates_3_status.built_by_sunset.code}` : 'Pending ⏳'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#D8B4FE' }}>🏆 Hackwave:</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: reg.certificates_3_status.hackwave_participation?.issued ? '#34D399' : 'rgba(255,255,255,0.4)' }}>
                        {reg.certificates_3_status.hackwave_participation?.issued ? `✓ ${reg.certificates_3_status.hackwave_participation.code}` : 'Pending ⏳'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#D8B4FE' }}>🛡️ Cyber:</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: reg.certificates_3_status.cyber_conclave?.issued ? '#34D399' : 'rgba(255,255,255,0.4)' }}>
                        {reg.certificates_3_status.cyber_conclave?.issued ? `✓ ${reg.certificates_3_status.cyber_conclave.code}` : 'Pending ⏳'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleResetCerts(reg)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 8.5, color: '#FCA5A5' }}>Reset & Re-issue</Text>
                    </Pressable>
                  </View>
                ) : reg.has_certificate ? (
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,92,252,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                      <Award size={12} color="#C9A7FF" />
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 10.5, color: '#D8B4FE' }}>
                        Cert: {reg.certificate?.verification_code || 'Issued'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleResetCerts(reg)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 8.5, color: '#FCA5A5' }}>Reset & Re-issue</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleIssue3Certs(reg)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                    <Award size={12} color="#A78BFA" />
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#A78BFA' }}>Issue All 3 Certs</Text>
                  </Pressable>
                )}

                {reg.coupons && reg.coupons.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {reg.coupons.map((c: any, idx: number) => (
                      <Pressable
                        key={idx}
                        onPress={() => setDetail({ reg, coupon: c })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: c.used ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1, borderColor: c.used ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)',
                          borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Ticket size={10} color={c.used ? '#34D399' : SAC.muted} />
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: c.used ? '#34D399' : SAC.muted }} numberOfLines={1}>
                          {c.session_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flex: 1.0, justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
                <Pressable
                  onPress={() => setEditingReg({ id: reg.id, email: reg.email || '', full_name: reg.full_name || '' })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.12)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
                  <Edit2 size={12} color="#A78BFA" />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#A78BFA' }}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const ok = await confirm({ title: 'Resend Tickets', message: `Resend tickets to ${reg.email}?`, confirmText: 'Resend' });
                    if (!ok) return;
                    try {
                      await api.adminEchoResendTickets(reg.id);
                      flash('Tickets resent to ' + reg.email);
                    } catch (e: any) { flash(e?.message || 'Failed', 'error'); }
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)' }}>
                  <RefreshCw size={12} color="#34D399" />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#34D399' }}>Resend</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {totalPages > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted }}>
              Showing {page * PER_PAGE + 1} - {Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton onPress={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft size={14} color={page === 0 ? 'rgba(255,255,255,0.2)' : SAC.muted} />
              </SecondaryButton>
              <SecondaryButton onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                <ChevronRight size={14} color={page === totalPages - 1 ? 'rgba(255,255,255,0.2)' : SAC.muted} />
              </SecondaryButton>
            </View>
          </View>
        )}
      </Card>

      {/* Coupon detail modal */}
      <Modal transparent visible={!!detail} animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setDetail(null)}>
          <Pressable
            onPress={(e: any) => e?.stopPropagation?.()}
            style={{ width: '100%', maxWidth: 460, backgroundColor: SAC.panel, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 22 }}>
            {detail && (() => {
              const reg = detail.reg;
              const c = detail.coupon;
              const used = !!c.used;
              return (
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ticket size={18} color={used ? '#34D399' : SAC.text} />
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>{c.session_name}</Text>
                    </View>
                    <Pressable onPress={() => setDetail(null)} style={{ padding: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <X size={16} color={SAC.muted} />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <StatusPill kind={used ? 'success' : 'warn'} label={used ? 'Scanned / Used' : 'Not yet scanned'} />
                    <Text style={{ fontFamily: 'monospace', fontSize: 12, color: SAC.muted }}>{c.coupon_code}</Text>
                  </View>

                  <View style={{ gap: 4, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Attendee</Text>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>{reg.full_name || 'Unknown'}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>{reg.email}</Text>
                  </View>

                  {used && (
                    <View style={{ gap: 12 }}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Scanned Time</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} color="#34D399" />
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#34D399' }}>{fmtStamp(c.used_at)}</Text>
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Scanned By</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Users size={14} color="#A78BFA" />
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{c.scanned_by || 'Unknown scanner'}</Text>
                        </View>
                        {c.scanned_location ? (
                          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 2 }}>{c.scanned_location}</Text>
                        ) : null}
                      </View>

                      {(c.scanned_lat || c.scanned_lng) ? (
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Location / Geo</Text>
                          {c.scanned_location ? (
                            <View style={{ backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                <MapPin size={13} color="#A78BFA" style={{ marginTop: 2 }} />
                                <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text, flex: 1, lineHeight: 18 }}>{c.scanned_location}</Text>
                              </View>
                            </View>
                          ) : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <View style={{ gap: 2 }}>
                              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: SAC.muted }}>
                                {Number(c.scanned_lat ?? 0).toFixed(6)}, {Number(c.scanned_lng ?? 0).toFixed(6)}
                              </Text>
                            </View>
                            <SecondaryButton onPress={() => openMap(c.scanned_lat, c.scanned_lng)}>
                              <MapPin size={14} color="#A78BFA" />
                              <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12, marginLeft: 5 }}>Open in Maps</Text>
                            </SecondaryButton>
                          </View>
                        </View>
                      ) : (
                        <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          No geo location captured at scan time.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Registration Modal */}
      <Modal transparent visible={!!editingReg} animationType="fade" onRequestClose={() => setEditingReg(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setEditingReg(null)}>
          <Pressable onPress={(e: any) => e?.stopPropagation?.()} style={{ width: '100%', maxWidth: 400, backgroundColor: SAC.panel, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 22, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Edit Registration</Text>
              <Pressable onPress={() => setEditingReg(null)}><X size={18} color={SAC.muted} /></Pressable>
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 4 }}>Full Name</Text>
              <TextInput value={editName} onChangeText={setEditName} style={{ backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: FONTS.regular }} />
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 4 }}>Email</Text>
              <TextInput value={editEmail} onChangeText={setEditEmail} style={{ backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: FONTS.regular }} keyboardType="email-address" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <SecondaryButton onPress={() => setEditingReg(null)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={async () => {
                if (!editingReg) return;
                try {
                  await request(`/echo/admin/registrations/${editingReg.id}`, {
                    method: 'PATCH',
                    body: { email: editEmail, full_name: editName },
                  });
                  flash('Registration updated');
                  setEditingReg(null);
                  load();
                } catch (e: any) { flash(e?.message || 'Failed', 'error'); }
              }}><Text style={{ color: SAC.text }}>Save</Text></GradientButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Upload Certificate & Dual-Sync Modal */}
      <Modal transparent visible={uploadModalVisible} animationType="fade" onRequestClose={() => setUploadModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setUploadModalVisible(false)}>
          <Pressable onPress={(e: any) => e?.stopPropagation?.()} style={{ width: '100%', maxWidth: 460, backgroundColor: SAC.panel, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)', padding: 22, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color="#93C5FD" />
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Upload Certificate & Dual-Sync</Text>
              </View>
              <Pressable onPress={() => setUploadModalVisible(false)}><X size={18} color={SAC.muted} /></Pressable>
            </View>

            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
              Uploaded certificates automatically sync across <Text style={{ color: '#93C5FD', fontFamily: FONTS.bold }}>ECHO Scan Monitor</Text>, the global <Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold }}>Certificates Module (/super-admin/certificates)</Text>, and the student's <Text style={{ color: '#34D399', fontFamily: FONTS.bold }}>My Certificates</Text> view.
            </Text>

            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>Attendee Email Address *</Text>
              <TextInput
                value={certRecipientEmail}
                onChangeText={setCertRecipientEmail}
                placeholder="e.g. attendee@gmail.com"
                placeholderTextColor={SAC.muted}
                style={{ backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: FONTS.regular }}
                keyboardType="email-address"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>Certificate Title *</Text>
              <TextInput
                value={certTitle}
                onChangeText={setCertTitle}
                placeholder="e.g. Built by Sunset — Project Build Certificate"
                placeholderTextColor={SAC.muted}
                style={{ backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: FONTS.regular }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>Issuer Organization</Text>
              <TextInput
                value={certIssuer}
                onChangeText={setCertIssuer}
                placeholder="e.g. StudentAlumni × Hackwave 3.0"
                placeholderTextColor={SAC.muted}
                style={{ backgroundColor: SAC.bg, color: SAC.text, borderWidth: 1, borderColor: SAC.border, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: FONTS.regular }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <SecondaryButton onPress={() => setUploadModalVisible(false)}><Text style={{ color: SAC.text }}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={handleCustomUploadCert} disabled={uploadingCert}>
                <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{uploadingCert ? 'Uploading & Syncing...' : '⬆️ Upload & Dual-Sync'}</Text>
              </GradientButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}


// ── Internal Hiring & Interns Pipeline Panel ───────────────────────────────
export function InternalHiringPanel() {
  const { flash } = useToast();
  const { confirm } = useConfirm();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    applicant_pool: 0, shortlisted: 0, unpaid_intern: 0, paid_intern: 0, full_time: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [stageTab, setStageTab] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [candPage, setCandPage] = useState(0);
  const CAND_PER_PAGE = 20;

  // Edit candidate modal state
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [editStage, setEditStage] = useState('shortlisted');
  const [editSkills, setEditSkills] = useState<string[]>(['Technical']);
  const [editStipend, setEditStipend] = useState('');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminEchoListInterns({
        slug: eventFilter,
        stage: stageTab,
        search,
        domain: domainFilter,
      });
      setCandidates(res?.items || []);
      if (res?.counts) setCounts(res.counts);
    } catch (err: any) {
      flash(err?.message || 'Failed to load internal hiring pipeline');
    } finally {
      setLoading(false);
    }
  }, [eventFilter, stageTab, search, domainFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setCandPage(0); }, [eventFilter, stageTab, search, domainFilter]);

  const candTotalPages = Math.max(1, Math.ceil(candidates.length / CAND_PER_PAGE));
  const candSafePage = Math.min(candPage, candTotalPages - 1);
  const pagedCandidates = candidates.slice(candSafePage * CAND_PER_PAGE, candSafePage * CAND_PER_PAGE + CAND_PER_PAGE);

  const handleAdvanceStage = async (c: any, nextStage?: string) => {
    const candidateId = c._id || c.id;
    setActioningId(candidateId);
    try {
      const res = await api.adminEchoAdvanceIntern(candidateId, { next_stage: nextStage });
      flash(res?.message || `Advanced ${c.full_name}`);
      await loadData();
    } catch (err: any) {
      flash(err?.message || 'Failed to advance stage');
    } finally {
      setActioningId(null);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    try {
      const res = await api.adminEchoSyncAllInterns();
      flash(`Successfully synced ${res?.synced_count || 0} event registrants from Echo VNRVJIET & SNIST!`);
      await loadData();
    } catch (err: any) {
      flash(err?.message || 'Sync failed');
      setLoading(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditingCandidate(c);
    setEditStage(c.stage || 'shortlisted');
    setEditSkills(c.skills || ['Technical']);
    setEditStipend(c.stipend ? String(c.stipend) : '');
    setEditRoleTitle(c.role_title || 'Intern Prospect');
    setEditNotes(c.notes || '');
  };

  const handleSaveModal = async () => {
    if (!editingCandidate) return;
    const cid = editingCandidate._id || editingCandidate.id;
    setActioningId(cid);
    try {
      await api.adminEchoUpdateIntern(cid, {
        stage: editStage,
        skills: editSkills,
        stipend: parseFloat(editStipend) || 0,
        role_title: editRoleTitle,
        notes: editNotes,
      });
      flash('Candidate profile updated');
      setEditingCandidate(null);
      await loadData();
    } catch (err: any) {
      flash(err?.message || 'Failed to update candidate');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (c: any) => {
    const cid = c._id || c.id;
    const ok = await confirm({
      title: 'Remove Candidate',
      message: `Delete ${c.full_name} from internal hiring pipeline?`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.adminEchoDeleteIntern(cid);
      flash('Candidate deleted');
      await loadData();
    } catch (err: any) {
      flash(err?.message || 'Delete failed');
    }
  };

  const toggleSkillInModal = (sk: string) => {
    if (editSkills.includes(sk)) {
      setEditSkills(editSkills.filter((s) => s !== sk));
    } else {
      setEditSkills([...editSkills, sk]);
    }
  };

  const exportRosterCsv = () => {
    const headers = ['Full Name', 'Email', 'Phone', 'College', 'Event Registered', 'Stage', 'Domain Skills', 'Stipend (INR)', 'Role Title', 'Notes'];
    const rows = [headers.join(',')];
    for (const c of candidates) {
      rows.push([
        `"${(c.full_name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.college || '').replace(/"/g, '""')}"`,
        `"${(c.event_title || c.slug || '').replace(/"/g, '""')}"`,
        c.stage || '',
        `"${(c.skills || []).join('; ')}"`,
        c.stipend || 0,
        `"${(c.role_title || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
      ].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internal-hiring-interns-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const STAGES = [
    { id: 'all', label: 'All Candidates', count: candidates.length },
    { id: 'applicant_pool', label: '📥 Applicant Pool', count: counts.applicant_pool || 0 },
    { id: 'shortlisted', label: '⭐️ Shortlisted', count: counts.shortlisted || 0 },
    { id: 'unpaid_intern', label: '🎓 Unpaid Intern', count: counts.unpaid_intern || 0 },
    { id: 'paid_intern', label: '💰 Paid Intern', count: counts.paid_intern || 0 },
    { id: 'full_time', label: '💼 Full Time', count: counts.full_time || 0 },
  ];

  const DOMAINS = ['Technical', 'Marketing', 'Operations', 'Design', 'AI/ML', 'Event Management'];

  const getStageBadge = (st: string) => {
    switch (st) {
      case 'applicant_pool':
        return { label: 'APPLICANT', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' };
      case 'shortlisted':
        return { label: 'SHORTLISTED', color: '#FBBF24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' };
      case 'unpaid_intern':
        return { label: 'UNPAID INTERN', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)' };
      case 'paid_intern':
        return { label: 'PAID INTERN', color: '#34D399', bg: 'rgba(52,211,153,0.18)', border: 'rgba(52,211,153,0.35)' };
      case 'full_time':
        return { label: 'FULL TIME HIRE', color: '#A78BFA', bg: 'rgba(167,139,250,0.2)', border: 'rgba(167,139,250,0.4)' };
      default:
        return { label: st.toUpperCase(), color: SAC.muted, bg: 'rgba(255,255,255,0.08)', border: SAC.border };
    }
  };

  const getNextStageLabel = (st: string) => {
    switch (st) {
      case 'applicant_pool': return '✓ Shortlist Candidate';
      case 'shortlisted': return '✓ Hire as Unpaid Intern';
      case 'unpaid_intern': return '✓ Promote to Paid Intern';
      case 'paid_intern': return '✓ Convert to Full Time';
      case 'full_time': return '✓ Full Time Hired';
      default: return '✓ Advance Stage';
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Top Header & KPIs */}
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile Icon={Users} label="Total Applicants" value={String(candidates.length)} />
        <KpiTile Icon={Star} label="Shortlisted" value={String(counts.shortlisted || 0)} />
        <KpiTile Icon={GraduationCap} label="Unpaid Interns" value={String(counts.unpaid_intern || 0)} />
        <KpiTile Icon={CreditCard} label="Paid Interns" value={String(counts.paid_intern || 0)} />
        <KpiTile Icon={UserCheck} label="Full Time Hires" value={String(counts.full_time || 0)} delta="Active" deltaKind="success" />
      </View>

      {/* Toolbar */}
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search name, email, college, skill..." width="100%" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={handleSyncAll}
              disabled={loading}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1, borderColor: '#7C3AED',
                borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} color="#A78BFA" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#C4B5FD' }}>Sync Event Registrations</Text>
            </Pressable>
            <Pressable
              onPress={exportRosterCsv}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#059669', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, cursor: 'pointer',
              }}
            >
              <Download size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Export Roster CSV</Text>
            </Pressable>
          </View>
        </View>

        {/* Stage Pills Navigation */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 }}>
          {STAGES.map((st) => {
            const isActive = stageTab === st.id;
            return (
              <Pressable
                key={st.id}
                onPress={() => setStageTab(st.id)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                  backgroundColor: isActive ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1, borderColor: isActive ? '#9E7BFF' : 'rgba(255,255,255,0.08)',
                  flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer',
                }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: isActive ? '#FFFFFF' : SAC.text }}>{st.label}</Text>
                <View style={{
                  paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: isActive ? '#FFFFFF' : SAC.muted }}>{st.count}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Candidates List / Pipeline Grid */}
      <Card style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>
            {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''} in Pipeline
          </Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>
            Click checkmark button to advance candidates to next stage (Shortlisted → Unpaid Intern → Paid Intern → Full Time)
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : candidates.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><UserCheck size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>No candidates in this view</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted, textAlign: 'center', maxWidth: 340 }}>
              Click "Sync Event Registrations" above or convert registrations from Echo VNRVJIET & SNIST into intern candidates.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 1050, flex: 1 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ flex: 1.5, minWidth: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>CANDIDATE</Text>
                <Text style={{ flex: 1.2, minWidth: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>COLLEGE & EVENT</Text>
                <Text style={{ width: 130, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STAGE</Text>
                <Text style={{ flex: 1.2, minWidth: 160, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>SKILLS / DOMAIN</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STIPEND</Text>
                <Text style={{ width: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>QUICK ACTION</Text>
              </View>

              {pagedCandidates.map((c: any, i: number) => {
                const badge = getStageBadge(c.stage || 'applicant_pool');
                const cid = c._id || c.id;
                const isActioning = actioningId === cid;

                return (
                  <View key={cid || i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    {/* Candidate */}
                    <View style={{ flex: 1.5, minWidth: 180 }}>
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{c.full_name || '—'}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginTop: 1 }}>{c.email || ''}</Text>
                      {c.phone ? (
                        <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, marginTop: 1 }}>{c.phone}</Text>
                      ) : null}
                    </View>

                    {/* College & Event */}
                    <View style={{ flex: 1.2, minWidth: 150 }}>
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 11.5, color: '#E2E8F0' }}>{c.college || 'VNRVJIET / SNIST'}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: '#A78BFA', marginTop: 1 }}>{c.event_title || c.slug || ''}</Text>
                      {c.branch ? <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9.5, color: SAC.dim }}>{c.branch}</Text> : null}
                    </View>

                    {/* Stage Badge */}
                    <View style={{ width: 130 }}>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                        backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border,
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 9.5, color: badge.color }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Skills / Domain */}
                    <View style={{ flex: 1.2, minWidth: 160, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {(c.skills || ['Technical']).map((sk: string, sIdx: number) => (
                        <View key={sIdx} style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                          backgroundColor: sk === 'Marketing' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                          borderWidth: 1, borderColor: sk === 'Marketing' ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)',
                        }}>
                          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: sk === 'Marketing' ? '#FBBF24' : '#818CF8' }}>{sk}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Stipend */}
                    <View style={{ width: 110 }}>
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: Number(c.stipend || 0) > 0 ? '#34D399' : SAC.muted }}>
                        {Number(c.stipend || 0) > 0 ? `₹${Number(c.stipend).toLocaleString('en-IN')}/mo` : 'Unpaid'}
                      </Text>
                    </View>

                    {/* Quick Action Button */}
                    <View style={{ width: 180, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      {c.stage !== 'full_time' ? (
                        <Pressable
                          onPress={() => handleAdvanceStage(c)}
                          disabled={isActioning}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            backgroundColor: c.stage === 'unpaid_intern' ? '#059669' : c.stage === 'shortlisted' ? '#2563EB' : '#7C3AED',
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, cursor: 'pointer',
                            opacity: isActioning ? 0.6 : 1,
                          }}
                        >
                          {isActioning ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle size={13} color="#fff" />}
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#fff' }}>
                            {getNextStageLabel(c.stage)}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.2)', borderWidth: 1, borderColor: '#34D399' }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 10.5, color: '#34D399' }}>✓ Hired Full-Time</Text>
                        </View>
                      )}

                      <IconAction icon={<Pencil size={13} color="#94A3B8" />} label="Edit / Offer" color="#94A3B8" onPress={() => openEditModal(c)} />
                      <IconAction icon={<Trash2 size={13} color="#F87171" />} label="Delete" color="#F87171" danger onPress={() => handleDelete(c)} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Pagination */}
        {candidates.length > CAND_PER_PAGE && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 10, paddingHorizontal: 14,
            borderTopWidth: 1, borderTopColor: SAC.border, flexWrap: 'wrap', gap: 10,
          }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
              Showing {candSafePage * CAND_PER_PAGE + 1}–{Math.min((candSafePage + 1) * CAND_PER_PAGE, candidates.length)} of {candidates.length}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Pressable
                onPress={() => setCandPage(candSafePage - 1)}
                disabled={candSafePage === 0}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: candSafePage === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: candSafePage === 0 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: candSafePage === 0 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} color={SAC.text} />
              </Pressable>
              {Array.from({ length: candTotalPages }, (_, p) => p).map((p) => {
                if (candTotalPages > 7 && Math.abs(p - candSafePage) > 2 && p !== 0 && p !== candTotalPages - 1) {
                  return null;
                }
                return (
                  <Pressable key={p} onPress={() => setCandPage(p)} style={{
                    minWidth: 30, alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 6, borderRadius: 7,
                    backgroundColor: p === candSafePage ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: p === candSafePage ? '#7C3AED' : SAC.border,
                  }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: p === candSafePage ? '#fff' : SAC.text }}>{p + 1}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCandPage(candSafePage + 1)}
                disabled={candSafePage >= candTotalPages - 1}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: candSafePage >= candTotalPages - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: candSafePage >= candTotalPages - 1 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: candSafePage >= candTotalPages - 1 ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} color={SAC.text} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      {/* Edit / Offer Details Modal */}
      {editingCandidate && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditingCandidate(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 1, borderColor: SAC.border, width: '100%', maxWidth: 520, padding: 22, gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Candidate Evaluation & Offer</Text>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 2 }}>{editingCandidate.full_name} ({editingCandidate.email})</Text>
                </View>
                <Pressable onPress={() => setEditingCandidate(null)}><X size={18} color={SAC.muted} /></Pressable>
              </View>

              <FieldRow label="Hiring Pipeline Stage">
                <SelectNative
                  value={editStage}
                  onChange={setEditStage}
                  options={['applicant_pool', 'shortlisted', 'unpaid_intern', 'paid_intern', 'full_time']}
                />
              </FieldRow>

              <FieldRow label="Domain Skills / Track">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {DOMAINS.map((sk) => {
                    const sel = editSkills.includes(sk);
                    return (
                      <Pressable
                        key={sk}
                        onPress={() => toggleSkillInModal(sk)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
                          backgroundColor: sel ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                          borderWidth: 1, borderColor: sel ? '#9E7BFF' : 'rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                        }}
                      >
                        <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: sel ? '#FFF' : SAC.text }}>{sk}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldRow>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <FieldRow label="Role Title">
                    <Field value={editRoleTitle} onChangeText={setEditRoleTitle} placeholder="e.g. Software Intern" />
                  </FieldRow>
                </View>
                <View style={{ flex: 1 }}>
                  <FieldRow label="Monthly Stipend (₹)">
                    <Field value={editStipend} onChangeText={setEditStipend} placeholder="0 for Unpaid" />
                  </FieldRow>
                </View>
              </View>

              <FieldRow label="Recruiter / Interviewer Notes">
                <Field value={editNotes} onChangeText={setEditNotes} placeholder="Notes on technical skill, marketing proficiency, interview feedback..." multiline rows={3} />
              </FieldRow>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <SecondaryButton onPress={() => setEditingCandidate(null)}>
                  <Text style={{ color: SAC.text, fontFamily: FONTS.semi, fontSize: 12 }}>Cancel</Text>
                </SecondaryButton>
                <GradientButton onPress={handleSaveModal} loading={actioningId === (editingCandidate._id || editingCandidate.id)}>
                  <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Save Profile</Text>
                </GradientButton>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}


// ── Registration tab passcode control (server-side configured) ───────────────
export function RegistrationPasscodeControl({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}) {
  const { flash } = useToast();
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const save = async () => {
    if (pass.length < 4 || pass.length > 12) {
      flash('Passcode must be 4-12 characters');
      return;
    }
    if (pass !== confirmPass) {
      flash('Passcodes do not match');
      return;
    }
    setBusy(true);
    try {
      await api.setEchoRegistrationPasscode(pass);
      onChange?.(true);
      flash('Registration passcode saved & enabled');
      setPass('');
      setConfirmPass('');
      setShowForm(false);
    } catch (e: any) {
      flash(e?.message || 'Failed to save passcode');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api.disableEchoRegistrationPasscode();
      onChange?.(false);
      flash('Registration passcode disabled');
      setShowForm(false);
    } catch (e: any) {
      flash(e?.message || 'Failed to disable passcode');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconBox tint={enabled ? '#F59E0B' : '#334155'}>
            <Lock size={16} color={enabled ? '#F59E0B' : '#94A3B8'} />
          </IconBox>
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Registrations Access Passcode</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <StatusPill kind={enabled ? 'warn' : 'success'} label={enabled ? 'Locked' : 'Unlocked'} />
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
                {enabled
                  ? 'The Registrations tab requires this passcode to open.'
                  : 'No passcode required. The Registrations tab is open.'}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, cursor: 'pointer',
          }}
        >
          <Lock size={13} color="#A78BFA" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#A78BFA' }}>
            {enabled ? 'Change Passcode' : 'Set Passcode'}
          </Text>
        </Pressable>
      </View>

      {showForm && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.15)', paddingTop: 16, gap: 12 }}>
          {enabled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Lock size={12} color="#F59E0B" />
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
                A passcode is active. The Registrations tab is locked until the correct code is entered.
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginBottom: 6 }}>NEW PASSCODE</Text>
              <TextInput
                value={pass}
                onChangeText={setPass}
                secureTextEntry
                placeholder="Enter new passcode"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                style={{
                  backgroundColor: 'rgba(15,23,42,0.7)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)',
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: SAC.text,
                  fontFamily: FONTS.med, fontSize: 13,
                }}
              />
            </View>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginBottom: 6 }}>CONFIRM PASSCODE</Text>
              <TextInput
                value={confirmPass}
                onChangeText={setConfirmPass}
                secureTextEntry
                placeholder="Re-enter passcode"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                style={{
                  backgroundColor: 'rgba(15,23,42,0.7)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)',
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: SAC.text,
                  fontFamily: FONTS.med, fontSize: 13,
                }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <GradientButton onPress={save} disabled={busy} size="sm">
              <Lock size={13} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 }}>
                {busy ? 'Saving…' : enabled ? 'Save & Update' : 'Save & Lock'}
              </Text>
            </GradientButton>
            {enabled && (
              <SecondaryButton onPress={disable} disabled={busy} size="sm">
                <Text style={{ color: '#F87171', fontFamily: FONTS.bold, fontSize: 12 }}>
                  {busy ? 'Working…' : 'Disable & Unlock'}
                </Text>
              </SecondaryButton>
            )}
            <SecondaryButton onPress={() => setShowForm(false)} size="sm">
              <Text style={{ color: '#94A3B8', fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
            </SecondaryButton>
          </View>
        </View>
      )}
    </Card>
  );
}

export function RegistrationPasscodeGate({
  onUnlocked,
  onChange,
  enabled,
}: {
  onUnlocked: () => void;
  onChange: (enabled: boolean) => void;
  enabled: boolean;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const tryUnlock = async () => {
    if (!input.trim()) { setError('Enter the passcode to unlock.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.verifyEchoRegistrationPasscode(input.trim());
      if (res?.ok) {
        onUnlocked();
      } else {
        setError('Incorrect passcode. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={30} color="#F59E0B" />
        </View>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: SAC.text, marginTop: 18 }}>
          Registrations Locked
        </Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, marginTop: 6, textAlign: 'center', maxWidth: 420 }}>
          This section contains sensitive payment & registration data. Enter the configured passcode to unlock it.
        </Text>

        <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
          <TextInput
            value={input}
            onChangeText={(t) => { setInput(t); setError(''); }}
            secureTextEntry
            placeholder="Enter passcode"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoFocus
            onSubmitEditing={tryUnlock}
            style={{
              backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1,
              borderColor: error ? '#F87171' : 'rgba(148,163,184,0.3)',
              borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: SAC.text,
              fontFamily: FONTS.med, fontSize: 16, textAlign: 'center', letterSpacing: 2,
            }}
          />
          {error ? (
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: '#F87171', marginTop: 8, textAlign: 'center' }}>{error}</Text>
          ) : null}
          <GradientButton onPress={tryUnlock} disabled={busy} size="md" style={{ marginTop: 14, width: '100%' }}>
            <Lock size={14} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>
              {busy ? 'Unlocking…' : 'Unlock'}
            </Text>
          </GradientButton>
          <Pressable onPress={() => setShowSetup((v) => !v)} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#A78BFA' }}>
              {showSetup ? 'Hide passcode settings' : 'Configure / change the passcode'}
            </Text>
          </Pressable>
        </View>
      </View>
      {showSetup && (
        <View style={{ marginTop: 4 }}>
          <RegistrationPasscodeControl enabled={enabled} onChange={onChange} />
        </View>
      )}
    </Card>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
