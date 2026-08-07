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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Platform,
} from 'react-native';
import {
  Mail, Send, RefreshCw, Calendar, AlertTriangle, Check, Users, Megaphone,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  StatusPill, Toast, useToast, KpiTile,
} from '../applekit';
import { api } from '@/src/models/services/api';
import HtmlRenderer from '@/src/views/web/policy/HtmlRenderer';

type Campaign = {
  campaign_id: string;
  subject: string;
  recipients_count: number;
  ok_count?: number;
  fail_count?: number;
  status?: string;
  created_at?: string;
  created_by?: string;
  include_upcoming?: boolean;
};

function buildPreviewHtml(form: any, events: any[]): string {
  const hero = form.hero_image
    ? `<img src="${form.hero_image}" alt="" style="width:100%;height:auto;display:block;border-radius:12px;margin:0 0 20px 0;" />`
    : '';
  const intro = form.intro
    ? `<p style="margin:0 0 14px 0;color:#374151;font-size:15px;">${form.intro}</p>`
    : '';
  const body = form.body
    ? `<div style="margin:0 0 18px 0;color:#374151;font-size:15px;line-height:1.65;">${form.body}</div>`
    : '';
  const evCards = (events || []).slice(0, 4).map((ev) => {
    const img = ev.hero_image_url
      ? `<img src="${ev.hero_image_url}" alt="" style="width:100%;height:auto;display:block;border-radius:10px 10px 0 0;" />`
      : '';
    const badge = Number(ev.fee || 0) <= 0 ? 'FREE ENTRY' : `₹${Number(ev.fee).toLocaleString('en-IN')} ENTRY`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;"><tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">${img}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 18px;">
        <div style="font-size:11px;font-weight:700;color:#7C3AED;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">${badge}</div>
        <div style="font-size:16px;font-weight:700;color:#111827;">${ev.title}</div>
        <div style="font-size:12.5px;color:#6b7280;margin-top:6px;">${ev.college || 'Student Alumni Cell'}${ev.date ? ' · ' + ev.date : ''}</div>
        <div style="font-size:12.5px;color:#6b7280;">${ev.venue || ''}</div>
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

export function NewsletterView() {
  const { toast, flash } = useToast();
  const [form, setForm] = useState({
    subject: '',
    hero_image: '',
    intro: '',
    body: '',
    cta_text: 'Register Now',
    cta_url: 'https://studentalumni.ai/echo',
    include_upcoming: true,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const doSend = async () => {
    if (!form.subject.trim()) { flash('Subject is required'); return; }
    if (!form.body.trim() && !form.cta_url.trim()) { flash('Add a message or a CTA link'); return; }
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
      });
      flash(r?.message || 'Newsletter sent ✓');
      await load();
    } catch (e: any) {
      flash(e?.message || 'Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const totalRecipients = campaigns.reduce((a, c) => a + (c.recipients_count || 0), 0);

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} />

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
          <SectionLabel>COMPOSE NEWSLETTER</SectionLabel>
          <View style={{ marginTop: 12, gap: 12 }}>
            <Field label="Subject *" hint="Appears in the email subject line.">
              <TextInput style={st.input} value={form.subject} onChangeText={(v) => set('subject', v)} placeholder="e.g. Join us at ECHO 2026!" placeholderTextColor={SAC.dim} />
            </Field>
            <Field label="Hero Image URL" hint="Full-width image at the top (poster or banner).">
              <TextInput style={st.input} value={form.hero_image} onChangeText={(v) => set('hero_image', v)} placeholder="https://…" placeholderTextColor={SAC.dim} autoCapitalize="none" />
            </Field>
            <Field label="Intro" hint="One or two welcoming sentences.">
              <TextInput style={st.input} value={form.intro} onChangeText={(v) => set('intro', v)} placeholder="Hi everyone, we're excited to share what's coming up…" placeholderTextColor={SAC.dim} />
            </Field>
            <Field label="Message" hint="The main newsletter body (plain text or simple HTML).">
              <TextInput style={[st.input, { minHeight: 120, textAlignVertical: 'top' }]} value={form.body} onChangeText={(v) => set('body', v)} placeholder="Write your update here…" placeholderTextColor={SAC.dim} multiline />
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
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {confirming ? (
              <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                <View style={{ flex: 1 }}>
                  <GradientButton onPress={doSend} loading={sending}>
                    <Send size={13} color="#fff" /><Text style={st.btnText}>Send to all users</Text>
                  </GradientButton>
                </View>
                <SecondaryButton onPress={() => setConfirming(false)}><Text style={st.secText}>Cancel</Text></SecondaryButton>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <GradientButton onPress={() => setConfirming(true)}>
                  <Send size={13} color="#fff" /><Text style={st.btnText}>Send Newsletter</Text>
                </GradientButton>
              </View>
            )}
          </View>
          {confirming && !sending && (
            <View style={st.confirmBox}>
              <AlertTriangle size={13} color="#FCD34D" />
              <Text style={st.confirmText}>This will email every registered user. Make sure your subject + preview look right.</Text>
            </View>
          )}
        </Card>

        {/* ── Preview ── */}
        <Card style={{ width: Platform.OS === 'web' ? 400 : '100%' }}>
          <SectionLabel>EMAIL PREVIEW</SectionLabel>
          <View style={st.previewFrame}>
            <HtmlRenderer html={previewHtml} />
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
            campaigns.map((c, i) => (
              <View key={c.campaign_id || i} style={st.campRow}>
                <IconBox size={30}><Mail size={13} color={GRAD.to} /></IconBox>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={st.campTitle}>{c.subject}</Text>
                  <Text numberOfLines={1} style={st.campMeta}>
                    {c.created_at?.slice(0, 16).replace('T', ' ') || '—'} · to {c.recipients_count || 0} users
                  </Text>
                </View>
                <StatusPill
                  kind={c.fail_count > 0 ? 'warn' : 'success'}
                  label={`${c.ok_count ?? c.recipients_count ?? 0} sent${c.fail_count ? ` · ${c.fail_count} failed` : ''}`}
                />
              </View>
            ))
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
});
