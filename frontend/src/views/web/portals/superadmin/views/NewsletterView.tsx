/**
 * Super Admin → Newsletter view.
 *
 * Compose + send an HTML newsletter to every registered user (email).
 *   API:  POST /api/newsletter/admin/send
 *         GET  /api/newsletter/admin/campaigns
 *         GET  /api/newsletter/admin/upcoming-events
 *
 * Features:
 *   • Subject, hero image, intro, body, CTA + auto-included upcoming events.
 *   • Live email preview (HTML rendered inline on web).
 *   • Recipient count preview and confirmation before sending.
 *   • Campaign history with per-campaign deliverability (sent/failed).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform, Image, ActivityIndicator,
} from 'react-native';
import {
  Mail, Send, RefreshCw, Calendar, AlertTriangle, Check, Users, Megaphone,
  Bell, Smartphone, Search, User, Upload, X, ImagePlus, MessageSquare,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  StatusPill, Toast, useToast, KpiTile,
} from '../applekit';
import { api, resolveImageUrl } from '@/src/models/services/api';
import HtmlRenderer from '@/src/views/web/policy/HtmlRenderer';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import LexicalEditor from './LexicalEditor';

type Campaign = {
  campaign_id: string;
  subject: string;
  recipients_count: number;
  ok_count?: number;
  fail_count?: number;
  email_ok?: number;
  email_fail?: number;
  push_ok?: number;
  push_fail?: number;
  in_app_ok?: number;
  whatsapp_ok?: number;
  whatsapp_fail?: number;
  status?: string;
  created_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_by?: string;
  include_upcoming?: boolean;
  send_at?: string;
  individual?: boolean;
};

function buildPreviewHtml(form: any, events: any[]): string {
  const hero = form.hero_image
    ? `<img src="${resolveImageUrl(form.hero_image)}" alt="" style="width:100%;height:auto;display:block;border-radius:12px;margin:0 0 20px 0;" />`
    : '';
  const intro = form.intro
    ? `<p style="margin:0 0 14px 0;color:#374151;font-size:15px;">${form.intro}</p>`
    : '';
  const body = form.body
    ? `<div style="margin:0 0 18px 0;color:#374151;font-size:15px;line-height:1.65;">${form.body}</div>`
    : '';
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://studentalumni.ai';
  const evCards = (events || []).slice(0, 4).map((ev) => {
    const img = ev.hero_image_url
      ? `<img src="${ev.hero_image_url}" alt="" style="width:100%;height:auto;display:block;border-radius:10px 10px 0 0;" />`
      : '';
    const badge = Number(ev.fee || 0) <= 0 ? 'FREE ENTRY' : `₹${Number(ev.fee).toLocaleString('en-IN')} ENTRY`;
    const link = ev.slug ? `${origin}/echo/${ev.slug}` : '';
    const titleHtml = link
      ? `<a href="${link}" style="font-size:16px;font-weight:700;color:#111827;text-decoration:none;">${ev.title}</a>`
      : `<div style="font-size:16px;font-weight:700;color:#111827;">${ev.title}</div>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;"><tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">${img}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;color:#7C3AED;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">${badge}</div>
        ${titleHtml}
        <div style="font-size:12.5px;color:#6b7280;margin-top:6px;">${ev.college || 'Student Alumni Cell'}${ev.date ? ' · ' + ev.date : ''}</div>
        <div style="font-size:12.5px;color:#6b7280;">${ev.venue || ''}</div>
        ${link ? `<div style="margin-top:10px;"><a href="${link}" style="display:inline-block;padding:8px 18px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:12px;">View Event</a></div>` : ''}
      </td></tr></table></td></tr></table>`;
  }).join('');
  const eventsSection = evCards
    ? `<h3 style="margin:24px 0 12px 0;color:#111827;font-size:17px;">Upcoming Events</h3>${evCards}`
    : '';
  const cta = form.cta_text && form.cta_url
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px 0;"><tr><td align="center"><a href="${form.cta_url}" style="display:inline-block;padding:13px 32px;background:#7C3AED;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">${form.cta_text}</a></td></tr></table>`
    : '';

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <h2 style="margin:0 0 6px 0;color:#111827;">${form.subject || 'Newsletter subject'}</h2>
    ${hero}${intro}${body}${eventsSection}${cta}
  </div>`;
}

export function NewsletterView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const { toast, flash } = useToast();
  const [form, setForm] = useState({
    subject: '',
    hero_image: '',
    intro: '',
    body: '',
    cta_text: 'Register Now',
    cta_url: 'https://studentalumni.ai/echo',
    include_upcoming: true,
    send_email: true,
    send_push: true,
    send_in_app: true,
    send_whatsapp: false,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useSubTab<'bulk' | 'individual'>(['bulk', 'individual'], 'bulk', { sub, onSub });
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<any>(null);

  // Scheduling and test send states
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testWhatsappSending, setTestWhatsappSending] = useState(false);
  const [previewHtmlBackend, setPreviewHtmlBackend] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipientCount, setLoadingRecipientCount] = useState(false);

  // Individual notification state
  const [indUserQuery, setIndUserQuery] = useState('');
  const [indUserResults, setIndUserResults] = useState<any[]>([]);
  const [indSelectedUser, setIndSelectedUser] = useState<any>(null);
  const [indForm, setIndForm] = useState({ title: '', body: '', cta_url: '', send_email: true, send_push: true, send_in_app: true, send_whatsapp: false });
  const [indSending, setIndSending] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        api.listNewsletterCampaigns(),
        api.newsletterUpcomingEvents(),
      ]);
      setCampaigns(c?.items || []);
      setEvents(e?.items || []);
    } catch {
      /* silent — campaigns list is non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const previewHtml = useMemo(() => buildPreviewHtml(form, events), [form, events]);

  const handleHeroFile = async (file: File) => {
    if (!file) return;
    // 1. Instant local preview
    if (Platform.OS === 'web' && typeof URL !== 'undefined') {
      try {
        set('hero_image', URL.createObjectURL(file));
      } catch { /* ignore */ }
    }
    setHeroUploading(true);
    try {
      const res: any = await api.uploadNewsletterImage(file, 'newsletter');
      if (res?.url) {
        set('hero_image', res.url);
        flash('Hero image uploaded');
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      flash(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setHeroUploading(false);
    }
  };

  const fetchFullPreview = async () => {
    if (!form.subject.trim()) { flash('Subject is required to generate preview'); return; }
    setLoadingPreview(true);
    try {
      const res = await api.previewNewsletter({
        subject: form.subject,
        hero_image: form.hero_image,
        intro: form.intro,
        body: form.body,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
        include_upcoming: form.include_upcoming,
      });
      if (res?.html) {
        setPreviewHtmlBackend(res.html);
        flash('Full layout preview updated');
      }
    } catch (e: any) {
      flash(e?.message || 'Failed to fetch layout preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const doSendTest = async () => {
    if (!testEmail.trim()) { flash('Enter a test email address first', 'error'); return; }
    if (!form.subject.trim()) { flash('Subject is required to send a test email', 'error'); return; }
    setTestSending(true);
    try {
      const res = await api.sendNewsletterTest({
        subject: form.subject,
        hero_image: form.hero_image,
        intro: form.intro,
        body: form.body,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
        include_upcoming: form.include_upcoming,
        test_email: testEmail.trim(),
      });
      flash(res?.message || `Test email sent to ${testEmail.trim()}`);
    } catch (e: any) {
      flash(`Test email FAILED: ${e?.message || 'Unknown error'}`, 'error');
    } finally {
      setTestSending(false);
    }
  };

  const doSendTestWhatsApp = async () => {
    if (!testPhone.trim()) { flash('Enter a test phone number first', 'error'); return; }
    if (!form.subject.trim()) { flash('Subject is required to send a test WhatsApp', 'error'); return; }
    setTestWhatsappSending(true);
    try {
      const res = await api.sendNewsletterTestWhatsApp({
        subject: form.subject,
        hero_image: form.hero_image,
        body: form.body || form.intro || '',
        cta_url: form.cta_url,
        test_phone: testPhone.trim(),
      });
      flash(res?.message || `Test WhatsApp sent to ${testPhone.trim()}`);
    } catch (e: any) {
      flash(`Test WhatsApp FAILED: ${e?.message || 'Unknown error'}`, 'error');
    } finally {
      setTestWhatsappSending(false);
    }
  };

  const cancelCampaign = async (campaignId: string) => {
    if (!campaignId) return;
    setCancellingId(campaignId);
    try {
      const res = await api.cancelNewsletterCampaign(campaignId);
      flash(res?.message || 'Campaign cancelled');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Failed to cancel campaign', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const startEdit = async (campaignId: string) => {
    if (!campaignId) return;
    setLoadingEdit(true);
    try {
      const c: any = await api.getNewsletterCampaign(campaignId);
      const channels = c?.channels || {};
      setForm({
        subject: c?.subject || '',
        hero_image: c?.hero_image || '',
        intro: c?.intro || '',
        body: c?.body || '',
        cta_text: c?.cta_text || 'Register Now',
        cta_url: c?.cta_url || 'https://studentalumni.ai/echo',
        include_upcoming: c?.include_upcoming ?? true,
        send_email: channels.email ?? true,
        send_push: channels.push ?? true,
        send_in_app: channels.in_app ?? true,
        send_whatsapp: channels.whatsapp ?? false,
      });
      if (c?.send_at) {
        const dt = new Date(c.send_at);
        setSendImmediately(false);
        setScheduleDate(dt.toISOString().slice(0, 10));
        setScheduleTime(`${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`);
      }
      setEditingCampaign(c);
      setActiveTab('bulk');
      flash(`Editing "${c?.subject || 'campaign'}" — make changes and save`);
    } catch (e: any) {
      flash(e?.message || 'Failed to load campaign', 'error');
    } finally {
      setLoadingEdit(false);
    }
  };

  const stopEdit = () => {
    setEditingCampaign(null);
    setSendImmediately(true);
    setScheduleDate('');
    setScheduleTime('12:00');
    setRecipientCount(null);
    setForm({
      subject: '', hero_image: '', intro: '', body: '',
      cta_text: 'Register Now', cta_url: 'https://studentalumni.ai/echo',
      include_upcoming: true, send_email: true, send_push: true, send_in_app: true, send_whatsapp: false,
    });
    flash('Edit cancelled');
  };

  const doUpdate = async () => {
    if (!editingCampaign) return;
    if (!form.subject.trim()) { flash('Subject is required', 'error'); return; }

    let send_at: string | undefined = undefined;
    if (!sendImmediately) {
      if (!scheduleDate.trim() || !scheduleTime.trim()) {
        flash('Please fill in both Date and Time for rescheduling', 'error');
        return;
      }
      try {
        const parsed = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (isNaN(parsed.getTime())) throw new Error('Invalid Date/Time values');
        if (parsed <= new Date()) {
          flash('Scheduled time must be in the future', 'error');
          return;
        }
        send_at = parsed.toISOString();
      } catch {
        flash('Invalid Date or Time format. Use YYYY-MM-DD and HH:MM', 'error');
        return;
      }
    }

    setSending(true);
    try {
      const res: any = await api.updateNewsletterCampaign(editingCampaign.campaign_id, {
        subject: form.subject,
        hero_image: form.hero_image,
        intro: form.intro,
        body: form.body,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
        include_upcoming: form.include_upcoming,
        send_email: form.send_email,
        send_push: form.send_push,
        send_in_app: form.send_in_app,
        send_whatsapp: form.send_whatsapp,
        ...(send_at ? { send_at } : {}),
      });
      flash(res?.message || 'Campaign updated');
      await load();
      stopEdit();
    } catch (e: any) {
      flash(e?.message || 'Failed to update campaign', 'error');
    } finally {
      setSending(false);
    }
  };

  const doSend = async () => {
    if (!form.subject.trim()) { flash('Subject is required'); return; }
    if (!form.body.trim() && !form.cta_url.trim()) { flash('Add a message or a CTA link'); return; }
    if (!form.send_email && !form.send_push && !form.send_in_app && !form.send_whatsapp) { flash('Select at least one channel'); return; }

    let send_at: string | undefined = undefined;
    if (!sendImmediately) {
      if (!scheduleDate.trim() || !scheduleTime.trim()) {
        flash('Please fill in both Date and Time for scheduling');
        return;
      }
      try {
        const parsed = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (isNaN(parsed.getTime())) {
          throw new Error('Invalid Date/Time values');
        }
        if (parsed <= new Date()) {
          flash('Scheduled time must be in the future');
          return;
        }
        send_at = parsed.toISOString();
      } catch {
        flash('Invalid Date or Time format. Use YYYY-MM-DD and HH:MM');
        return;
      }
    }

    setSending(true);
    setConfirming(false);
    try {
      const r: any = await api.sendNewsletter({
        subject: form.subject,
        hero_image: form.hero_image,
        intro: form.intro,
        body: form.body,
        cta_text: form.cta_text,
        cta_url: form.cta_url,
        include_upcoming: form.include_upcoming,
        send_email: form.send_email,
        send_push: form.send_push,
        send_in_app: form.send_in_app,
        send_whatsapp: form.send_whatsapp,
        send_at,
      });
      flash(r?.message || 'Newsletter sent');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const doSaveDraft = async () => {
    if (!form.subject.trim()) { flash('Subject is required', 'error'); return; }
    setSavingDraft(true);
    try {
      if (editingCampaign) {
        const res: any = await api.updateNewsletterCampaign(editingCampaign.campaign_id, {
          subject: form.subject,
          hero_image: form.hero_image,
          intro: form.intro,
          body: form.body,
          cta_text: form.cta_text,
          cta_url: form.cta_url,
          include_upcoming: form.include_upcoming,
          send_email: form.send_email,
          send_push: form.send_push,
          send_in_app: form.send_in_app,
          send_whatsapp: form.send_whatsapp,
        });
        flash(res?.message || 'Draft updated');
      } else {
        const res: any = await api.saveNewsletterDraft({
          subject: form.subject,
          hero_image: form.hero_image,
          intro: form.intro,
          body: form.body,
          cta_text: form.cta_text,
          cta_url: form.cta_url,
          include_upcoming: form.include_upcoming,
          send_email: form.send_email,
          send_push: form.send_push,
          send_in_app: form.send_in_app,
          send_whatsapp: form.send_whatsapp,
        });
        flash(res?.message || 'Draft saved');
      }
      await load();
    } catch (e: any) {
      flash(e?.message || 'Failed to save draft', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const fetchRecipientCount = async () => {
    setLoadingRecipientCount(true);
    try {
      const res = await api.getNewsletterRecipientCount();
      setRecipientCount(res?.count ?? 0);
    } catch {
      setRecipientCount(null);
    } finally {
      setLoadingRecipientCount(false);
    }
  };

  // ── Individual notification ──
  const searchUsers = useCallback(async (q: string) => {
    const seq = ++searchSeqRef.current;
    if (!q.trim()) { setIndUserResults([]); return; }
    try {
      const r = await api.searchUsers(q);
      // Drop stale responses when a newer query has been issued meanwhile.
      if (seq === searchSeqRef.current) setIndUserResults(r?.users || []);
    } catch {
      if (seq === searchSeqRef.current) setIndUserResults([]);
    }
  }, []);

  const handleUserSearch = (q: string) => {
    setIndUserQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(q), 350);
  };

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const doSendIndividual = async () => {
    if (!indSelectedUser) { flash('Select a user first'); return; }
    if (!indForm.title.trim()) { flash('Title is required'); return; }
    if (!indForm.body.trim()) { flash('Body is required'); return; }
    if (!indForm.send_email && !indForm.send_push && !indForm.send_in_app && !indForm.send_whatsapp) { flash('Select at least one channel'); return; }
    setIndSending(true);
    try {
      const r: any = await api.sendIndividualNotification({
        user_id: indSelectedUser.id,
        title: indForm.title,
        body: indForm.body,
        subject: indForm.title,
        cta_url: indForm.cta_url,
        send_email: indForm.send_email,
        send_push: indForm.send_push,
        send_in_app: indForm.send_in_app,
        send_whatsapp: indForm.send_whatsapp,
      });
      flash(r?.message || 'Notification sent');
      setIndSelectedUser(null);
      setIndUserQuery('');
      setIndUserResults([]);
      setIndForm({ title: '', body: '', cta_url: '', send_email: true, send_push: true, send_in_app: true, send_whatsapp: false });
    } catch (e: any) {
      flash(e?.message || 'Failed to send notification');
    } finally {
      setIndSending(false);
    }
  };

  const totalRecipients = campaigns.reduce((a, c) => a + (c.recipients_count || 0), 0);

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} />

      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><Mail size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Newsletter</Text>
            <Text style={st.sub}>Compose and send an HTML newsletter to every registered user by email.</Text>
          </View>
          <SecondaryButton onPress={load}><RefreshCw size={12} color={SAC.muted} /><Text style={st.secText}>Refresh</Text></SecondaryButton>
        </View>
      </Card>

      <View style={st.kpiRow}>
        <KpiTile Icon={Users} label="Total Registrations Sent To" value={String(totalRecipients)} />
        <KpiTile Icon={Calendar} label="Upcoming Events (auto-included)" value={String(events.length)} />
        <KpiTile Icon={Megaphone} label="Campaigns" value={String(campaigns.length)} />
      </View>

      <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Compose ── */}
        <Card style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {/* Tabs */}
          <View style={st.tabRow}>
            <Pressable onPress={() => setActiveTab('bulk')} style={[st.tab, activeTab === 'bulk' && st.tabActive]}>
              <Megaphone size={13} color={activeTab === 'bulk' ? '#fff' : SAC.muted} />
              <Text style={[st.tabText, activeTab === 'bulk' && st.tabTextActive]}>Bulk Newsletter</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('individual')} style={[st.tab, activeTab === 'individual' && st.tabActive]}>
              <User size={13} color={activeTab === 'individual' ? '#fff' : SAC.muted} />
              <Text style={[st.tabText, activeTab === 'individual' && st.tabTextActive]}>Individual</Text>
            </Pressable>
          </View>

          {activeTab === 'bulk' ? (
            <>
              <SectionLabel>COMPOSE NEWSLETTER</SectionLabel>
              {editingCampaign && (
                <View style={st.editBanner}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={st.editBannerTitle}>Editing scheduled campaign</Text>
                    <Text style={st.editBannerSub}>
                      {editingCampaign.subject} · will re-activate at the updated schedule when saved.
                    </Text>
                  </View>
                  <Pressable onPress={stopEdit} style={st.editBannerCancel}>
                    <X size={13} color="#94a3b8" />
                    <Text style={st.editBannerCancelText}>Cancel edit</Text>
                  </Pressable>
                </View>
              )}
              <View style={{ marginTop: 12, gap: 12 }}>
                <Field label="Subject *" hint="Appears in the email subject line.">
                  <TextInput style={st.input} value={form.subject} onChangeText={(v) => set('subject', v)} placeholder="e.g. Join us at ECHO 2026!" placeholderTextColor={SAC.dim} />
                </Field>
                <Field label="Hero Image" hint="Upload a banner/poster, or paste a direct image URL. Shown full-width at the top of the email.">
                  <View style={{ gap: 8 }}>
                    {form.hero_image ? (
                      <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: SAC.border }}>
                        <Image source={{ uri: resolveImageUrl(form.hero_image) }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                        <View style={{ flexDirection: 'row', gap: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center' }}>
                          {Platform.OS === 'web' && (
                            <label style={{ cursor: 'pointer' }}>
                              <span style={{
                                backgroundColor: 'rgba(123,61,191,0.30)', color: '#fff',
                                padding: '5px 10px', borderRadius: '6px',
                                fontFamily: FONTS.semi, fontSize: '11px',
                              }}>
                                {heroUploading ? 'Uploading…' : 'Replace'}
                              </span>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                disabled={heroUploading}
                                onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleHeroFile(f); e.target.value = ''; }} />
                            </label>
                          )}
                          <Pressable onPress={() => set('hero_image', '')} style={{ backgroundColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                            <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: '#FCA5A5' }}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => { if (Platform.OS === 'web') heroFileRef.current?.click?.(); }}
                        style={{
                          borderWidth: 2, borderColor: 'rgba(123,61,191,0.40)', borderStyle: 'dashed',
                          borderRadius: 10, padding: 20, alignItems: 'center', justifyContent: 'center',
                          backgroundColor: 'rgba(123,61,191,0.04)', cursor: 'pointer',
                        }}
                      >
                        {heroUploading ? (
                          <ActivityIndicator size="small" color={GRAD.from} />
                        ) : (
                          <>
                            <ImagePlus size={22} color={GRAD.from} />
                            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from, marginTop: 8 }}>Click to upload a hero image</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                    {Platform.OS === 'web' && (
                      <input ref={heroFileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
                        onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleHeroFile(f); e.target.value = ''; }} />
                    )}
                    <TextInput
                      style={st.input}
                      value={form.hero_image.startsWith('blob:') ? '' : form.hero_image}
                      onChangeText={(v) => set('hero_image', v)}
                      placeholder="…or paste an image URL (https://…)"
                      placeholderTextColor={SAC.dim}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </Field>
                <Field label="Intro" hint="One or two welcoming sentences.">
                  <TextInput style={st.input} value={form.intro} onChangeText={(v) => set('intro', v)} placeholder="Hi everyone, we're excited to share what's coming up…" placeholderTextColor={SAC.dim} />
                </Field>
                <Field label="Message" hint="The main newsletter body (rich text).">
                  <LexicalEditor value={form.body} onChange={(v) => set('body', v)} />
                </Field>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="CTA Text">
                      <TextInput style={st.input} value={form.cta_text} onChangeText={(v) => set('cta_text', v)} placeholder="Register Now" placeholderTextColor={SAC.dim} />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="CTA URL">
                      <TextInput style={st.input} value={form.cta_url} onChangeText={(v) => set('cta_url', v)} placeholder="https://…" placeholderTextColor={SAC.dim} autoCapitalize="none" />
                    </Field>
                  </View>
                </View>
                <Pressable onPress={() => set('include_upcoming', !form.include_upcoming)} style={st.checkRow}>
                  <View style={[st.checkbox, form.include_upcoming && st.checkboxOn]}>
                    {form.include_upcoming && <Check size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.checkLabel}>Include upcoming events</Text>
                    <Text style={st.checkSub}>Auto-adds published ECHO events as email cards.</Text>
                  </View>
                </Pressable>

                {/* Channel toggles */}
                <View style={st.channelSection}>
                  <Text style={st.channelLabel}>SEND VIA</Text>
                  <View style={st.channelRow}>
                    <ChannelPill icon={Mail} label="Email" active={form.send_email} onToggle={() => set('send_email', !form.send_email)} />
                    <ChannelPill icon={Smartphone} label="Push" active={form.send_push} onToggle={() => set('send_push', !form.send_push)} />
                    <ChannelPill icon={Bell} label="In-App" active={form.send_in_app} onToggle={() => set('send_in_app', !form.send_in_app)} />
                    <ChannelPill icon={MessageSquare} label="WhatsApp" active={form.send_whatsapp} onToggle={() => set('send_whatsapp', !form.send_whatsapp)} />
                  </View>
                </View>

                {/* Scheduling controls */}
                <View style={st.channelSection}>
                  <Text style={st.channelLabel}>DELIVERY TYPE</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <Pressable onPress={() => setSendImmediately(true)} style={[st.tab, sendImmediately && st.tabActive, { flex: 1, paddingVertical: 8, justifyContent: 'center' }]}>
                      <Text style={[st.tabText, sendImmediately && st.tabTextActive, { textAlign: 'center' }]}>Send Immediately</Text>
                    </Pressable>
                    <Pressable onPress={() => { setSendImmediately(false); if (!scheduleDate) { const tom = new Date(); tom.setDate(tom.getDate() + 1); setScheduleDate(tom.toISOString().split('T')[0]); } }} style={[st.tab, !sendImmediately && st.tabActive, { flex: 1, paddingVertical: 8, justifyContent: 'center' }]}>
                      <Text style={[st.tabText, !sendImmediately && st.tabTextActive, { textAlign: 'center' }]}>Schedule Send</Text>
                    </Pressable>
                  </View>
                </View>

                {!sendImmediately && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Field label="Schedule Date *" hint="Format: YYYY-MM-DD">
                        <TextInput style={st.input} value={scheduleDate} onChangeText={setScheduleDate} placeholder="e.g. 2026-08-15" placeholderTextColor={SAC.dim} />
                      </Field>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Schedule Time (UTC) *" hint="Format: HH:MM (24h)">
                        <TextInput style={st.input} value={scheduleTime} onChangeText={setScheduleTime} placeholder="e.g. 14:30" placeholderTextColor={SAC.dim} />
                      </Field>
                    </View>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                {confirming ? (
                  <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                    <View style={{ flex: 1 }}>
                      <GradientButton onPress={editingCampaign ? doUpdate : doSend} loading={sending}>
                        <Send size={13} color="#fff" /><Text style={st.btnText}>
                          {editingCampaign ? 'Save Changes' : sendImmediately ? "Send to all users" : "Schedule Campaign"}
                        </Text>
                      </GradientButton>
                    </View>
                    <SecondaryButton onPress={() => setConfirming(false)}><Text style={st.secText}>Cancel</Text></SecondaryButton>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                    <View style={{ flex: 1 }}>
                      <GradientButton onPress={() => { setConfirming(true); fetchRecipientCount(); }}>
                        <Send size={13} color="#fff" /><Text style={st.btnText}>
                          {editingCampaign ? 'Save Changes' : sendImmediately ? "Send Newsletter" : "Schedule Newsletter"}
                        </Text>
                      </GradientButton>
                    </View>
                    <SecondaryButton onPress={doSaveDraft} loading={savingDraft}>
                      <Text style={st.secText}>{editingCampaign ? 'Save as Draft' : 'Save Draft'}</Text>
                    </SecondaryButton>
                  </View>
                )}
              </View>
              {confirming && !sending && (
                <View style={st.confirmBox}>
                  <AlertTriangle size={13} color="#FCD34D" />
                  <Text style={st.confirmText}>
                    {editingCampaign
                      ? "This will update the scheduled campaign with your current content and reschedule it to the time shown. Recipients won't be notified twice."
                      : sendImmediately
                        ? `This will notify ${loadingRecipientCount ? '...' : recipientCount ?? 'all'} registered user${(recipientCount ?? 0) !== 1 ? 's' : ''} via selected channels. Make sure your content looks right.`
                        : `This will schedule the newsletter to be sent automatically on ${scheduleDate} at ${scheduleTime} UTC.`}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <SectionLabel>SEND TO INDIVIDUAL USER</SectionLabel>
              <View style={{ marginTop: 12, gap: 12 }}>
                {/* User search */}
                <Field label="Search User *" hint="Type a name or email to find the user.">
                  <View style={st.searchWrap}>
                    <Search size={14} color={SAC.dim} style={st.searchIcon} />
                    <TextInput
                      style={[st.input, { paddingLeft: 36 }]}
                      value={indUserQuery}
                      onChangeText={handleUserSearch}
                      placeholder="Search by name or email…"
                      placeholderTextColor={SAC.dim}
                      autoCapitalize="none"
                    />
                  </View>
                </Field>

                {/* Search results */}
                {indUserResults.length > 0 && !indSelectedUser && (
                  <View style={st.searchResults}>
                    {indUserResults.map((u) => (
                      <Pressable key={u.id} onPress={() => { setIndSelectedUser(u); setIndUserQuery(u.full_name || u.email); setIndUserResults([]); }} style={st.searchResultItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.searchResultName}>{u.full_name || 'No name'}</Text>
                          <Text style={st.searchResultEmail}>{u.email}</Text>
                        </View>
                        <Text style={st.searchResultRole}>{u.role}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Selected user */}
                {indSelectedUser && (
                  <View style={st.selectedUser}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.selectedUserName}>{indSelectedUser.full_name || 'No name'}</Text>
                      <Text style={st.selectedUserEmail}>{indSelectedUser.email}</Text>
                    </View>
                    <Pressable onPress={() => { setIndSelectedUser(null); setIndUserQuery(''); }}>
                      <Text style={st.selectedUserClear}>Change</Text>
                    </Pressable>
                  </View>
                )}

                {indSelectedUser && (
                  <>
                    <Field label="Title *" hint="Notification title.">
                      <TextInput style={st.input} value={indForm.title} onChangeText={(v) => setIndForm((f) => ({ ...f, title: v }))} placeholder="e.g. Your session is confirmed!" placeholderTextColor={SAC.dim} />
                    </Field>
                    <Field label="Body *" hint="Notification message.">
                      <LexicalEditor value={indForm.body} onChange={(v) => setIndForm((f) => ({ ...f, body: v }))} />
                    </Field>
                    <Field label="Link URL (optional)" hint="Opens when user taps the notification.">
                      <TextInput style={st.input} value={indForm.cta_url} onChangeText={(v) => setIndForm((f) => ({ ...f, cta_url: v }))} placeholder="https://…" placeholderTextColor={SAC.dim} autoCapitalize="none" />
                    </Field>

                    {/* Channel toggles */}
                    <View style={st.channelSection}>
                      <Text style={st.channelLabel}>SEND VIA</Text>
                      <View style={st.channelRow}>
                        <ChannelPill icon={Mail} label="Email" active={indForm.send_email} onToggle={() => setIndForm((f) => ({ ...f, send_email: !f.send_email }))} />
                        <ChannelPill icon={Smartphone} label="Push" active={indForm.send_push} onToggle={() => setIndForm((f) => ({ ...f, send_push: !f.send_push }))} />
                        <ChannelPill icon={Bell} label="In-App" active={indForm.send_in_app} onToggle={() => setIndForm((f) => ({ ...f, send_in_app: !f.send_in_app }))} />
                        <ChannelPill icon={MessageSquare} label="WhatsApp" active={indForm.send_whatsapp} onToggle={() => setIndForm((f) => ({ ...f, send_whatsapp: !f.send_whatsapp }))} />
                      </View>
                    </View>

                    <GradientButton onPress={doSendIndividual} loading={indSending}>
                      <Send size={13} color="#fff" /><Text style={st.btnText}>Send Notification</Text>
                    </GradientButton>
                  </>
                )}
              </View>
            </>
          )}
        </Card>

        {/* ── Preview ── */}
        <Card style={{ width: Platform.OS === 'web' ? 400 : '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionLabel>EMAIL PREVIEW</SectionLabel>
            <SecondaryButton onPress={fetchFullPreview} loading={loadingPreview}>
              <Text style={st.secText}>Get Full Layout</Text>
            </SecondaryButton>
          </View>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={previewHtmlBackend || previewHtml}
              style={{
                width: '100%',
                height: 540,
                border: 'none',
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
              } as any}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <View style={st.previewFrame}>
              <HtmlRenderer html={previewHtmlBackend || previewHtml} />
            </View>
          )}

          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: SAC.border, gap: 10 }}>
            <SectionLabel>SEND TEST EMAIL</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                style={[st.input, { flex: 1, height: 36, paddingVertical: 4 }]}
                value={testEmail}
                onChangeText={setTestEmail}
                placeholder="test@example.com"
                placeholderTextColor={SAC.dim}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <SecondaryButton onPress={doSendTest} loading={testSending}>
                <Text style={st.secText}>Send Test</Text>
              </SecondaryButton>
            </View>
            <Text style={{ color: SAC.dim, fontSize: 11, fontFamily: 'System' }}>
              Sends a real preview email to the address above using the current form content.
            </Text>
          </View>

          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: SAC.border, gap: 10 }}>
            <SectionLabel>SEND TEST WHATSAPP</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                style={[st.input, { flex: 1, height: 36, paddingVertical: 4 }]}
                value={testPhone}
                onChangeText={setTestPhone}
                placeholder="+1 609 651 4555"
                placeholderTextColor={SAC.dim}
                autoCapitalize="none"
                keyboardType="phone-pad"
              />
              <SecondaryButton onPress={doSendTestWhatsApp} loading={testWhatsappSending}>
                <Text style={st.secText}>Send Test</Text>
              </SecondaryButton>
            </View>
            <Text style={{ color: SAC.dim, fontSize: 11, fontFamily: 'System' }}>
              Sends a real WhatsApp message to the number above. Requires OpenWA configured in Settings → Integrations.
            </Text>
          </View>
        </Card>
      </View>

      {/* ── Campaign history ── */}
      <Card>
        <View style={st.cardHead}>
          <SectionLabel>SEND HISTORY</SectionLabel>
          <StatusPill kind="info" label={`${campaigns.length} campaigns`} />
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {loading ? (
            <Text style={st.muted}>Loading…</Text>
          ) : campaigns.length === 0 ? (
            <Text style={st.muted}>No campaigns sent yet. Your first newsletter will appear here.</Text>
          ) : (
            campaigns.map((c, i) => {
              const statusKind = c.status === 'completed' || c.status === 'sent' ? 'success'
                : c.status === 'scheduled' ? 'info'
                : c.status === 'sending' ? 'info'
                : c.status === 'draft' ? 'info'
                : c.status === 'cancelled' ? 'warn'
                : c.status === 'failed' ? 'danger'
                : 'neutral';
              const statusLabel = c.status === 'completed' ? 'Sent'
                : c.status === 'sent' ? 'Sent'
                : c.status === 'scheduled' ? `Scheduled · ${c.send_at?.slice(5, 16).replace('T', ' ') || ''}`
                : c.status === 'sending' ? 'Sending…'
                : c.status === 'draft' ? 'Draft'
                : c.status === 'cancelled' ? 'Cancelled'
                : c.status === 'failed' ? 'Failed'
                : c.status || 'unknown';
              const emailSent = (c.email_ok || 0) + (c.email_fail || 0);
              const pushSent = (c.push_ok || 0) + (c.push_fail || 0);
              const hasStats = c.status === 'completed' || c.status === 'sent' || c.status === 'failed';
              return (
                <View key={c.campaign_id || i} style={st.campRow}>
                  <IconBox size={30}>
                    {c.status === 'scheduled' ? <Calendar size={13} color="#FCD34D" />
                      : c.status === 'sending' ? <RefreshCw size={13} color="#93C5FD" />
                      : c.status === 'cancelled' ? <X size={13} color="#FCA5A5" />
                      : c.status === 'draft' ? <Mail size={13} color="#93C5FD" />
                      : c.individual ? <User size={13} color={GRAD.to} />
                      : <Mail size={13} color={GRAD.to} />}
                  </IconBox>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={st.campTitle}>
                      {c.individual ? '📢 ' : ''}{c.subject}
                    </Text>
                    <Text numberOfLines={1} style={st.campMeta}>
                      {c.status === 'scheduled'
                        ? `Scheduled for ${c.send_at?.slice(0, 16).replace('T', ' ')} UTC`
                        : c.status === 'sending'
                        ? 'Sending in progress…'
                        : c.status === 'draft'
                        ? `Draft · ${c.created_at?.slice(0, 16).replace('T', ' ') || '—'}`
                        : `${c.recipients_count || 0} recipients · ${c.created_at?.slice(0, 16).replace('T', ' ') || '—'}`
                      }
                    </Text>
                    {hasStats && (
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {emailSent > 0 && (
                          <StatPill icon={Mail} label={`${c.email_ok || 0} email`} kind={c.email_fail ? 'warn' : 'success'} />
                        )}
                        {pushSent > 0 && (
                          <StatPill icon={Bell} label={`${c.push_ok || 0} push`} kind={c.push_fail ? 'warn' : 'success'} />
                        )}
                        {(c.in_app_ok || 0) > 0 && (
                          <StatPill icon={Smartphone} label={`${c.in_app_ok} in-app`} kind="success" />
                        )}
                        {((c.whatsapp_ok || 0) + (c.whatsapp_fail || 0)) > 0 && (
                          <StatPill icon={MessageSquare} label={`${c.whatsapp_ok || 0} WhatsApp`} kind={c.whatsapp_fail ? 'warn' : 'success'} />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 280 }}>
                    <StatusPill kind={statusKind} label={statusLabel} />
                    {/* Actions */}
                    {c.status !== 'sending' && (
                      <>
                        {(c.status === 'scheduled' || c.status === 'draft') && (
                          <Pressable
                            onPress={() => startEdit(c.campaign_id)}
                            style={[st.channelPill, { borderColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4 }]}
                            disabled={loadingEdit}
                          >
                            <Text style={{ color: '#A78BFA', fontSize: 11, fontFamily: 'System' }}>
                              {loadingEdit ? 'Loading…' : 'Edit'}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => cancelCampaign(c.campaign_id)}
                          style={[st.channelPill, { borderColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4 }]}
                          disabled={cancellingId === c.campaign_id}
                        >
                          <Text style={{ color: '#ef4444', fontSize: 11, fontFamily: 'System' }}>
                            {cancellingId === c.campaign_id ? 'Working…' : c.status === 'scheduled' ? 'Cancel' : 'Delete'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Card>
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={st.label}>{label.toUpperCase()}</Text>
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ChannelPill({ icon: Icon, label, active, onToggle }: { icon: any; label: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[st.channelPill, active && st.channelPillActive]}>
      <Icon size={13} color={active ? '#fff' : SAC.muted} />
      <Text style={[st.channelPillText, active && st.channelPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatPill({ icon: Icon, label, kind = 'success' }: { icon: any; label: string; kind?: 'success' | 'warn' }) {
  const bg = kind === 'warn' ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)';
  const border = kind === 'warn' ? 'rgba(251,191,36,0.30)' : 'rgba(34,197,94,0.30)';
  const color = kind === 'warn' ? '#FCD34D' : '#4ADE80';
  return (
    <View style={[st.channelPill, { backgroundColor: bg, borderColor: border, paddingHorizontal: 8, paddingVertical: 3 }]}>
      <Icon size={11} color={color} />
      <Text style={{ color, fontFamily: FONTS.bold, fontSize: 10.5 }}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  hint: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginBottom: 4, lineHeight: 15 },
  input: {
    height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff', fontFamily: FONTS.med, fontSize: 13, paddingHorizontal: 12,
    borderWidth: 1, borderColor: SAC.border,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: SAC.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  checkLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  checkSub: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, marginLeft: 6 },
  confirmBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10,
    padding: 10, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.08)',
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.25)',
  },
  confirmText: { color: '#FDE68A', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16, flex: 1 },
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12,
    padding: 12, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.10)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)',
  },
  editBannerTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  editBannerSub: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1, lineHeight: 15 },
  editBannerCancel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  editBannerCancelText: { color: '#94a3b8', fontFamily: FONTS.bold, fontSize: 10.5 },
  previewFrame: {
    marginTop: 12, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14,
    maxHeight: 620, overflow: 'hidden',
  },
  campRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  campTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  campMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },
  // Tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  tabActive: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  tabText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  tabTextActive: { color: '#fff' },
  // Channel toggles
  channelSection: { marginTop: 4 },
  channelLabel: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.5, marginBottom: 6 },
  channelRow: { flexDirection: 'row', gap: 8 },
  channelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}),
  },
  channelPillActive: { backgroundColor: 'rgba(124,58,237,0.2)', borderColor: '#7C3AED' },
  channelPillText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  channelPillTextActive: { color: '#fff' },
  // User search
  searchWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 13, zIndex: 1 },
  searchResults: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 10,
    maxHeight: 180, overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  searchResultName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  searchResultEmail: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  searchResultRole: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10, textTransform: 'capitalize' },
  selectedUser: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
  },
  selectedUserName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  selectedUserEmail: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  selectedUserClear: { color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 12 },
});
