/**
 * Tools & Integrations — sub-tab inside the Profile / Settings page.
 *
 * Lets the user connect external tools that power the platform's AI
 * features and session experience:
 *
 *   • AI Providers     — ChatGPT, Claude, Gemini  (drives Daily Brief / score)
 *   • Email Services   — Gmail, Outlook, iCloud
 *   • Video Conf       — Google Meet, Zoom, Microsoft Teams
 *   • Calendar / Prod  — Google Calendar, Outlook Cal, Notion, Slack
 *   • Default Session  — radio chooser for video link auto-generation
 *
 * Backend (already wired):
 *   GET    /users/me/integrations
 *   POST   /users/me/integrations          { provider, email, account_label? }
 *   DELETE /users/me/integrations/{prov}
 *   PATCH  /users/me/preferences           { default_video_platform, default_ai_provider }
 *
 * NOTE: The "Connect" buttons currently just persist the supplied email +
 * provider key as a metadata stub.  Full OAuth handshakes will be wired
 * for real once the user provides client credentials per provider.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, ScrollView } from 'react-native';
import {
  Sparkles, Plug, Video, Calendar, Mail, BookOpen, Bell, Send,
  CheckCircle2, X, Star,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import OAuthModal from './OAuthModal';

type ProviderId =
  | 'openai_chatgpt' | 'anthropic_claude' | 'google_gemini'
  | 'gmail' | 'outlook' | 'icloud'
  | 'google_meet' | 'zoom' | 'ms_teams'
  | 'google_calendar' | 'outlook_calendar' | 'notion' | 'slack';

type ProviderMeta = {
  id: ProviderId;
  label: string;
  sub: string;
  Icon: any;
  iconBg: string;
  iconColor: string;
};

const AI_PROVIDERS: ProviderMeta[] = [
  { id: 'openai_chatgpt',    label: 'ChatGPT',  sub: 'OpenAI · GPT-4 personalised brief & coaching',     Icon: Sparkles, iconBg: 'rgba(16,185,129,0.18)', iconColor: '#10B981' },
  { id: 'anthropic_claude',  label: 'Claude',   sub: 'Anthropic · Career roadmap & document review',     Icon: Sparkles, iconBg: 'rgba(217,119,6,0.18)',  iconColor: '#F59E0B' },
  { id: 'google_gemini',     label: 'Gemini',   sub: 'Google · Multimodal coaching & AI suggestions',    Icon: Sparkles, iconBg: 'rgba(59,130,246,0.20)', iconColor: '#60A5FA' },
];

const EMAIL_PROVIDERS: ProviderMeta[] = [
  { id: 'gmail',   label: 'Gmail',   sub: 'Receive session reminders & alerts',          Icon: Mail, iconBg: 'rgba(239,68,68,0.18)',  iconColor: '#F87171' },
  { id: 'outlook', label: 'Outlook', sub: 'Microsoft · Office 365 / Hotmail',            Icon: Mail, iconBg: 'rgba(59,130,246,0.20)', iconColor: '#60A5FA' },
  { id: 'icloud',  label: 'iCloud Mail', sub: 'Apple iCloud / @icloud.com / @me.com',    Icon: Mail, iconBg: 'rgba(255,255,255,0.10)', iconColor: '#E5E5E5' },
];

const VIDEO_PROVIDERS: ProviderMeta[] = [
  { id: 'google_meet', label: 'Google Meet',     sub: 'Auto-generate Meet links for bookings',  Icon: Video, iconBg: 'rgba(20,184,166,0.18)', iconColor: '#5EEAD4' },
  { id: 'zoom',        label: 'Zoom',            sub: 'Host sessions on Zoom with auto links', Icon: Video, iconBg: 'rgba(59,130,246,0.20)', iconColor: '#60A5FA' },
  { id: 'ms_teams',    label: 'Microsoft Teams', sub: 'Schedule and host via Microsoft Teams', Icon: Video, iconBg: 'rgba(124,58,237,0.18)', iconColor: '#C4B5FD' },
];

const CAL_PROVIDERS: ProviderMeta[] = [
  { id: 'google_calendar',  label: 'Google Calendar',  sub: 'Auto-add bookings to your calendar', Icon: Calendar, iconBg: 'rgba(34,197,94,0.18)',  iconColor: '#22C55E' },
  { id: 'outlook_calendar', label: 'Outlook Calendar', sub: 'Microsoft 365 calendar sync',        Icon: Calendar, iconBg: 'rgba(59,130,246,0.20)', iconColor: '#60A5FA' },
  { id: 'notion',           label: 'Notion',           sub: 'Auto-create session notes in Notion',Icon: BookOpen, iconBg: 'rgba(255,255,255,0.10)', iconColor: '#E5E5E5' },
  { id: 'slack',            label: 'Slack',            sub: 'Get session reminders on Slack',     Icon: Bell,     iconBg: 'rgba(167,139,250,0.20)', iconColor: '#C4B5FD' },
];

interface Connected {
  provider: string; email?: string; account_label?: string; status?: string; connected_at?: string;
}

export function IntegrationsView() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<Record<string, Connected>>({});
  const [defaults, setDefaults] = useState<{ video?: string; ai?: string }>({});
  const [draftEmail, setDraftEmail] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // OAuth modal state
  const [oauthProvider, setOauthProvider] = useState<ProviderMeta | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await request<any>('/users/me/integrations');
      setConnected(r.integrations || {});
      setDefaults({ video: r.default_video_platform, ai: r.default_ai_provider });
    } catch {/* tolerate */}
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const onConnectClick = (p: ProviderMeta) => {
    // Open the OAuth-style authorization popup. The actual POST
    // happens inside the modal's onAuthorize callback once the user
    // approves and confirms their email.
    setOauthProvider(p);
  };

  const onAuthorize = async (email: string) => {
    if (!oauthProvider) return;
    const p = oauthProvider;
    try {
      await request('/users/me/integrations', { method: 'POST', body: { provider: p.id, email } } as any);
      toast.success('Connected', `${p.label} linked to ${email}.`);
      setOauthProvider(null);
      await reload();
    } catch (e: any) {
      toast.error('Connect failed', e?.message || 'Please try again.');
      throw e;
    }
  };

  const onDisconnect = async (p: ProviderMeta) => {
    setBusy((b) => ({ ...b, [p.id]: true }));
    try {
      await request(`/users/me/integrations/${p.id}`, { method: 'DELETE' } as any);
      toast.success('Disconnected', `${p.label} removed.`);
      await reload();
    } catch (e: any) {
      toast.error('Disconnect failed', e?.message || 'Please try again.');
    } finally {
      setBusy((b) => ({ ...b, [p.id]: false }));
    }
  };

  const setDefaultVideo = async (id: ProviderId) => {
    if (!connected[id]) { toast.info('Connect first', 'Connect this tool before making it the default.'); return; }
    try {
      await request('/users/me/preferences', { method: 'PATCH', body: { default_video_platform: id } } as any);
      setDefaults((d) => ({ ...d, video: id }));
      toast.success('Default updated', 'Sessions will use this platform.');
    } catch {/* swallow */}
  };

  const setDefaultAi = async (id: ProviderId) => {
    if (!connected[id]) { toast.info('Connect first', 'Connect this AI provider before making it the default.'); return; }
    try {
      await request('/users/me/preferences', { method: 'PATCH', body: { default_ai_provider: id } } as any);
      setDefaults((d) => ({ ...d, ai: id }));
      toast.success('Default updated', 'AI brief will use this provider.');
    } catch {/* swallow */}
  };

  const renderRow = (p: ProviderMeta, kind: 'ai' | 'email' | 'video' | 'cal') => {
    const c = connected[p.id];
    const Icon = p.Icon;
    const isDefault =
      (kind === 'video' && defaults.video === p.id) ||
      (kind === 'ai'    && defaults.ai    === p.id);
    return (
      <View key={p.id} style={st.row} testID={`integ-${p.id}`}>
        <View style={[st.iconBox, { backgroundColor: p.iconBg }]}>
          <Icon size={18} color={p.iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={st.label}>{p.label}</Text>
            {c && <Pill color="#10B981" text="Connected" Icon={CheckCircle2} />}
            {isDefault && <Pill color="#A78BFA" text="Default"   Icon={Star} />}
          </View>
          <Text style={st.sub} numberOfLines={1}>
            {c ? (c.email || c.account_label || 'Linked') : p.sub}
          </Text>
        </View>

        {c ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {(kind === 'video' || kind === 'ai') && !isDefault && (
              <Pressable
                onPress={() => (kind === 'video' ? setDefaultVideo(p.id) : setDefaultAi(p.id))}
                style={st.btnGhost}
                testID={`integ-set-default-${p.id}`}
              >
                <Star size={12} color="#C4B5FD" />
                <Text style={st.btnGhostText}>Make default</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => onDisconnect(p)}
              style={st.btnDanger}
              disabled={!!busy[p.id]}
              testID={`integ-disconnect-${p.id}`}
            >
              <X size={12} color="#FCA5A5" />
              <Text style={st.btnDangerText}>{busy[p.id] ? '…' : 'Disconnect'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => onConnectClick(p)}
            style={[st.btnConnect, { paddingHorizontal: 14 }]}
            disabled={!!busy[p.id]}
            testID={`integ-connect-${p.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Connect ${p.label}`}
            accessibilityHint={`Opens an authorization popup to link your ${p.label} account`}
          >
            <Send size={12} color="#0F2922" />
            <Text style={st.btnConnectText}>Connect with {p.label}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Header banner */}
      <View style={st.banner}>
        <View style={[st.iconBox, { backgroundColor: 'rgba(20,184,166,0.20)' }]}>
          <Plug size={20} color="#5EEAD4" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.bannerTitle}>Tools &amp; Integrations</Text>
          <Text style={st.bannerSub}>Connect your AI, mail, video and productivity tools so we can personalise your daily brief, score and session links.</Text>
        </View>
      </View>

      {/* AI Providers */}
      <Section title="AI PROVIDERS" sub="Choose which AI powers your Daily Brief and Career Score">
        {AI_PROVIDERS.map((p) => renderRow(p, 'ai'))}
      </Section>

      {/* Email */}
      <Section title="EMAIL SERVICES" sub="Send session reminders and digests to this inbox">
        {EMAIL_PROVIDERS.map((p) => renderRow(p, 'email'))}
      </Section>

      {/* Video */}
      <Section title="VIDEO CONFERENCING" sub="Auto-generate links when sessions are booked">
        {VIDEO_PROVIDERS.map((p) => renderRow(p, 'video'))}
      </Section>

      {/* Calendar / Productivity */}
      <Section title="CALENDAR &amp; PRODUCTIVITY" sub="Sync sessions, notes and alerts">
        {CAL_PROVIDERS.map((p) => renderRow(p, 'cal'))}
      </Section>

      {/* Default Session Platform */}
      <View style={st.card}>
        <Text style={st.sectionTitle}>DEFAULT SESSION PLATFORM</Text>
        <Text style={st.sectionSub}>When sessions are booked, auto-generate a link using the chosen platform.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
          {VIDEO_PROVIDERS.map((p) => {
            const active = defaults.video === p.id;
            const isOn = !!connected[p.id];
            return (
              <Pressable
                key={p.id}
                onPress={() => setDefaultVideo(p.id)}
                disabled={!isOn}
                style={[st.platformChip, active && st.platformChipActive, !isOn && { opacity: 0.45 }]}
                testID={`integ-default-${p.id}`}
              >
                <Video size={13} color={active ? '#0F2922' : '#fff'} />
                <Text style={[st.platformChipText, active && { color: '#0F2922' }]}>{p.label}</Text>
                {active && <CheckCircle2 size={12} color="#0F2922" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* OAuth authorization popup */}
      <OAuthModal
        visible={!!oauthProvider}
        provider={oauthProvider}
        onClose={() => setOauthProvider(null)}
        onAuthorize={onAuthorize}
      />
    </View>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: any }) {
  return (
    <View style={st.card}>
      <Text style={st.sectionTitle}>{title}</Text>
      <Text style={st.sectionSub}>{sub}</Text>
      <View style={{ marginTop: 12, gap: 10 }}>{children}</View>
    </View>
  );
}

function Pill({ color, text, Icon }: { color: string; text: string; Icon: any }) {
  return (
    <View style={[st.pill, { backgroundColor: color + '22', borderColor: color + '66' }]}>
      <Icon size={10} color={color} />
      <Text style={[st.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const C = {
  bg: '#0F0B1A',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.18)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.65)',
  teal: '#5EEAD4',
};

const st = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(20,184,166,0.06)',
    borderColor: 'rgba(20,184,166,0.30)', borderWidth: 1,
  },
  bannerTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  bannerSub:   { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 3, lineHeight: 17 },

  card: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  sectionTitle: { color: C.text2, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.0 },
  sectionSub:   { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: C.border, borderWidth: 1,
  },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  sub:   { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  input: {
    width: 200,
    height: 34, borderRadius: 8, paddingHorizontal: 10,
    color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12.5,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: C.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  btnConnect: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 34, borderRadius: 8,
    backgroundColor: C.teal,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnConnectText: { color: '#0F2922', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.32)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnGhostText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  btnDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnDangerText: { color: '#FCA5A5', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.4 },

  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border2, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  platformChipActive: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  platformChipText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});

export default IntegrationsView;
