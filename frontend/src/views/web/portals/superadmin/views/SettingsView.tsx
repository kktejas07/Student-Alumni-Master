// @ts-nocheck
/**
 * SettingsView — Super Admin Settings (Apple HIG + NexusOS dark glass).
 *
 * Top horizontal tab navigation with 7 sections matching the provided design:
 *   • Manage Profile      — editable admin profile, role tags, platform status
 *   • Platform Controls   — feature flags (toggles) + system settings + danger zone
 *   • Integrations        — connect/disconnect tools with API-key entry modal
 *   • Roles & Permissions — system + custom roles with CRUD
 *   • Notifications       — per-event channel matrix (email / push / sms / in-app)
 *   • Security            — 2FA, password, active sessions, access log
 *   • Digital ID          — branded gradient ID card with copy/share/download
 *
 * Backend:
 *   GET/PATCH  /api/admin/profile
 *   GET/PATCH  /api/admin/platform-controls
 *   GET/POST/PATCH/DELETE /api/admin/roles
 *   GET        /api/admin/permissions
 *   GET        /api/marketplace/tools
 *   POST       /api/marketplace/install   (now accepts credentials)
 *   DELETE     /api/marketplace/tools/{tool_id}
 *   GET/PATCH  /api/admin/notifications/preferences
 *   GET        /api/admin/security/sessions
 *   DELETE     /api/admin/security/sessions/{id}
 *   GET        /api/admin/security/access-log
 *   PUT        /api/admin/security/password
 *   GET        /api/admin/digital-id
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Switch, Platform, Modal,
  TextInput, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import {
  UserCog, Sliders, Plug, Shield, Bell, Lock, IdCard, Plus,
  Pencil, Trash2, Check, X, Copy, Share2, Download, Eye, EyeOff,
  ExternalLink, RotateCcw, Monitor, Smartphone, AlertTriangle, KeyRound,
  ChevronRight, QrCode, Building2, ShieldCheck, Search, Sparkles, CheckCircle2,
  Mail, Users as UsersIcon, ArrowLeft, Clock, MapPin, Globe, Wifi, Activity, FileText,
  Maximize2, Minimize2, Upload,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SAC, FONTS } from '../tokens';
import { Card, Toast } from '../applekit';
import { request } from '@/src/models/services/api';
import LexicalEditor from './LexicalEditor';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

/* ─────────────────────────────────────────────────────────────────
 * Provider docs map — used by the "How to get credentials" link in
 * the Connect modal. Maintained by tool_id.
 * ───────────────────────────────────────────────────────────────── */
const TOOL_DOCS: Record<string, string> = {
  'google-workspace': 'https://console.cloud.google.com/apis/credentials',
  'google-calendar' : 'https://console.cloud.google.com/apis/credentials',
  'outlook'         : 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
  'slack'           : 'https://api.slack.com/apps',
  'zoom'            : 'https://marketplace.zoom.us/develop/create',
  'whatsapp'        : 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  'gmail'           : 'https://console.cloud.google.com/apis/credentials',
  'sendgrid'        : 'https://app.sendgrid.com/settings/api_keys',
  'aws-s3'          : 'https://console.aws.amazon.com/iam/home#/security_credentials',
  'hubspot'         : 'https://app.hubspot.com/private-apps',
  'salesforce'      : 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm',
  'zoho'            : 'https://api-console.zoho.com',
  'notion'          : 'https://www.notion.so/my-integrations',
  'linear'          : 'https://linear.app/settings/api',
  'stripe'          : 'https://dashboard.stripe.com/apikeys',
  'razorpay'        : 'https://dashboard.razorpay.com/app/keys',
  'linkedin'        : 'https://www.linkedin.com/developers/apps',
  'twilio'          : 'https://console.twilio.com',
  'claude'          : 'https://console.anthropic.com/settings/keys',
  'openai'          : 'https://platform.openai.com/api-keys',
  'gemini'          : 'https://aistudio.google.com/apikey',
  'mistral'         : 'https://console.mistral.ai/api-keys/',
  'cohere'          : 'https://dashboard.cohere.com/api-keys',
  'perplexity'      : 'https://www.perplexity.ai/settings/api',
  'groq'            : 'https://console.groq.com/keys',
  'together-ai'     : 'https://api.together.xyz/settings/api-keys',
  'fireworks-ai'    : 'https://fireworks.ai/api-keys',
  'huggingface'     : 'https://huggingface.co/settings/tokens',
  'replicate'       : 'https://replicate.com/account/api-tokens',
  'stability'       : 'https://platform.stability.ai/account/keys',
  'openai-images'   : 'https://platform.openai.com/api-keys',
  'fal-ai'          : 'https://fal.ai/dashboard/keys',
  'runway'          : 'https://app.runwayml.com/account',
  'elevenlabs'      : 'https://elevenlabs.io/app/settings/api-keys',
  'openai-whisper'  : 'https://platform.openai.com/api-keys',
  'assemblyai'      : 'https://www.assemblyai.com/app/account',
  'deepgram'        : 'https://console.deepgram.com/api-keys',
  'deepl'           : 'https://www.deepl.com/account/summary',
  'google-translate': 'https://console.cloud.google.com/apis/credentials',
  'pinecone'        : 'https://app.pinecone.io/organizations/-/keys',
  'weaviate'        : 'https://console.weaviate.cloud/dashboard',
  'chroma'          : 'https://docs.trychroma.com/getting-started',
  'qdrant'          : 'https://cloud.qdrant.io/accounts/-/api-keys',
  'langsmith'       : 'https://smith.langchain.com/o/-/settings',
  'helicone'        : 'https://www.helicone.ai/developer',
  'agent-k'         : 'https://your-ai-provider.example/profile',
  'proxycurl'       : 'https://nubela.co/proxycurl/dashboard',
  'rchilli'         : 'https://www.rchilli.com/contact-us',
  'affinda'         : 'https://app.affinda.com/account/api-keys',
  'clearbit'        : 'https://dashboard.clearbit.com/api',
  'apollo'          : 'https://app.apollo.io/#/settings/integrations/api',
  'lever'           : 'https://hire.lever.co/settings/integrations',
  'greenhouse'      : 'https://app.greenhouse.io/configure/dev_center',
  'calendly'        : 'https://calendly.com/integrations/api_webhooks',
  'tally'           : 'https://tally.so/help/api',
  'typeform'        : 'https://admin.typeform.com/account#/section/tokens',
  'posthog'         : 'https://app.posthog.com/project/settings',
  'mixpanel'        : 'https://mixpanel.com/settings/project',
  'amplitude'       : 'https://app.amplitude.com/settings/projects',
  'sentry'          : 'https://sentry.io/settings/account/api/auth-tokens/',
  'datadog'         : 'https://app.datadoghq.com/organization-settings/api-keys',
  'github'          : 'https://github.com/settings/tokens',
};

/* ─────────────────────────────────────────────────────────────────
 * Design tokens — warm orange/amber gradient (matches screenshots)
 * Layered on top of NexusOS dark surfaces so it stays in-app.
 * ───────────────────────────────────────────────────────────────── */
const GRAD_FROM = '#FB923C';  // orange 400
const GRAD_TO   = '#F59E0B';  // amber  500
const GRAD_DEEP = '#D97706';  // amber  600
const GRAD_BG   = ['rgba(251,146,60,0.20)', 'rgba(245,158,11,0.10)'] as const;

/* ─────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────── */
type TabId =
  | 'profile' | 'platform' | 'integrations' | 'roles'
  | 'notifications' | 'security' | 'digital-id' | 'pages' | 'templates' | 'branding';

type Tool = {
  id: string; name: string; category: string; icon: string; tint: string;
  description: string; auth_type: string; popular?: boolean;
  installed: boolean; status?: string | null; installed_at?: string | null;
  auth_fields?: Array<{ key: string; label: string; type: string; placeholder?: string; help?: string }>;
  credentials_masked?: Record<string, string>;
  webhook_url?: string;
};
type Role = {
  id: string; key: string; name: string; description: string;
  is_system: boolean; permissions: string[]; user_count: number; created_at: string;
};
type Permission = { id: string; group: string; label: string };
type PermissionGroup = { group: string; items: Permission[] };

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'profile',       label: 'Manage Profile',      icon: UserCog },
  { id: 'platform',      label: 'Platform Controls',   icon: Sliders },
  { id: 'integrations',  label: 'Integrations',        icon: Plug },
  { id: 'roles',         label: 'Roles & Permissions', icon: Shield },
  { id: 'notifications', label: 'Notifications',       icon: Bell },
  { id: 'templates',     label: 'Templates',           icon: FileText },
  { id: 'branding',      label: 'Branding',            icon: FileText },
  { id: 'security',      label: 'Security',            icon: Lock },
  { id: 'digital-id',    label: 'Digital ID',          icon: IdCard },
  { id: 'pages',         label: 'Pages',               icon: FileText },
];

const DEFAULT_SYSTEM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  session_timeout: [
    { value: '15 minutes', label: '15 minutes' },
    { value: '30 minutes', label: '30 minutes' },
    { value: '1 hour',     label: '1 hour' },
    { value: '2 hours',    label: '2 hours' },
    { value: '4 hours',    label: '4 hours' },
    { value: '8 hours',    label: '8 hours' },
    { value: '12 hours',   label: '12 hours' },
    { value: '24 hours',   label: '24 hours' },
  ],
  password_policy: [
    { value: 'Weak (8+ chars)',        label: 'Weak (8+ chars)' },
    { value: 'Medium (10+ chars)',     label: 'Medium (10+ chars)' },
    { value: 'Strong (12+ chars)',    label: 'Strong (12+ chars)' },
    { value: 'Very Strong (16+ chars)',label: 'Very Strong (16+ chars)' },
    { value: 'Maximum (20+ chars)',   label: 'Maximum (20+ chars)' },
  ],
  default_locale: [
    { value: 'en-IN', label: 'English (India) — en-IN' },
    { value: 'en-US', label: 'English (US) — en-US' },
    { value: 'en-GB', label: 'English (UK) — en-GB' },
    { value: 'hi-IN', label: 'Hindi — hi-IN' },
    { value: 'ta-IN', label: 'Tamil — ta-IN' },
    { value: 'bn-IN', label: 'Bengali — bn-IN' },
    { value: 'te-IN', label: 'Telugu — te-IN' },
    { value: 'mr-IN', label: 'Marathi — mr-IN' },
  ],
  default_tz: [
    { value: 'Asia/Kolkata',       label: 'IST — Asia/Kolkata (UTC+5:30)' },
    { value: 'UTC',                label: 'UTC — Coordinated Universal Time' },
    { value: 'Asia/Dubai',        label: 'GST — Asia/Dubai (UTC+4)' },
    { value: 'Asia/Singapore',     label: 'SGT — Asia/Singapore (UTC+8)' },
    { value: 'Asia/Tokyo',        label: 'JST — Asia/Tokyo (UTC+9)' },
    { value: 'America/New_York',   label: 'EST — America/New_York (UTC-5)' },
    { value: 'America/Chicago',    label: 'CST — America/Chicago (UTC-6)' },
    { value: 'America/Los_Angeles',label: 'PST — America/Los_Angeles (UTC-8)' },
    { value: 'Europe/London',     label: 'GMT — Europe/London (UTC+0)' },
    { value: 'Europe/Paris',      label: 'CET — Europe/Paris (UTC+1)' },
  ],
  default_currency: [
    { value: 'INR (₹)',  label: 'Indian Rupee — INR (₹)' },
    { value: 'USD ($)',  label: 'US Dollar — USD ($)' },
    { value: 'EUR (€)',  label: 'Euro — EUR (€)' },
    { value: 'GBP (£)',  label: 'British Pound — GBP (£)' },
    { value: 'AED',      label: 'UAE Dirham — AED' },
    { value: 'SGD',      label: 'Singapore Dollar — SGD' },
    { value: 'AUD ($)',  label: 'Australian Dollar — AUD ($)' },
    { value: 'CAD ($)',  label: 'Canadian Dollar — CAD ($)' },
  ],
  linkedin_oauth_client_id: [],
  linkedin_oauth_client_secret: [],
};

/* ─────────────────────────────────────────────────────────────────
 * Main view
 * ───────────────────────────────────────────────────────────────── */
export function SettingsView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const [tab, setTab] = useSubTab<TabId>(
    ['profile', 'platform', 'integrations', 'roles', 'notifications', 'security', 'digital-id', 'pages', 'templates', 'branding'],
    'profile',
    { sub, onSub },
  );
  const [toast, setToast] = useState({ visible: false, text: 'Saved', kind: 'success' as 'success' | 'error' | 'warning' | 'info' | 'pending' });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));
  const flashToast = (text = 'Saved', kind?: 'success' | 'error' | 'warning' | 'info' | 'pending') => {
    const t = (text || '').toLowerCase();
    const resolved = kind || (
      /(fail|error|invalid|required|denied|unable)/.test(t) ? 'error'
        : /(warn|caution)/.test(t) ? 'warning'
          : /(pending|loading|sending|processing)/.test(t) ? 'pending'
            : /(info|note|editing)/.test(t) ? 'info'
              : 'success'
    );
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, kind: resolved });
    toastTimer.current = setTimeout(hideToast, 5000);
  };

  return (
    <View style={{ gap: 16 }}>
      <TopTabBar active={tab} onChange={setTab} />
      <View style={{ minHeight: 480 }}>
        {tab === 'profile'       && <ProfileTab onSaved={flashToast} />}
        {tab === 'platform'      && <PlatformTab onSaved={flashToast} />}
        {tab === 'integrations'  && <IntegrationsTab onSaved={flashToast} />}
        {tab === 'roles'         && <RolesTab onSaved={flashToast} />}
        {tab === 'notifications' && <NotificationsTab onSaved={flashToast} />}
        {tab === 'security'      && <SecurityTab onSaved={flashToast} />}
        {tab === 'digital-id'    && <DigitalIdTab onSaved={flashToast} />}
        {tab === 'pages'         && <PagesTab onSaved={flashToast} />}
        {tab === 'templates'     && <TemplatesTab onSaved={flashToast} />}
        {tab === 'branding'      && <BrandingTab onSaved={flashToast} />}
      </View>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hideToast} />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Top horizontal tab bar
 * ───────────────────────────────────────────────────────────────── */
function TopTabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <View style={s.tabBarOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, padding: 6 }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          if (isActive) {
            return (
              <Pressable key={t.id} onPress={() => onChange(t.id)}>
                <LinearGradient
                  colors={[GRAD_FROM, GRAD_TO]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.tabActive}
                >
                  <Icon size={14} color="#fff" />
                  <Text style={s.tabActiveText}>{t.label}</Text>
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              style={({ hovered }: any) => [
                s.tabInactive,
                hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null,
              ]}
            >
              <Icon size={13} color={SAC.muted} />
              <Text style={s.tabInactiveText}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 1 — Manage Profile
 * ═══════════════════════════════════════════════════════════════ */
function ProfileTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await request<any>('/admin/profile');
      setData(r);
      setDraft({ name: r?.name, phone: r?.phone, title: r?.title, org: r?.org });
    } catch (e) { /* ignore */ }
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await request('/admin/profile', { method: 'PATCH', body: draft });
      await load();
      setEditing(false);
      onSaved('Profile saved');
    } finally { setSaving(false); }
  };

  if (!data) return <Loading />;

  const initials = (data.name || 'SA').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      {/* Header card with gradient avatar + status */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <LinearGradient
            colors={[GRAD_FROM, GRAD_DEEP]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.avatarLg}
          >
            <Text style={s.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
            <Text style={s.h1}>{data.name}</Text>
            <Text style={s.subtle}>{data.title} · {data.org}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <LinearGradient colors={[GRAD_FROM, GRAD_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pillGrad}>
                <Text style={s.pillGradText}>{data.role_label}</Text>
              </LinearGradient>
              <View style={s.pillGreen}>
                <Text style={s.pillGreenText}>{data.access_label}</Text>
              </View>
              <View style={s.pillNeutral}>
                <Text style={s.pillNeutralText}>{data.admin_id}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={s.label}>Platform status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={s.dotGreen} />
              <Text style={s.valueText}>{data.platform_status}</Text>
            </View>
            <Text style={s.muted}>Last login: {data.last_login ? new Date(data.last_login).toLocaleString() : 'Today, 9:41 AM'}</Text>
          </View>
        </View>
      </View>

      {/* Editable profile fields */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <Text style={s.cardTitle}>Profile details</Text>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)} style={s.linkBtn}>
              <Pencil size={12} color={GRAD_TO} />
              <Text style={s.linkBtnText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={() => { setEditing(false); load(); }} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <GradientButton onPress={save} loading={saving}>
                <Check size={14} color="#fff" />
                <Text style={s.primaryBtnText}>Save changes</Text>
              </GradientButton>
            </View>
          )}
        </View>

        <View style={{ gap: 14, marginTop: 16 }}>
          <Field label="Full name" value={data.name} editing={editing}
                 onChange={(v) => setDraft({ ...draft, name: v })} draft={draft.name} />
          <Field label="Email"     value={data.email} editing={false} />
          <Field label="Phone"     value={data.phone || '—'} editing={editing}
                 onChange={(v) => setDraft({ ...draft, phone: v })} draft={draft.phone} placeholder="+91 9xxxx xxxxx" />
          <Field label="Title"     value={data.title} editing={editing}
                 onChange={(v) => setDraft({ ...draft, title: v })} draft={draft.title} />
          <Field label="Organisation" value={data.org} editing={editing}
                 onChange={(v) => setDraft({ ...draft, org: v })} draft={draft.org} />
        </View>
      </View>

      {/* Email signature drill-in card */}
      <SignatureCard
        signature={data.signature || ''}
        onSaved={async () => { await load(); onSaved('Signature saved'); }}
      />
    </Animated.View>
  );
}

/* ─── Signature editor (drill-in modal) ─────────────────────────────
 * Lives inside ProfileTab. Card shows a preview; tapping Edit opens a
 * modal with multi-line editor + live preview + template chips. */
function SignatureCard({ signature, onSaved }: { signature: string; onSaved: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const lines = (signature || '').split('\n').filter(Boolean);
  return (
    <>
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><Mail size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Email signature</Text>
              <Text style={s.cardSub}>Appended to outbound emails sent from the platform</Text>
            </View>
          </View>
          <Pressable onPress={() => setOpen(true)} style={s.linkBtn}>
            <Pencil size={12} color={GRAD_TO} />
            <Text style={s.linkBtnText}>Edit signature</Text>
          </Pressable>
        </View>
        <View style={s.sigPreview}>
          {lines.length === 0 ? (
            <Text style={s.muted}>No signature set — tap "Edit signature" to add one.</Text>
          ) : lines.map((ln, i) => (
            <Text key={i} style={[s.sigPreviewLine, i === 0 && s.sigPreviewLineFirst]}>{ln}</Text>
          ))}
        </View>
      </View>
      <SignatureEditorModal
        visible={open}
        initial={signature}
        onClose={() => setOpen(false)}
        onSaved={async () => { setOpen(false); await onSaved(); }}
      />
    </>
  );
}

function SignatureEditorModal({ visible, initial, onClose, onSaved }: {
  visible: boolean; initial: string; onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (visible) { setVal(initial); setErr(''); } }, [visible, initial]);

  const TEMPLATES: Array<{ id: string; label: string; body: string }> = [
    {
      id: 'professional', label: 'Professional',
      body: 'Best regards,\n{{name}}\n{{title}} · {{org}}\n{{email}} · {{phone}}',
    },
    {
      id: 'minimal', label: 'Minimal',
      body: '{{name}}\n{{title}}, {{org}}',
    },
    {
      id: 'friendly', label: 'Friendly',
      body: 'Cheers,\n{{name}}\n{{org}}',
    },
  ];

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await request('/admin/profile', { method: 'PATCH', body: { signature: val } });
      await onSaved();
    } catch (e: any) {
      setErr(e?.message || 'Could not save');
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation?.()}>
          <View style={s.modalHead}>
            <View style={s.iconBox}><Mail size={14} color={GRAD_TO} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle}>Edit email signature</Text>
              <Text style={s.cardSub}>Use {`{{name}}`}, {`{{title}}`}, {`{{org}}`}, {`{{email}}`}, {`{{phone}}`} as placeholders.</Text>
            </View>
            <Pressable onPress={onClose} style={s.modalClose}>
              <X size={14} color={SAC.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} style={{ maxHeight: 520 }}>
            {/* Template chips */}
            <View>
              <Text style={s.fieldLabel}>Templates</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {TEMPLATES.map((t) => (
                  <Pressable key={t.id} onPress={() => setVal(t.body)} style={s.tplChip}>
                    <Text style={s.tplChipText}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Editor */}
            <View>
              <Text style={s.fieldLabel}>Signature</Text>
              <TextInput
                value={val} onChangeText={setVal}
                multiline numberOfLines={6}
                placeholder="Best regards,\nName\nTitle · Org\nemail@org.com"
                placeholderTextColor={SAC.dim}
                style={s.sigEditor}
              />
              <Text style={[s.muted, { marginTop: 4 }]}>{val.length}/1500</Text>
            </View>

            {/* Live preview */}
            <View>
              <Text style={s.fieldLabel}>Preview</Text>
              <View style={[s.sigPreview, { marginTop: 6 }]}>
                {val.split('\n').filter(Boolean).map((ln, i) => (
                  <Text key={i} style={[s.sigPreviewLine, i === 0 && s.sigPreviewLineFirst]}>{ln}</Text>
                )) || <Text style={s.muted}>—</Text>}
              </View>
            </View>

            {!!err && <Text style={{ color: SAC.red, fontFamily: FONTS.bold, fontSize: 11.5 }}>{err}</Text>}
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <GradientButton onPress={save} loading={busy}>
              <Check size={14} color="#fff" />
              <Text style={s.primaryBtnText}>Save signature</Text>
            </GradientButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}function Field({ label, value, editing, draft, onChange, placeholder }: {
  label: string; value: string; editing: boolean; draft?: string;
  onChange?: (v: string) => void; placeholder?: string;
}) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      {editing && onChange ? (
        <TextInput
          value={draft || ''} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={SAC.dim}
          style={s.input}
        />
      ) : (
        <Text style={s.fieldValue}>{value}</Text>
      )}
    </View>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 2 — Platform Controls
 * ═══════════════════════════════════════════════════════════════ */
function PlatformTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [pickerSetting, setPickerSetting] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await request<any>('/admin/platform-controls')); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleFlag = async (key: string, value: boolean) => {
    if (!data) return;
    const newFlags = data.feature_flags.map((f: any) => f.key === key ? { ...f, value } : f);
    setData({ ...data, feature_flags: newFlags });
    try {
      await request('/admin/platform-controls', { method: 'PATCH', body: { key, value, section: 'feature_flags' } });
      onSaved('Saved');
    } catch { load(); }
  };

  const saveSetting = async (key: string, value: string) => {
    setBusy(true);
    try {
      await request('/admin/platform-controls/system-settings', {
        method: 'PATCH', body: { key, value },
      });
      setPickerSetting(null);
      onSaved('Setting updated');
      await load();
    } catch { onSaved('Failed'); }
    finally { setBusy(false); }
  };

  const dangerAction = async (action: string, label: string) => {
    if (!confirm) { setConfirm(action); return; }
    setBusy(true);
    try {
      await request(`/admin/${action}`, { method: 'POST' });
      setConfirm(null);
      onSaved(label);
    } catch (e: any) { onSaved('Failed: ' + String(e?.message || '')); }
    finally { setBusy(false); }
  };

  if (!data) return <Loading />;
  const options = data.system_settings_options || DEFAULT_SYSTEM_OPTIONS;

  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.twoCol}>
      {/* FEATURE FLAGS */}
      <View style={[s.card, { flex: 1, minWidth: 320 }]}>
        <Text style={s.sectionLabel}>FEATURE FLAGS</Text>
        <View style={{ marginTop: 14, gap: 4 }}>
          {data.feature_flags.map((f: any) => (
            <View key={f.key} style={s.toggleRow}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <Text style={s.toggleTitle} numberOfLines={1}>{f.label}</Text>
                <Text style={s.toggleDesc}>{f.description}</Text>
              </View>
              <Switch
                value={!!f.value}
                onValueChange={(v) => toggleFlag(f.key, v)}
                trackColor={{ false: 'rgba(255,255,255,0.10)', true: GRAD_TO }}
                thumbColor={f.value ? '#fff' : '#ccc'}
                {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
              />
            </View>
          ))}
        </View>
      </View>

      {/* SYSTEM SETTINGS + DANGER ZONE */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <Text style={s.sectionLabel}>SYSTEM SETTINGS</Text>
          <View style={{ marginTop: 12 }}>
            {data.system_settings.map((it: any, idx: number) => {
              const opts = options[it.key] || DEFAULT_SYSTEM_OPTIONS[it.key] || [];
              const isSecret = /secret|password/i.test(String(it.key));
              const displayValue = it.value || (opts.length === 0 ? 'Add value' : 'Select');
              return (
                <View key={it.key} style={[s.systemRow, idx === data.system_settings.length - 1 ? { borderBottomWidth: 0 } : null]}>
                  <Text style={s.toggleTitle} numberOfLines={1}>{it.label}</Text>
                  <Pressable
                    onPress={() => setPickerSetting({
                      key: it.key,
                      label: it.label,
                      value: it.value || '',
                      type: it.type,
                      help: it.help,
                      options: opts,
                    })}
                    style={({ hovered }: any) => [s.selectBtn, hovered && Platform.OS === 'web' ? { borderColor: 'rgba(251,146,60,0.60)' } : null]}
                  >
                    <Text style={[s.selectValue, !it.value ? { color: SAC.dim } : null]} numberOfLines={1}>
                      {isSecret && it.value ? '••••••••••••' : displayValue}
                    </Text>
                    <View style={{ opacity: 0.6 }}>
                      <ChevronRight size={12} color={SAC.muted} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[s.card, { borderColor: 'rgba(239,68,68,0.30)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color={SAC.red} />
            <Text style={[s.sectionLabel, { color: SAC.red }]}>DANGER ZONE</Text>
          </View>
          <View style={{ gap: 10, marginTop: 14 }}>
            <DangerBtn
              icon={RotateCcw}
              label="Reset all platform settings"
              loading={confirm === 'platform-controls/reset' && busy}
              onConfirm={() => dangerAction('platform-controls/reset', 'Settings reset to defaults')}
            />
            <DangerBtn
              icon={Trash2}
              label="Wipe analytics history"
              loading={confirm === 'analytics/wipe' && busy}
              onConfirm={() => dangerAction('analytics/wipe', 'Analytics cleared')}
            />
            <DangerBtn
              icon={KeyRound}
              label="Rotate JWT signing key"
              loading={confirm === 'security/rotate-jwt' && busy}
              onConfirm={() => dangerAction('security/rotate-jwt', 'JWT key rotated')}
            />
          </View>
        </View>
      </View>

      {pickerSetting && (
        <SettingPickerModal
          setting={pickerSetting}
          onSelect={(value) => saveSetting(pickerSetting.key, value)}
          onClose={() => setPickerSetting(null)}
        />
      )}
    </Animated.View>
  );
}

function SettingPickerModal({ setting, onSelect, onClose }: {
  setting: {
    key: string;
    label: string;
    value: string;
    type?: string;
    help?: string;
    options: { value: string; label: string }[];
  };
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const isTextInput = (setting.options || []).length === 0;
  const isPassword = /secret|password/i.test(setting.key || '');
  const [textValue, setTextValue] = useState(setting.value || '');
  const [showPwd, setShowPwd] = useState(false);
  const inputPlaceholder = isPassword ? 'Paste secret value' : 'Paste client ID';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.pickerBackdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation?.()}>
          <Animated.View entering={FadeInDown.duration(220)} style={s.pickerCard}>
            <LinearGradient colors={GRAD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerHero}>
              <View style={s.pickerIcon}>
                {isTextInput ? <KeyRound size={16} color={GRAD_TO} /> : <Sliders size={16} color={GRAD_TO} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pickerTitle}>{setting.label}</Text>
                <Text style={s.pickerSub}>
                  {isTextInput ? 'Enter and save this platform credential' : 'Select an option to update this setting'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>
            {isTextInput ? (
              <>
                <View style={s.credentialBody}>
                  {!!setting.help && <Text style={s.credentialHelp}>{setting.help}</Text>}
                  <View>
                    <Text style={s.credentialLabel}>{setting.label}</Text>
                    <View style={s.credentialInputWrap}>
                      <TextInput
                        style={s.credentialInput}
                        value={textValue}
                        onChangeText={setTextValue}
                        placeholder={inputPlaceholder}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        secureTextEntry={isPassword && !showPwd}
                        autoFocus
                        multiline={false}
                      />
                      {isPassword && (
                        <Pressable onPress={() => setShowPwd(!showPwd)} style={s.iconOnlyBtn}>
                          {showPwd ? <EyeOff size={18} color="rgba(255,255,255,0.6)" /> : <Eye size={18} color="rgba(255,255,255,0.6)" />}
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.modalFooter}>
                  <Pressable onPress={onClose} style={s.secondaryBtn}>
                    <Text style={s.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                  <GradientButton onPress={() => onSelect(textValue)}>
                    <Check size={14} color="#fff" />
                    <Text style={s.primaryBtnText}>Save credential</Text>
                  </GradientButton>
                </View>
              </>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 12, gap: 6 }}>
                {setting.options.map((opt) => {
                  const isSelected = opt.value === setting.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => { onSelect(opt.value); onClose(); }}
                      style={[s.pickerOption, isSelected && s.pickerOptionActive]}
                    >
                      <View style={[s.pickerOptionRadio, isSelected && { borderColor: GRAD_TO, backgroundColor: GRAD_TO + '22' }]}>
                        {isSelected && <View style={s.pickerRadioDot} />}
                      </View>
                      <Text style={[s.pickerOptionText, isSelected && { color: GRAD_TO, fontFamily: FONTS.xbold }]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Check size={13} color={GRAD_TO} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DangerBtn({ icon: Icon, label, loading, onConfirm }: { icon: any; label: string; loading?: boolean; onConfirm: () => void }) {
  return (
    <Pressable
      onPress={onConfirm}
      disabled={loading}
      style={({ hovered }: any) => [
        s.dangerBtn,
        hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(239,68,68,0.10)' } : null,
        loading ? { opacity: 0.6 } : null,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={SAC.red} />
      ) : (
        <Icon size={13} color={SAC.red} />
      )}
      <Text style={s.dangerBtnText}>{label}</Text>
      <View style={{ flex: 1 }} />
      <ChevronRight size={13} color={SAC.red} />
    </Pressable>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 3 — Integrations  (with Connect API-key modal)
 * ═══════════════════════════════════════════════════════════════ */
function IntegrationsTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [groups, setGroups] = useState<{ category: string; items: Tool[] }[]>([]);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [connectTool, setConnectTool] = useState<Tool | null>(null);
  const [stats, setStats] = useState({ installed: 0, available: 0 });
  const [query, setQuery] = useState('');
  const [popularOnly, setPopularOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await request<any>('/marketplace/tools');
      setGroups(r?.groups || []);
      setStats({ installed: r?.installed_count || 0, available: r?.available_count || 0 });
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const disconnect = async (toolId: string) => {
    setBusyId(toolId);
    try {
      await request(`/marketplace/tools/${toolId}`, { method: 'DELETE' });
      onSaved('Disconnected');
      await load();
    } finally { setBusyId(null); }
  };

  const onConnected = async () => {
    setConnectTool(null);
    onSaved('Connected');
    await load();
  };

  // Filter pipeline: category → popular toggle → search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => filter === 'All' || g.category === filter)
      .map((g) => ({
        category: g.category,
        items: g.items.filter((t) => {
          if (popularOnly && !t.popular) return false;
          if (q && !`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)) return false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, filter, query, popularOnly]);

  const cats = ['All', ...groups.map((g) => g.category)];
  const totalShown = filtered.reduce((n, g) => n + g.items.length, 0);
  const popularCount = groups.reduce(
    (n, g) => n + g.items.filter((t) => t.popular).length, 0,
  );

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><Plug size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Integrations</Text>
              <Text style={s.cardSub}>
                {stats.installed} of {stats.available} tools connected
                {(query || popularOnly || filter !== 'All') ? ` · showing ${totalShown}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Search + popular toggle */}
        <View style={s.searchRow}>
          <View style={s.searchWrap}>
            <Search size={13} color={SAC.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search 60+ integrations…"
              placeholderTextColor={SAC.dim}
              autoCapitalize="none"
              autoCorrect={false}
              style={s.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <X size={13} color={SAC.muted} />
              </Pressable>
            )}
          </View>
          {popularCount > 0 && (
            <Pressable
              onPress={() => setPopularOnly(!popularOnly)}
              style={[s.popularToggle, popularOnly && s.popularToggleActive]}
            >
              <Sparkles size={11} color={popularOnly ? GRAD_TO : SAC.muted} />
              <Text style={[s.popularToggleText, popularOnly && { color: GRAD_TO }]}>
                Popular {popularOnly ? `(${popularCount})` : ''}
              </Text>
            </Pressable>
          )}
        </View>

<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {cats.map((c) => {
            const active = c === filter;
            return active ? (
              <View key={c} style={s.catPillActive}>
                <Text style={s.catPillTextActive}>{c}</Text>
              </View>
            ) : (
              <Pressable key={c} onPress={() => setFilter(c)} style={s.catPill}>
                <Text style={s.catPillText}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Search size={20} color={SAC.muted} />
            <Text style={s.emptyTitle}>No tools match your search</Text>
            <Text style={s.emptySub}>
              Try clearing filters or searching for a different name (e.g. "ChatGPT", "Stripe", "Notion").
            </Text>
            {(query || popularOnly || filter !== 'All') && (
              <Pressable onPress={() => { setQuery(''); setPopularOnly(false); setFilter('All'); }} style={s.clearBtn}>
                <Text style={s.clearBtnText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 18 }}>
            {filtered.map((g) => (
              <View key={g.category}>
                {filter === 'All' && <Text style={s.catLabel}>{g.category.toUpperCase()}</Text>}
                <View style={s.toolGrid}>
                  {g.items.map((t) => (
                    <ToolCard
                      key={t.id} tool={t}
                      busy={busyId === t.id}
                      onConnect={() => setConnectTool(t)}
                      onDisconnect={() => disconnect(t.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <ConnectModal tool={connectTool} onClose={() => setConnectTool(null)} onConnected={onConnected} />
    </Animated.View>
  );
}

function ToolCard({ tool, busy, onConnect, onDisconnect }: {
  tool: Tool; busy: boolean; onConnect: () => void; onDisconnect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const copyWebhook = async () => {
    if (!tool.webhook_url) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(tool.webhook_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };
  const credEntries = tool.installed && tool.credentials_masked
    ? Object.entries(tool.credentials_masked).filter(([_, v]) => v)
    : [];
  return (
    <View style={s.toolCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[s.toolIcon, { backgroundColor: tool.tint + '22', borderColor: tool.tint + '55' }]}>
          <MaterialCommunityIcons name={tool.icon as any} size={20} color={tool.tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.toolName} numberOfLines={1}>{tool.name}</Text>
          {tool.installed ? (
            <View style={s.connectedPill}>
              <View style={s.connectedDot} />
              <Text style={s.connectedPillText}>Connected</Text>
            </View>
          ) : (
            <View style={s.disconnectedPill}>
              <Text style={s.disconnectedPillText}>Disconnected</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={s.toolDesc} numberOfLines={2}>{tool.description}</Text>
      {tool.installed && tool.webhook_url ? (
        <Pressable onPress={copyWebhook} style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.10)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)' }}>
          <Text style={{ color: '#93C5FD', fontFamily: FONTS.semi, fontSize: 10.5, marginBottom: 4 }}>
            {copied ? 'Copied!' : 'Webhook URL (copy this to the provider dashboard)'}
          </Text>
          <Text style={{ color: '#94A3B8', fontFamily: FONTS.med, fontSize: 10 }} numberOfLines={1}>
            {tool.webhook_url}
          </Text>
        </Pressable>
      ) : null}
      {credEntries.length > 0 && (
        <Pressable
          onPress={() => setShowCreds(!showCreds)}
          style={{ marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border }}
        >
          <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 10.5 }}>
            {showCreds ? 'Hide saved credentials' : 'View saved credentials'}
          </Text>
          {showCreds && (
            <View style={{ marginTop: 8, gap: 4 }}>
              {credEntries.map(([key, val]) => (
                <View key={key} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10, minWidth: 110 }}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={{ color: '#E2E8F0', fontFamily: FONTS.med, fontSize: 10, flex: 1 }} numberOfLines={1}>{val}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      )}
      <View style={{ flex: 1 }} />
      {tool.installed ? (
        <Pressable onPress={onDisconnect} disabled={busy} style={[s.toolBtnSec, busy && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator size="small" color={SAC.muted} /> : (
            <Text style={s.toolBtnSecText}>Disconnect</Text>
          )}
        </Pressable>
      ) : (
        <Pressable onPress={onConnect} disabled={busy} style={[{ marginTop: 10 }, busy && { opacity: 0.5 }]}>
          <LinearGradient colors={[GRAD_FROM, GRAD_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.toolBtnGrad}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Plug size={12} color="#fff" />
                <Text style={s.toolBtnText}>Connect</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      )}
      {tool.popular && (
        <LinearGradient colors={[GRAD_FROM, GRAD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.popPill}>
          <Text style={s.popPillText}>POPULAR</Text>
        </LinearGradient>
      )}
    </View>
  );
}

function ConnectModal({ tool, onClose, onConnected }: {
  tool: Tool | null; onClose: () => void; onConnected: () => void;
}) {
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tool) {
      const next: Record<string, string> = {};
      setCreds(next); setError(null); setShowSecret({}); setTest(null);
    }
  }, [tool]);

  if (!tool) return null;

  const fields = tool.auth_fields || [];

  const runTest = async () => {
    setTesting(true); setTest(null); setError(null);
    try {
      const r = await request<any>('/marketplace/test', {
        method: 'POST',
        body: { tool_id: tool.id, credentials: creds },
      });
      setTest({ ok: !!r?.ok, message: r?.message || (r?.ok ? 'Verified' : 'Test failed') });
    } catch (e: any) {
      setTest({ ok: false, message: String(e?.message || e) });
    } finally { setTesting(false); }
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await request('/marketplace/install', {
        method: 'POST',
        body: { tool_id: tool.id, credentials: creds },
      });
      onConnected();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          <LinearGradient colors={GRAD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            <View style={[s.toolIcon, { width: 44, height: 44, backgroundColor: tool.tint + '22', borderColor: tool.tint + '55' }]}>
              <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle}>Connect {tool.name}</Text>
              <Text style={s.modalSub}>{tool.description}</Text>
            </View>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={s.helpBox}>
              <KeyRound size={13} color={GRAD_TO} />
              <Text style={s.helpText}>
                Enter your {tool.name} credentials below. Keys are stored encrypted and never shared.
                You can disconnect at any time.
              </Text>
            </View>
            {tool.id === 'postal' ? (
              <View style={s.helpBox}>
                <Text style={s.helpText}>
                  After you connect, copy the webhook URL from the Postal card and paste it in Postal → Webhooks.
                  The ?token= value must match the Webhook secret saved here. Leave the secret blank to auto-generate.
                </Text>
              </View>
            ) : null}

            {fields.length === 0 ? (
              <Text style={s.muted}>No credentials required — click Connect to enable.</Text>
            ) : fields.map((f) => {
              const isPwd = f.type === 'password';
              const show = !!showSecret[f.key];
              return (
                <View key={f.key} style={{ gap: 6 }}>
                  <Text style={s.modalLabel}>{f.label}</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      value={creds[f.key] || ''}
                      onChangeText={(v) => setCreds({ ...creds, [f.key]: v })}
                      placeholder={f.placeholder || ''}
                      placeholderTextColor={SAC.dim}
                      secureTextEntry={isPwd && !show}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={s.input}
                    />
                    {isPwd && (
                      <Pressable onPress={() => setShowSecret({ ...showSecret, [f.key]: !show })} style={s.inputIconBtn}>
                        {show ? <EyeOff size={14} color={SAC.muted} /> : <Eye size={14} color={SAC.muted} />}
                      </Pressable>
                    )}
                  </View>
                  {f.help && <Text style={s.helpInline}>{f.help}</Text>}
                </View>
              );
            })}

            <Pressable style={s.docLink} onPress={() => {
              const url = TOOL_DOCS[tool.id];
              if (url) Linking.openURL(url).catch(() => {});
            }}>
              <ExternalLink size={11} color={GRAD_TO} />
              <Text style={s.docLinkText}>
                {TOOL_DOCS[tool.id] ? `Open ${tool.name} dashboard to get credentials` : `How to get ${tool.name} API credentials`}
              </Text>
            </Pressable>

            {error && <Text style={s.errorText}>{error}</Text>}
            {test && (
              <View style={[s.testResult, test.ok ? s.testResultOk : s.testResultErr]}>
                {test.ok ? <CheckCircle2 size={13} color="#22C55E" /> : <AlertTriangle size={13} color="#FCA5A5" />}
                <Text style={[s.testResultText, test.ok ? { color: '#22C55E' } : { color: '#FCA5A5' }]}>
                  {test.message}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={runTest} disabled={testing || busy} style={[s.secondaryBtn, (testing || busy) && { opacity: 0.6 }]}>
              <Sparkles size={12} color={SAC.muted} />
              <Text style={s.secondaryBtnText}>{testing ? 'Testing…' : 'Test connection'}</Text>
            </Pressable>
            <GradientButton onPress={submit} loading={busy}>
              <Plug size={13} color="#fff" />
              <Text style={s.primaryBtnText}>Connect {tool.name}</Text>
            </GradientButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 4 — Roles & Permissions
 * ═══════════════════════════════════════════════════════════════ */
function RolesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<PermissionGroup[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [del, setDel] = useState<Role | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([
        request<{ roles: Role[] }>('/admin/roles'),
        request<{ groups: PermissionGroup[] }>('/admin/permissions'),
      ]);
      setRoles(r?.roles || []); setPerms(p?.groups || []);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  // Map role keys → initials + tint
  const tintFor = (key: string) => {
    const palette: Record<string, string> = {
      super_admin:  '#FB923C', // orange
      platform_admin: '#3B82F6', // blue
      college_admin:'#10B981', // green
      support:      '#A78BFA', // purple
      mentor:       '#06B6D4', // cyan
    };
    return palette[key] || '#94A3B8';
  };
  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Drill-in mode
  if (selectedId) {
    return (
      <RoleDetailPanel
        roleId={selectedId}
        tintFor={tintFor}
        initials={initials}
        onBack={() => setSelectedId(null)}
        onEdit={(r) => { setSelectedId(null); setEditing(r); }}
        onSaved={onSaved}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><Shield size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Roles & Permissions</Text>
              <Text style={s.cardSub}>{roles.length} roles · Fine-grained access control</Text>
            </View>
          </View>
          <GradientButton onPress={() => setCreating(true)}>
            <Plus size={14} color="#fff" />
            <Text style={s.primaryBtnText}>Create New Role</Text>
          </GradientButton>
        </View>

        <View style={s.roleGrid}>
          {roles.map((r) => (
            <Animated.View key={r.id} entering={FadeInUp.duration(180)} style={s.roleCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.roleBadge, { backgroundColor: tintFor(r.key) + '22', borderColor: tintFor(r.key) + '66' }]}>
                  <Text style={[s.roleBadgeText, { color: tintFor(r.key) }]}>{initials(r.name)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.roleName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.muted}>{r.user_count} user{r.user_count === 1 ? '' : 's'}</Text>
                </View>
                {r.is_system && (
                  <View style={s.sysPill}><Text style={s.sysPillText}>SYSTEM</Text></View>
                )}
              </View>
              <View style={{ gap: 6, marginTop: 12, marginBottom: 12 }}>
                {(r.permissions || []).slice(0, 4).map((p) => (
                  <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Check size={11} color={GRAD_TO} />
                    <Text style={s.permLine}>{p.replace(/\./g, ' · ').replace(/_/g, ' ')}</Text>
                  </View>
                ))}
                {(r.permissions || []).length > 4 && (
                  <Text style={[s.muted, { fontSize: 10.5 }]}>+ {r.permissions.length - 4} more</Text>
                )}
              </View>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => setSelectedId(r.id)} style={s.editBtnFull}>
                  <Text style={s.editBtnText}>View</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(r)} style={s.editBtnFull}>
                  <Text style={s.editBtnText}>Edit</Text>
                </Pressable>
                {!r.is_system && (
                  <Pressable onPress={() => setDel(r)} style={s.iconDangerBtn}>
                    <Trash2 size={13} color={SAC.red} />
                  </Pressable>
                )}
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      <RoleModal
        visible={creating || !!editing}
        role={editing}
        permissionGroups={perms}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { onSaved(editing ? 'Role updated' : 'Role created'); setCreating(false); setEditing(null); load(); }}
      />
      <DeleteRoleModal role={del} onClose={() => setDel(null)} onDeleted={() => { onSaved('Role deleted'); setDel(null); load(); }} />
    </Animated.View>
  );
}

function RoleModal({ visible, role, permissionGroups, onClose, onSaved }: {
  visible: boolean; role: Role | null; permissionGroups: PermissionGroup[];
  onClose: () => void; onSaved: () => void;
}) {
  // moved below RoleDetailPanel
  return <RoleModalImpl visible={visible} role={role} permissionGroups={permissionGroups} onClose={onClose} onSaved={onSaved} />;
}

/* ─── Role detail drill-in panel ────────────────────────────────────
 * Replaces the role grid in-place when a card's "View" is tapped.
 * Shows: full description, three stat tiles (Users / Permissions /
 * Type), grouped permission matrix with granted/missing checks, and
 * the list of users currently assigned to this role. */
function RoleDetailPanel({ roleId, tintFor, initials, onBack, onEdit, onSaved }: {
  roleId: string;
  tintFor: (k: string) => string;
  initials: (n: string) => string;
  onBack: () => void;
  onEdit: (r: any) => void;
  onSaved: (s?: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const r = await request<any>(`/admin/roles/${roleId}`);
      setData(r);
    } catch (e: any) {
      setErr(e?.message || 'Could not load role');
    } finally {
      setBusy(false);
    }
  }, [roleId]);
  useEffect(() => { load(); }, [load]);

  if (busy) return <Loading />;
  if (err)  return <Text style={s.errorText}>{err}</Text>;
  if (!data) return null;

  const tint = tintFor(data.key);
  const totalPerms = (data.permission_groups || []).reduce(
    (n: number, g: any) => n + (g.permissions || []).length,
    0,
  );

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      {/* Header */}
      <View style={s.roleDetailHead}>
        <Pressable onPress={onBack} style={s.roleDetailBack}>
          <ArrowLeft size={13} color={SAC.text} />
          <Text style={s.roleDetailBackText}>Back</Text>
        </Pressable>
        <View style={[s.roleBadge, { backgroundColor: tint + '22', borderColor: tint + '66' }]}>
          <Text style={[s.roleBadgeText, { color: tint }]}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.roleDetailTitle}>{data.name}</Text>
          <Text style={s.roleDetailSub}>{data.description || 'No description provided.'}</Text>
        </View>
        {!data.is_system && (
          <GradientButton onPress={() => onEdit(data)}>
            <Pencil size={13} color="#fff" />
            <Text style={s.primaryBtnText}>Edit role</Text>
          </GradientButton>
        )}
      </View>

      {/* Stat tiles */}
      <View style={s.roleStatRow}>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>USERS WITH THIS ROLE</Text>
          <Text style={s.roleStatValue}>{data.user_count || 0}</Text>
        </View>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>PERMISSIONS GRANTED</Text>
          <Text style={s.roleStatValue}>{(data.permissions || []).length} / {totalPerms}</Text>
        </View>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>TYPE</Text>
          <Text style={s.roleStatValue}>{data.is_system ? 'System' : 'Custom'}</Text>
        </View>
      </View>

      {/* Permission groups */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Permission matrix</Text>
        <Text style={s.cardSub}>Grouped view of every permission this role can access.</Text>
        <View style={{ gap: 12, marginTop: 14 }}>
          {(data.permission_groups || []).map((g: any) => (
            <View key={g.key} style={s.permGroup}>
              <Text style={s.permGroupTitle}>{g.label}</Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                {(g.permissions || []).map((p: any) => (
                  <View key={p.key} style={s.permRow}>
                    <View style={[s.checkbox, p.granted && { backgroundColor: tint, borderColor: tint }]}>
                      {p.granted && <Check size={11} color="#fff" />}
                    </View>
                    <Text style={[s.permLabel, !p.granted && { color: SAC.muted }]}>{p.label}</Text>
                    <Text style={s.permId}>{p.key}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Users with this role */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><UsersIcon size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Users with this role</Text>
              <Text style={s.cardSub}>{data.user_count || 0} user{data.user_count === 1 ? '' : 's'} assigned</Text>
            </View>
          </View>
        </View>
        {(!data.users || data.users.length === 0) ? (
          <Text style={[s.muted, { marginTop: 12 }]}>No users currently assigned to this role.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 12 }}>
            {data.users.map((u: any) => (
              <View key={u.id} style={s.roleUserRow}>
                <View style={s.roleUserAv}>
                  <Text style={{ color: '#FB923C', fontFamily: FONTS.xbold, fontSize: 11 }}>
                    {(u.name || u.email || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.roleUserName} numberOfLines={1}>{u.name}</Text>
                  <Text style={s.roleUserMeta} numberOfLines={1}>{u.email}</Text>
                </View>
                {u.last_login && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color={SAC.dim} />
                    <Text style={s.roleUserMeta}>{new Date(u.last_login).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function RoleModalLegacy_unused_marker() { return null; }
function RoleModalImpl({ visible, role, permissionGroups, onClose, onSaved }: {
  visible: boolean; role: Role | null; permissionGroups: PermissionGroup[];
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!role;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(role?.name || ''); setDescription(role?.description || '');
      setPermissions(new Set(role?.permissions || [])); setError(null);
    }
  }, [visible, role]);

  const togglePerm = (id: string) => setPermissions((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      const body = { name: name.trim(), description: description.trim(), permissions: Array.from(permissions) };
      if (isEdit && role) {
        await request(`/admin/roles/${role.id}`, { method: 'PATCH', body });
      } else {
        await request('/admin/roles', { method: 'POST', body });
      }
      onSaved();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          <LinearGradient colors={GRAD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            <View style={[s.toolIcon, { width: 40, height: 40, backgroundColor: 'rgba(251,146,60,0.20)', borderColor: 'rgba(251,146,60,0.40)' }]}>
              <Shield size={20} color={GRAD_TO} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle}>{isEdit ? 'Edit role' : 'Create new role'}</Text>
              <Text style={s.modalSub}>{isEdit ? 'Adjust permissions and metadata.' : 'Define a custom permission set for your team.'}</Text>
            </View>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Role name</Text>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="e.g. Content Reviewer" placeholderTextColor={SAC.dim}
                style={s.input}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Description</Text>
              <TextInput
                value={description} onChangeText={setDescription}
                placeholder="What can this role do? (optional)" placeholderTextColor={SAC.dim}
                style={[s.input, { minHeight: 64 }]} multiline
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Permissions ({permissions.size} selected)</Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {permissionGroups.map((g) => (
                  <View key={g.group} style={s.permGroup}>
                    <Text style={s.permGroupTitle}>{g.group.toUpperCase()}</Text>
                    <View style={{ gap: 4, marginTop: 6 }}>
                      {g.items.map((p) => {
                        const on = permissions.has(p.id);
                        return (
                          <Pressable key={p.id} onPress={() => togglePerm(p.id)} style={s.permRow}>
                            <View style={[s.checkbox, on && { backgroundColor: GRAD_TO, borderColor: GRAD_TO }]}>
                              {on && <Check size={11} color="#fff" />}
                            </View>
                            <Text style={s.permLabel}>{p.label}</Text>
                            <Text style={s.permId}>{p.id}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {error && <Text style={s.errorText}>{error}</Text>}
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <GradientButton onPress={save} loading={saving}>
              <Check size={14} color="#fff" />
              <Text style={s.primaryBtnText}>{isEdit ? 'Save changes' : 'Create role'}</Text>
            </GradientButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DeleteRoleModal({ role, onClose, onDeleted }: {
  role: Role | null; onClose: () => void; onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!role) return null;
  const confirm = async () => {
    setBusy(true);
    try { await request(`/admin/roles/${role.id}`, { method: 'DELETE' }); onDeleted(); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={[s.modalCard, { maxWidth: 440 }]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Delete role?</Text>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </View>
          <View style={{ padding: 20, gap: 10 }}>
            <Text style={s.modalLabel}>
              You're about to delete <Text style={{ color: '#fff', fontFamily: FONTS.xbold }}>{role.name}</Text>.
            </Text>
            <Text style={s.muted}>
              {role.user_count > 0
                ? `${role.user_count} user${role.user_count === 1 ? '' : 's'} will lose its permissions.`
                : 'No users are assigned to this role.'}
            </Text>
          </View>
          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} disabled={busy} style={[s.destructiveBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Trash2 size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Delete role</Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 5 — Notifications
 * ═══════════════════════════════════════════════════════════════ */
function NotificationsTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [prefs, setPrefs] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    try { const r = await request<any>('/admin/notifications/preferences'); setPrefs(r?.preferences || []); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (key: string, channel: string, value: boolean) => {
    if (!prefs) return;
    setPrefs(prefs.map((p) => p.key === key ? { ...p, [channel]: value } : p));
    try { await request('/admin/notifications/preferences', { method: 'PATCH', body: { key, channel, value } }); onSaved('Saved'); }
    catch (e: any) { onSaved(e?.message || 'Failed to save preference'); }
  };

  if (!prefs) return <Loading />;

  const channels: { key: 'email' | 'push' | 'sms' | 'inapp'; label: string }[] = [
    { key: 'email', label: 'Email' }, { key: 'push', label: 'Push' },
    { key: 'sms', label: 'SMS' },     { key: 'inapp', label: 'In-app' },
  ];

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><Bell size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Notifications</Text>
              <Text style={s.cardSub}>Choose which events you want delivered, and where.</Text>
            </View>
          </View>
        </View>

        {/* Header row */}
        <View style={s.notifHeadRow}>
          <Text style={[s.notifHead, { flex: 1 }]}>Event</Text>
          {channels.map((c) => <Text key={c.key} style={[s.notifHead, { width: 60, textAlign: 'center' }]}>{c.label}</Text>)}
        </View>

        {prefs.map((p, i) => (
          <View key={p.key} style={[s.notifRow, i === prefs.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={s.toggleTitle}>{p.label}</Text>
              <Text style={s.toggleDesc}>{p.description}</Text>
            </View>
            {channels.map((c) => (
              <View key={c.key} style={{ width: 60, alignItems: 'center' }}>
                <Switch
                  value={!!p[c.key]}
                  onValueChange={(v) => toggle(p.key, c.key, v)}
                  trackColor={{ false: 'rgba(255,255,255,0.10)', true: GRAD_TO }}
                  thumbColor={p[c.key] ? '#fff' : '#ccc'}
                  {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 6 — Security
 * ═══════════════════════════════════════════════════════════════ */
async function collectSessionHints() {
  const hints: Record<string, any> = {};
  try {
    if (typeof navigator !== 'undefined') {
      hints.language = navigator.language;
      hints.platform = (navigator as any).userAgentData?.platform || navigator.platform;
      hints.hardware_concurrency = (navigator as any).hardwareConcurrency;
    }
    if (typeof Intl !== 'undefined') {
      hints.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    if (typeof window !== 'undefined' && window.screen) {
      hints.screen = `${window.screen.width}x${window.screen.height}`;
    }
    let cached = '';
    try { cached = sessionStorage.getItem('sa.public_ip') || ''; } catch {}
    if (cached) {
      hints.public_ip = cached;
    } else {
      const ctrl = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
        ? AbortSignal.timeout(2500)
        : undefined;
      const r = await fetch('https://api.ipify.org?format=json', { signal: ctrl as any });
      const d = await r.json();
      if (d?.ip) {
        hints.public_ip = d.ip;
        try { sessionStorage.setItem('sa.public_ip', d.ip); } catch {}
      }
    }
  } catch { /* geo still resolved server-side from proxy headers */ }
  return hints;
}

function liveAgo(iso?: string) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (secs < 20) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function SecurityTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [twoFa, setTwoFa] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [qrData, setQrData] = useState<{ qr_base64: string; secret: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showDisablePwd, setShowDisablePwd] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [conf, setConf] = useState('');
  const [showCur, setShowCur] = useState(false); const [showNext, setShowNext] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveAt, setLiveAt] = useState<Date | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);

  const load = useCallback(async () => {
    setLiveBusy(true);
    try {
      const hints = await collectSessionHints();
      await request('/admin/security/sessions/record', { method: 'POST', body: hints }).catch(() => {});
      const [sessR, logR, analysisR, tdR] = await Promise.all([
        request<any>(`/admin/security/sessions${showAllSessions ? '?all=true' : ''}`),
        request<any>('/admin/security/access-log'),
        request<any>('/admin/security/sessions/analysis').catch(() => null),
        request<any>('/admin/security/trusted-devices').catch(() => null),
      ]);
      setSessions(sessR?.sessions || []);
      setSessionTotal(sessR?.total || 0);
      setLog(logR?.entries || []);
      setAnalysis(analysisR || null);
      setTrustedDevices(tdR?.trusted_devices || []);
      setLiveAt(new Date());
    } catch {}
    finally { setLiveBusy(false); }
  }, [showAllSessions]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      try {
        const r = await request<{ enabled: boolean }>('/admin/security/2fa/status');
        setTwoFa(r?.enabled ?? false);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    const id = setInterval(() => { load(); }, 60000);
    const onFocus = () => { load(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      clearInterval(id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [load]);

  const onToggle2fa = async (value: boolean) => {
    if (value) {
      // Enabling — generate QR
      setTwoFaLoading(true);
      try {
        const r = await request<{ qr_base64: string; secret: string }>('/admin/security/2fa/generate', { method: 'POST' });
        setQrData(r);
        setOtp('');
        setOtpError(null);
      } catch { onSaved('Failed to generate 2FA secret'); setTwoFaLoading(false); return; }
      setTwoFaLoading(false);
    } else {
      // Disabling — show password prompt
      setShowDisablePwd(true);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setOtpError('Enter a 6-digit code from your authenticator app'); return; }
    setTwoFaLoading(true);
    setOtpError(null);
    try {
      await request('/admin/security/2fa/enable', { method: 'POST', body: { token: otp } });
      setQrData(null);
      setTwoFa(true);
      setOtp('');
      onSaved('2FA enabled');
    } catch (e: any) {
      setOtpError(String(e?.message || e));
    } finally { setTwoFaLoading(false); }
  };

  const disable2fa = async () => {
    if (!disablePwd.trim()) return;
    setTwoFaLoading(true);
    try {
      await request('/admin/security/2fa/disable', { method: 'POST', body: { password: disablePwd } });
      setShowDisablePwd(false);
      setDisablePwd('');
      setTwoFa(false);
      onSaved('2FA disabled');
    } catch { onSaved('Failed to disable 2FA'); }
    finally { setTwoFaLoading(false); }
  };

  const cancel2fa = () => {
    setQrData(null);
    setOtp('');
    setOtpError(null);
    setShowDisablePwd(false);
    setDisablePwd('');
  };

  const updatePwd = async () => {
    setPwdErr(null);
    if (next.length < 12) { setPwdErr('Password must be at least 12 characters'); return; }
    if (next !== conf) { setPwdErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      await request('/admin/security/password', { method: 'PUT', body: { current_password: cur, new_password: next } });
      setCur(''); setNext(''); setConf('');
      onSaved('Password updated');
    } catch (e: any) {
      setPwdErr(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    setSessions(sessions.filter((sx) => sx.id !== id));
    try { await request(`/admin/security/sessions/${id}`, { method: 'DELETE' }); onSaved('Session revoked'); }
    catch (e: any) { onSaved(e?.message || 'Failed to revoke session'); }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.twoCol}>
      {/* AUTHENTICATION */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <Text style={s.sectionLabel}>AUTHENTICATION</Text>
          <View style={[s.toggleRow, { marginTop: 14, paddingBottom: 14 }]}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={s.toggleTitle}>Two-Factor Authentication</Text>
              <Text style={s.toggleDesc}>{twoFa ? 'Active · OTP from authenticator app required at login' : 'Not configured — add extra security to your account'}</Text>
            </View>
            <Switch
              value={twoFa || !!qrData}
              onValueChange={onToggle2fa}
              disabled={twoFaLoading}
              trackColor={{ false: 'rgba(255,255,255,0.10)', true: GRAD_TO }}
              thumbColor={(twoFa || !!qrData) ? '#fff' : '#ccc'}
              {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
            />
          </View>

          {/* 2FA Setup — QR + OTP */}
          {qrData && (
            <View style={{ marginTop: 8, gap: 14, padding: 16, borderRadius: 12, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: 'rgba(251,146,60,0.25)' }}>
              <Text style={{ color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 13 }}>Set up authenticator</Text>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 }}>
                Scan this QR code with Google Authenticator, Authy, or any TOTP app. Then enter the 6-digit code below to verify.
              </Text>
              <View style={{ alignItems: 'center', padding: 10 }}>
                {Platform.OS === 'web' ? (
                  <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="2FA QR Code" style={{ width: 160, height: 160, borderRadius: 8 }} />
                ) : (
                  <Image source={{ uri: `data:image/png;base64,${qrData.qr_base64}` }} style={{ width: 160, height: 160, borderRadius: 8 }} />
                )}
              </View>
              <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, textAlign: 'center' }}>
                Key: {qrData.secret}
              </Text>
              <View style={{ gap: 8 }}>
                <Text style={s.modalLabel}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={SAC.dim}
                  maxLength={6}
                  keyboardType="number-pad"
                  autoFocus
                  style={[s.input, { textAlign: 'center', fontSize: 22, fontFamily: FONTS.xbold, letterSpacing: 8 }]}
                />
                {otpError && <Text style={s.errorText}>{otpError}</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Pressable onPress={cancel2fa} style={s.secondaryBtn}><Text style={s.secondaryBtnText}>Cancel</Text></Pressable>
                <GradientButton onPress={verifyOtp} loading={twoFaLoading}>
                  <Check size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Verify & Enable</Text>
                </GradientButton>
              </View>
            </View>
          )}

          {/* 2FA Disable Password Prompt */}
          {showDisablePwd && (
            <View style={{ marginTop: 8, gap: 10, padding: 16, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' }}>
              <Text style={{ color: SAC.red, fontFamily: FONTS.xbold, fontSize: 13 }}>Disable Two-Factor Authentication</Text>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>Enter your current password to confirm.</Text>
              <TextInput
                value={disablePwd}
                onChangeText={setDisablePwd}
                placeholder="Current password"
                placeholderTextColor={SAC.dim}
                secureTextEntry
                style={s.input}
              />
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Pressable onPress={cancel2fa} style={s.secondaryBtn}><Text style={s.secondaryBtnText}>Cancel</Text></Pressable>
                <Pressable onPress={disable2fa} disabled={twoFaLoading || !disablePwd.trim()} style={[s.destructiveBtn, (twoFaLoading || !disablePwd.trim()) && { opacity: 0.5 }]}>
                  {twoFaLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Disable 2FA</Text>}
                </Pressable>
              </View>
            </View>
          )}

          <Text style={[s.sectionLabel, { marginTop: 18 }]}>CHANGE PASSWORD</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <PasswordField icon={Lock} value={cur} onChange={setCur}
              placeholder="Current password" show={showCur} onToggle={() => setShowCur(!showCur)} />
            <PasswordField icon={Lock} value={next} onChange={setNext}
              placeholder="New password (min 12 chars)" show={showNext} onToggle={() => setShowNext(!showNext)} />
            <PasswordField icon={Lock} value={conf} onChange={setConf}
              placeholder="Confirm new password" show={showNext} onToggle={() => setShowNext(!showNext)} />
            {pwdErr && <Text style={s.errorText}>{pwdErr}</Text>}
            <GradientButton onPress={updatePwd} loading={busy}>
              <Check size={13} color="#fff" />
              <Text style={s.primaryBtnText}>Update Password</Text>
            </GradientButton>
          </View>
        </View>

        {/* ACCESS LOG */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={s.sectionLabel}>ACCESS LOG</Text>
            <Text style={[s.muted, { fontSize: 10.5 }]}>
              {liveBusy ? 'Refreshing…' : liveAt ? `Live · ${liveAt.toLocaleTimeString()}` : ''}
            </Text>
          </View>
          <View style={{ marginTop: 12, gap: 10 }}>
            {log.length === 0 && <Text style={s.muted}>No activity recorded yet. Open this page from a signed-in admin session to start the live log.</Text>}
            {log.map((it, i) => (
              <View key={`${it.at}-${i}`} style={s.logRow}>
                <View style={s.logDot} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.logAction}>{prettyAction(it.action)} {it.target && it.target !== 'self' && `: ${it.target}`}</Text>
                  <Text style={s.muted}>
                    {[it.ip, it.location, it.browser || it.device, it.at ? new Date(it.at).toLocaleString() : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ACTIVE SESSIONS + ANALYSIS */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={s.sectionLabel}>ACTIVE SESSIONS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[s.dotGreen, liveBusy && { backgroundColor: '#FBBF24' }]} />
              <Text style={[s.muted, { fontSize: 10.5 }]}>{liveBusy ? 'Updating' : 'Live · 12s'}</Text>
            </View>
          </View>
          <View style={{ marginTop: 12, gap: 8 }}>
            {sessions.length === 0 && <Text style={s.muted}>No sessions recorded yet.</Text>}
            {sessions.map((sess) => {
              const isMobile = /iphone|ipad|android|phone/i.test(`${sess.device || ''} ${sess.os || ''}`);
              const Icon = isMobile ? Smartphone : Monitor;
              const coords = (sess.lat != null && sess.lon != null && sess.lat !== 0)
                ? `${Number(sess.lat).toFixed(3)}, ${Number(sess.lon).toFixed(3)}`
                : '';
              return (
                <View key={sess.id} style={s.sessRow}>
                  <View style={[s.sessIcon, sess.current && { borderColor: GRAD_TO, backgroundColor: 'rgba(251,146,60,0.12)' }]}>
                    <Icon size={16} color={sess.current ? GRAD_TO : SAC.muted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={s.toggleTitle}>{sess.browser} · {sess.device}</Text>
                      {sess.os ? <Text style={s.muted}>{sess.os}</Text> : null}
                    </View>
                    <View style={{ gap: 2, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                        <MapPin size={11} color={SAC.muted} style={{ marginTop: 2 }} />
                        <Text style={[s.muted, { flex: 1 }]}>{sess.location}</Text>
                      </View>
                      {sess.ip ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Wifi size={11} color={SAC.muted} />
                          <Text style={s.muted}>IP {sess.ip}{sess.isp ? ` · ${sess.isp}` : ''}{sess.asn ? ` · ${sess.asn}` : ''}</Text>
                        </View>
                      ) : null}
                      {(sess.timezone || sess.language || sess.screen) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Globe size={11} color={SAC.muted} />
                          <Text style={s.muted}>
                            {[sess.timezone, sess.language, sess.screen, coords].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      ) : coords ? (
                        <Text style={s.muted}>{coords}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} color={SAC.muted} />
                        <Text style={s.muted}>Last active {liveAgo(sess.last_active_raw) || sess.last_active}</Text>
                      </View>
                    </View>
                  </View>
                  {sess.current ? (
                    <View style={s.activeChip}>
                      <View style={s.dotGreen} />
                      <Text style={s.activeChipText}>This device</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => revoke(sess.id)} style={s.revokeBtn}>
                      <Text style={s.revokeBtnText}>Revoke</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {sessionTotal > 5 && !showAllSessions && (
            <Pressable
              onPress={async () => {
                try {
                  const r = await request<any>('/admin/security/sessions?all=true');
                  if (r?.sessions) { setSessions(r.sessions); setShowAllSessions(true); }
                } catch (e: any) {
                  console.error('Failed to load all sessions', e);
                }
              }}
              style={[s.linkBtn, { alignSelf: 'center', marginTop: 8 }]}
            >
              <Text style={s.linkBtnText}>View all {sessionTotal} sessions →</Text>
            </Pressable>
          )}
          {showAllSessions && (
            <Pressable
              onPress={async () => {
                try {
                  const r = await request<any>('/admin/security/sessions');
                  if (r?.sessions) { setSessions(r.sessions); setShowAllSessions(false); }
                } catch (e: any) {
                  console.error('Failed to load sessions', e);
                }
              }}
              style={[s.linkBtn, { alignSelf: 'center', marginTop: 8 }]}
            >
              <Text style={s.linkBtnText}>Show last 5 only ↑</Text>
            </Pressable>
          )}
          <Pressable
            onPress={async () => {
              try {
                const hints = await collectSessionHints();
                const r = await request<any>('/admin/security/trusted-devices', { method: 'POST', body: hints });
                if (r?.trusted) {
                  const td = await request<any>('/admin/security/trusted-devices');
                  setTrustedDevices(td?.trusted_devices || []);
                }
              } catch {}
            }}
            style={[s.trustBtn, { marginTop: 10 }]}
          >
            <ShieldCheck size={12} color={GRAD_TO} />
            <Text style={s.trustBtnText}>Trust this device</Text>
          </Pressable>
        </View>

        {/* TRUSTED DEVICES */}
        {trustedDevices.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>TRUSTED DEVICES</Text>
            <Text style={[s.muted, { marginTop: 4, marginBottom: 10, fontSize: 11 }]}>These devices are exempt from automatic session expiry.</Text>
            <View style={{ gap: 6 }}>
              {trustedDevices.map((d) => (
                <View key={d.id} style={s.trustedRow}>
                  <View style={s.trustedIcon}>
                    <ShieldCheck size={13} color={SAC.green} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.toggleTitle}>{d.browser} · {d.device}</Text>
                    <Text style={s.muted}>{[d.location, d.ip && `IP ${d.ip}`, d.isp].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={s.muted}>{d.added_ago}</Text>
                  <Pressable
                    onPress={async () => {
                      try {
                        await request(`/admin/security/trusted-devices/${d.id}`, { method: 'DELETE' });
                        setTrustedDevices(trustedDevices.filter((td) => td.id !== d.id));
                      } catch {}
                    }}
                    style={s.revokeBtn}
                  >
                    <Text style={s.revokeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {analysis && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color={GRAD_TO} />
              <Text style={s.sectionLabel}>SESSION ANALYSIS</Text>
            </View>
            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <MiniStat icon={Monitor} label="Total sessions" value={String(analysis.total_sessions || 0)} />
                {Object.entries(analysis.device_breakdown || {}).map(([k, v]) => (
                  <MiniStat key={k} icon={Smartphone} label={k} value={String(v)} />
                ))}
              </View>
              {analysis.locations && analysis.locations.length > 0 && (
                <View>
                  <Text style={[s.sectionLabel, { marginBottom: 8 }]}>LOCATIONS</Text>
                  {analysis.locations.slice(0, 4).map((loc: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Globe size={11} color={SAC.muted} />
                      <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12 }}>{[loc.city, loc.country].filter(Boolean).join(', ') || 'Unknown'}</Text>
                      <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>{loc.count} session{loc.count === 1 ? '' : 's'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border }}>
      <Icon size={12} color={GRAD_TO} />
      <View>
        <Text style={{ color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }}>{value}</Text>
      </View>
    </View>
  );
}

function PasswordField({ icon: Icon, value, onChange, placeholder, show, onToggle }: {
  icon: any; value: string; onChange: (s: string) => void; placeholder: string;
  show: boolean; onToggle: () => void;
}) {
  return (
    <View style={[s.inputWrap, { paddingLeft: 10 }]}>
      <Icon size={13} color={SAC.muted} />
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={SAC.dim}
        secureTextEntry={!show}
        autoCapitalize="none" autoCorrect={false}
        style={[s.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingLeft: 8 }]}
      />
      <Pressable onPress={onToggle} style={s.inputIconBtn}>
        {show ? <EyeOff size={14} color={SAC.muted} /> : <Eye size={14} color={SAC.muted} />}
      </Pressable>
    </View>
  );
}

function prettyAction(a: string) {
  const map: Record<string, string> = {
    'session.login': 'Logged in',
    'session.seen': 'Session recorded',
    'session.revoked': 'Session revoked',
    'session.auto_revoked': 'Session auto-revoked',
    'trusted_device.added': 'Trusted this device',
    'trusted_device.removed': 'Removed trusted device',
    'security.password_changed': 'Changed password',
    'integration.connected': 'Connected integration',
    'integration.disconnected': 'Disconnected integration',
    'college.approved': 'Approved college',
    'payout.processed': 'Processed payout',
  };
  return map[a] || a.replace(/[._]/g, ' ');
}

/* ═════════════════════════════════════════════════════════════════
 * TAB 7 — Digital ID
 * ═══════════════════════════════════════════════════════════════ */
function DigitalIdTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    (async () => { try { setData(await request<any>('/admin/digital-id')); } catch {} })();
  }, []);

  const copyId = async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(data?.admin_id || '');
      }
      onSaved('Admin ID copied');
    } catch { onSaved('Copy failed'); }
  };

  const shareLink = async () => {
    try {
      const r = await request<any>('/admin/digital-id/share-link');
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(r.share_url);
      }
      onSaved('Share link copied');
    } catch { onSaved('Share link failed'); }
  };

  const downloadCard = async () => {
    try {
      const r = await request<{ qr_code_base64: string }>('/admin/digital-id');
      if (!r?.qr_code_base64) { onSaved('Download failed'); return; }
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${r.qr_code_base64}`;
        link.download = `admin-id-${data?.admin_id || 'unknown'}.png`;
        link.click();
      } else {
        onSaved('QR code available');
      }
    } catch { onSaved('Download failed'); }
  };

  if (!data) return <Loading />;

  const fmtDate = (iso: string) => {
    if (!iso) return 'N/A';
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 20 }}>
      {/* The ID Card — 3D CSS Flip */}
      <Pressable onPress={() => setFlipped(!flipped)} style={{ alignSelf: 'center', width: '100%', maxWidth: 540, ...(Platform.OS === 'web' ? { perspective: 1000, WebkitPerspective: 1000 } as any : {}) }}>
        <View style={{ position: 'relative', height: 440, width: '100%', transformStyle: 'preserve-3d' as any, ...(Platform.OS === 'web' ? { transition: 'transform 0.6s ease', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } as any : {}), ...(Platform.OS !== 'web' ? { opacity: flipped ? 0 : 1 } as any : {}) }}>
          {/* FRONT: Identity */}
          <View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any }}>
            <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
              <View style={{ position: 'absolute', top: -10, right: -10, opacity: 0.08 }}>
                <Text style={{ fontSize: 140, fontFamily: FONTS.xbold, color: '#1f1107', letterSpacing: -6 }}>SA</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={s.idOrg}>{(data.org || 'Student Alumni').toUpperCase()}</Text>
                    <Text style={s.idLabel}>{data.label || 'OFFICIAL ID'}</Text>
                  </View>
                  <View style={s.idBadge}>
                    <Text style={s.idBadgeText}>{(data.role_label || 'ADMIN').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' }}>
                    {data.photo ? (
                      <Image source={{ uri: data.photo }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                    ) : (
                      <UserCog size={28} color="rgba(31,17,7,0.5)" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.idName}>{data.name}</Text>
                    <Text style={s.idTitle}>{data.title} · {data.access_label}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 22 }}>
                  <View>
                    <Text style={s.idAdminLabel}>ADMIN ID</Text>
                    <Text style={s.idAdminVal}>{data.admin_id}</Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.idAdminLabel}>EMAIL</Text>
                    <Text style={{ color: 'rgba(31,17,7,0.8)', fontFamily: FONTS.xbold, fontSize: 13 }}>{data.email || ''}</Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Text style={s.idAdminLabel}>ISSUED</Text>
                    <Text style={{ color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 12 }}>{fmtDate(data.issue_date)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={s.idFlipHint}>Tap for verification →</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* BACK: Verification — pre-rotated 180deg so it faces away when parent is at 0deg */}
          <View style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any, transform: [{ rotateY: '180deg' }] }}>
            <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
              <View style={{ position: 'absolute', top: -10, right: -10, opacity: 0.08 }}>
                <Text style={{ fontSize: 140, fontFamily: FONTS.xbold, color: '#1f1107', letterSpacing: -6 }}>SA</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={s.idOrg}>{(data.org || 'Student Alumni').toUpperCase()}</Text>
                    <Text style={s.idLabel}>VERIFIED CREDENTIAL</Text>
                  </View>
                  <View style={[s.idBadge, { backgroundColor: 'rgba(22,163,74,0.25)', borderColor: 'rgba(22,163,74,0.4)' }]}>
                    <Text style={[s.idBadgeText, { color: '#166534' }]}>VERIFIED</Text>
                  </View>
                </View>
                <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={s.idAdminLabel}>EMAIL</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.email || ''}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>ROLE</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.role_label || 'Administrator'}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>COLLEGES</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.colleges_count || 0} verified</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>ACCESS</Text>
                      <Text style={[s.idAdminVal, { fontSize: 14 }]}>{data.access_label || ''}</Text>
                    </View>
                    <View>
                      <Text style={s.idAdminLabel}>EXPIRES</Text>
                      <Text style={{ color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 12 }}>{fmtDate(data.expiry_date)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <View style={s.qrBox}>
                      {data.qr_code_base64 ? (
                        <Image source={{ uri: `data:image/png;base64,${data.qr_code_base64}` }} style={{ width: 100, height: 100 }} resizeMode="contain" />
                      ) : (
                        <QrCode size={56} color="#1f1107" strokeWidth={1.5} />
                      )}
                    </View>
                    <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(31,17,7,0.2)' }}>
                      <MaterialCommunityIcons name="nfc" size={14} color="rgba(31,17,7,0.5)" />
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Text style={s.idFlipHint}>Tap to flip back →</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Pressable>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Pressable onPress={copyId} style={s.idActionBtn}>
          <Copy size={13} color="#fff" />
          <Text style={s.idActionText}>Copy Admin ID</Text>
        </Pressable>
        <Pressable onPress={shareLink} style={s.idActionBtn}>
          <Share2 size={13} color="#fff" />
          <Text style={s.idActionText}>Share Profile Link</Text>
        </Pressable>
        <Pressable onPress={downloadCard} style={s.idActionBtn}>
          <Download size={13} color="#fff" />
          <Text style={s.idActionText}>Download QR Card</Text>
        </Pressable>
      </View>

      {/* 4 feature cards */}
      <View style={s.featGrid}>
        <FeatureCard icon={ShieldCheck} tint={SAC.green}    title="Verified Identity"   text="Your admin status is verified by the platform." />
        <FeatureCard icon={Building2}   tint="#3B82F6"      title="Platform Authority"  text={`Recognised across all ${data.colleges_count || 48} colleges.`} />
        <FeatureCard icon={QrCode}      tint="#A78BFA"      title="Instant Share"       text="Share QR at events or board meetings." />
        <FeatureCard icon={Lock}        tint={GRAD_TO}      title="Secure Access"       text="Cryptographically signed and tamper-proof." />
      </View>
    </Animated.View>
  );
}


/* ═════════════════════════════════════════════════════════════════
 * TAB 8 — Pages (policy/service content manager)
 * ═══════════════════════════════════════════════════════════════ */
function PagesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try { setPages(await request<any[]>('/admin/pages')); } catch {}
      setLoading(false);
    })();
  }, []);

  const savePage = async (key: string) => {
    try {
      await request<any>(`/admin/pages/${key}`, {
        method: 'PATCH',
        body: { content: editContent, active: editing?.active ?? true },
      });
      onSaved('Page updated');
      setEditing(null);
      setPreview(false);
      const updated = await request<any[]>('/admin/pages');
      setPages(updated);
    } catch { onSaved('Failed to update page'); }
  };

  if (loading) return <Loading />;

  if (editing) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => { setEditing(null); setPreview(false); }} style={s.linkBtn}>
            <ArrowLeft size={16} color="#fff" />
            <Text style={s.linkBtnText}>Back</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{editing.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#94a3b8', fontFamily: FONTS.med, fontSize: 12 }}>Route: {editing.route}</Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setPreview(!preview)}
            style={[s.secondaryBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          >
            {preview ? <Minimize2 size={14} color="#94a3b8" /> : <Maximize2 size={14} color="#94a3b8" />}
            <Text style={s.secondaryBtnText}>{preview ? 'Edit' : 'Preview'}</Text>
          </Pressable>
          {!preview && (
            <Pressable
              onPress={async () => {
                await savePage(editing.key);
              }}
              style={s.primaryBtn}
            >
              <Check size={14} color="#fff" />
              <Text style={s.primaryBtnText}>Save</Text>
            </Pressable>
          )}
        </View>
        {preview ? (
          <View style={previewStyles.container}>
            <View style={previewStyles.chrome}>
              <Text style={previewStyles.title}>{editing.title}</Text>
              <View style={previewStyles.divider} />
              <ScrollView style={previewStyles.scrollArea}>
                <div
                  className="page-preview"
                  dangerouslySetInnerHTML={{ __html: editContent }}
                  style={{
                    color: '#e2e8f0',
                    fontFamily: 'DMSans_400Regular, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                />
              </ScrollView>
            </View>
            <Text style={previewStyles.hint}>
              This is a live preview of how the page will look. Any unsaved changes are shown here.
            </Text>
          </View>
        ) : (
          <>
            <LexicalEditor value={editContent} onChange={setEditContent} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => { setEditing(null); setPreview(false); }} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <Text style={{ color: '#94a3b8', fontFamily: FONTS.med, fontSize: 13, marginBottom: 4 }}>
        Manage policy and content pages displayed in the footer.
      </Text>
      <View style={s.toolGrid}>
        {pages.map((p) => (
          <View key={p.key} style={s.toolCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 }}>{p.title}</Text>
              <Text style={{ color: '#64748b', fontFamily: FONTS.med, fontSize: 11 }}>{p.route}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.active ? '#22c55e' : '#ef4444' }} />
                <Text style={{ color: p.active ? '#22c55e' : '#ef4444', fontFamily: FONTS.bold, fontSize: 10 }}>
                  {p.active ? 'Published' : 'Hidden'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => { setEditing(p); setEditContent(p.content || ''); }}
              style={[s.idActionBtn, { paddingHorizontal: 10, paddingVertical: 6 }]}
            >
              <Pencil size={12} color="#fff" />
              <Text style={s.idActionText}>Edit</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}


function BrandingField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 12,
          color: '#e2e8f0',
          fontSize: 13,
        }}
      />
    </View>
  );
}

function BrandingTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const logoRef = useRef<any>(null);
  const faviconRef = useRef<any>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [brandName, setBrandName] = useState('StudentAlumni');
  const [copyright, setCopyright] = useState('2026 StudentAlumni. All rights reserved.');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/admin/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const d = await resp.json();
          setLogoUrl(d.logo_url || '');
          setFaviconUrl(d.favicon_url || '');
          setBrandName(d.brand_name || 'StudentAlumni');
          setCopyright(d.copyright || '2026 StudentAlumni. All rights reserved.');
          setAddress(d.address || '');
          setPhone(d.phone || '');
          setEmail(d.email || '');
          setWebsite(d.website || '');
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          logo_url: logoUrl, favicon_url: faviconUrl, brand_name: brandName,
          copyright, address, phone, email, website,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      onSaved('Branding saved');
    } catch (err: any) {
      onSaved(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandingFile = async (file: File, kind: 'logo' | 'favicon') => {
    if (!file) return;
    if (kind === 'logo') setLogoUploading(true); else setFaviconUploading(true);
    try {
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const preview = URL.createObjectURL(file);
        if (kind === 'logo') setLogoUrl(preview); else setFaviconUrl(preview);
      }
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res: any = await request<any>(`/admin/upload?folder=${encodeURIComponent('branding')}`, { method: 'POST', body: fd });
      if (res?.url) {
        if (kind === 'logo') setLogoUrl(res.url); else setFaviconUrl(res.url);
        onSaved(kind === 'logo' ? 'Logo uploaded' : 'Favicon uploaded');
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      onSaved(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      if (kind === 'logo') setLogoUploading(false); else setFaviconUploading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Card style={{ padding: 20, gap: 16 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Branding & Identity</Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
          Configure logo, favicon, and contact information displayed across the platform.
        </Text>

        <BrandingField label="Brand Name" value={brandName} onChange={setBrandName} placeholder="StudentAlumni" />
        <BrandingField label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/logo.png" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => logoRef.current?.click?.()}
            disabled={logoUploading}
            style={{
              backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6,
              cursor: 'pointer', opacity: logoUploading ? 0.6 : 1,
            }}
          >
            <Upload size={14} color="#A78BFA" />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: '#A78BFA' }}>
              {logoUploading ? 'Uploading logo…' : 'Upload logo file'}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }}>
            PNG/JPG/WebP up to 5 MB{logoUrl ? ' — or paste a URL above' : ''}
          </Text>
          {Platform.OS === 'web' && (
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandingFile(f, 'logo'); }} />
          )}
        </View>
        <BrandingField label="Favicon URL" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://example.com/favicon.png" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            onPress={() => faviconRef.current?.click?.()}
            disabled={faviconUploading}
            style={{
              backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
              borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6,
              cursor: 'pointer', opacity: faviconUploading ? 0.6 : 1,
            }}
          >
            <Upload size={14} color="#A78BFA" />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: '#A78BFA' }}>
              {faviconUploading ? 'Uploading favicon…' : 'Upload favicon file'}
            </Text>
          </Pressable>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }}>
            PNG/JPG/WebP up to 5 MB{faviconUrl ? ' — or paste a URL above' : ''}
          </Text>
          {Platform.OS === 'web' && (
            <input ref={faviconRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandingFile(f, 'favicon'); }} />
          )}
        </View>
        {(logoUrl || faviconUrl) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" /> : null}
            {faviconUrl ? <Image source={{ uri: faviconUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="contain" /> : null}
          </View>
        ) : null}

        <View style={{ height: 1, backgroundColor: SAC.border, marginVertical: 4 }} />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>Contact & Legal</Text>

        <BrandingField label="Copyright" value={copyright} onChange={setCopyright} placeholder="2026 StudentAlumni. All rights reserved." />
        <BrandingField label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, Country" />
        <BrandingField label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
        <BrandingField label="Email" value={email} onChange={setEmail} placeholder="contact@studentalumni.ai" />
        <BrandingField label="Website" value={website} onChange={setWebsite} placeholder="https://studentalumni.ai" />

        <Pressable onPress={save} disabled={saving} style={{
          backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 14, alignItems: 'center', cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>{saving ? 'Saving...' : 'Save Branding'}</Text>
        </Pressable>
      </Card>
    </View>
  );
}


function TemplatesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [subTab, setSubTab] = useState<'pass' | 'invoice' | 'email' | 'branding'>('pass');
  const [defaultTemplate, setDefaultTemplate] = useState('aurora');
  const [invoiceTemplate, setInvoiceTemplate] = useState('modern');
  const [emailStyle, setEmailStyle] = useState('modern');
  const [brandColor, setBrandColor] = useState('#7C3AED');
  const [brandName, setBrandName] = useState('Student Alumni');
  const [emailFooter, setEmailFooter] = useState('Student Alumni Cell — Empowering the next generation of leaders.');
  const [saving, setSaving] = useState(false);
  // removed useToast - using onSaved

  useEffect(() => {
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/admin/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const d = await resp.json();
          setDefaultTemplate(d.default_ticket_template || 'aurora');
          setInvoiceTemplate(d.default_invoice_template || 'modern');
          setEmailStyle(d.default_email_style || 'modern');
          setBrandColor(d.email_brand_color || '#7C3AED');
          setBrandName(d.brand_name || 'Student Alumni');
          setEmailFooter(d.email_footer || '');
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          default_ticket_template: defaultTemplate,
          default_invoice_template: invoiceTemplate,
          default_email_style: emailStyle,
          email_brand_color: brandColor,
          brand_name: brandName,
          email_footer: emailFooter,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      onSaved('Templates saved');
    } catch (err: any) {
      onSaved(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fetchPreview = async (type: string, tplId: string) => {
    const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const url = type === 'invoice'
        ? `${base}/api/echo/admin/settings/preview/invoice/${tplId}`
        : `${base}/api/echo/tickets/preview/${tplId}`;
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error('Preview not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) { w.document.write(data.html); w.document.close(); }
    } catch (err: any) {
      onSaved(err?.message || 'Could not load preview');
    }
  };

  const TemplatePicker = ({ label, options, value, onChange, previewType }: {
    label: string; options: { id: string; name: string; desc: string; gradient: string }[];
    value: string; onChange: (v: string) => void; previewType: string;
  }) => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {options.map((tpl) => (
          <Pressable key={tpl.id} onPress={() => onChange(tpl.id)} style={{
            width: 160, borderRadius: 10, borderWidth: 2,
            borderColor: value === tpl.id ? '#7C3AED' : 'rgba(255,255,255,0.08)',
            backgroundColor: value === tpl.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
            padding: 14, cursor: 'pointer',
          }}>
            <View style={{ height: 6, borderRadius: 3, marginBottom: 10, background: tpl.gradient }} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: value === tpl.id ? '#C4B5FD' : '#e2e8f0' }}>{tpl.name}</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: '#64748b', marginTop: 3 }}>{tpl.desc}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => fetchPreview(previewType, value)} style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
        cursor: 'pointer', marginTop: 4,
      }}>
        <Eye size={13} color="#A78BFA" />
        <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: '#C4B5FD' }}>Preview Template</Text>
      </Pressable>
    </View>
  );

  const subTabs = [
    { id: 'pass' as const, label: 'Pass / Ticket' },
    { id: 'invoice' as const, label: 'Invoice' },
    { id: 'email' as const, label: 'Email' },
    { id: 'branding' as const, label: 'Branding' },
  ];

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#f1f5f9' }}>Templates & Branding</Text>
      <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#94a3b8' }}>
        Configure default templates for passes, invoices, and emails across all events.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {subTabs.map((t) => (
          <Pressable key={t.id} onPress={() => setSubTab(t.id)} style={{
            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, cursor: 'pointer',
            borderColor: subTab === t.id ? '#7C3AED' : 'rgba(255,255,255,0.08)',
            backgroundColor: subTab === t.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
          }}>
            <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: subTab === t.id ? '#C4B5FD' : '#94a3b8' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {subTab === 'pass' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Pass / Ticket Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Default entry pass style for all ECHO events.</Text>
          <TemplatePicker label="Default Template" previewType="pass" value={defaultTemplate} onChange={setDefaultTemplate} options={[
            { id: 'aurora', name: 'Aurora', desc: 'Dark gradient, glow accents', gradient: 'linear-gradient(135deg,#312e81,#4C1D95)' },
            { id: 'classic', name: 'Classic', desc: 'White + purple header', gradient: 'linear-gradient(135deg,#fff,#f3f4f6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Bare-bones borderless', gradient: 'linear-gradient(135deg,#f9fafb,#e5e7eb)' },
          ]} />
        </View>
      )}

      {subTab === 'invoice' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Invoice Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Default invoice style for paid registrations.</Text>
          <TemplatePicker label="Default Invoice" previewType="invoice" value={invoiceTemplate} onChange={setInvoiceTemplate} options={[
            { id: 'modern', name: 'Modern', desc: 'Gradient header, card layout', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean white, thin borders', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'classic', name: 'Classic', desc: 'Dark header, traditional', gradient: 'linear-gradient(135deg,#0f172a,#1e293b)' },
          ]} />
        </View>
      )}

      {subTab === 'email' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Email Templates</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Style for transactional emails.</Text>
          <TemplatePicker label="Email Style" previewType="pass" value={emailStyle} onChange={setEmailStyle} options={[
            { id: 'modern', name: 'Modern', desc: 'Purple gradient header', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean, no gradient', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'professional', name: 'Professional', desc: 'Dark header, corporate', gradient: 'linear-gradient(135deg,#0f172a,#334155)' },
          ]} />
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Footer</Text>
            <TextInput value={emailFooter} onChangeText={setEmailFooter}
              placeholder="Student Alumni Cell — Empowering the next generation of leaders."
              placeholderTextColor="#475569" multiline numberOfLines={3}
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13, minHeight: 60, textAlignVertical: 'top' }} />
          </View>
        </View>
      )}

      {subTab === 'branding' && (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Branding</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>Brand settings for emails, passes, and invoices.</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Brand Name</Text>
            <TextInput value={brandName} onChangeText={setBrandName} placeholder="Student Alumni"
              placeholderTextColor="#475569"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13 }} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Brand Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <input type="color" value={brandColor} onChange={(e: any) => setBrandColor(e.target.value)}
                style={{ width: 44, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
              <TextInput value={brandColor} onChangeText={setBrandColor} placeholder="#7C3AED"
                placeholderTextColor="#475569"
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13 }} />
            </View>
          </View>
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: brandColor + '18', borderWidth: 1, borderColor: brandColor + '40' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: brandColor }}>Preview</Text>
            <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              This is how {brandName} will appear in emails and passes.
            </Text>
          </View>
        </View>
      )}

      <Pressable onPress={save} disabled={saving} style={{
        backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 14, alignItems: 'center', cursor: 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>{saving ? 'Saving...' : 'Save All Settings'}</Text>
      </Pressable>
    </View>
  );
}

function FeatureCard({ icon: Icon, tint, title, text }: { icon: any; tint: string; title: string; text: string }) {
  return (
    <View style={s.featCard}>
      <View style={[s.featIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <Icon size={16} color={tint} />
      </View>
      <Text style={s.featTitle}>{title}</Text>
      <Text style={s.muted}>{text}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Shared building blocks
 * ───────────────────────────────────────────────────────────────── */
function GradientButton({ onPress, loading, children, disabled }: {
  onPress: () => void; loading?: boolean; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading || disabled} style={({ hovered }: any) => [
      { opacity: loading || disabled ? 0.6 : 1 },
      hovered && Platform.OS === 'web' ? { transform: [{ translateY: -1 }] } : null,
    ]}>
      <LinearGradient colors={[GRAD_FROM, GRAD_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : children}
      </LinearGradient>
    </Pressable>
  );
}

function Loading() {
  return (
    <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <ActivityIndicator color={GRAD_TO} size="small" />
      <Text style={s.muted}>Loading…</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Styles
 * ───────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  // Top tab bar
  tabBarOuter: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
  },
  tabActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  tabActiveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  tabInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  tabInactiveText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },

  // Cards
  card: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 20,
  },
  cardHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
  },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  sectionLabel: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.8 },

  iconBox: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  twoCol: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' as any },
  // Use s.card (defined above) for card styles

  // Profile
  avatarLg: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 24 },
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 },
  subtle: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5 },
  pillGrad: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillGradText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.4 },
  pillGreen: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillGreenText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 10.5 },
  pillNeutral: { backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  pillNeutralText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  label: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  valueText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  valueGrad: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 12.5 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: SAC.green },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  fieldLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, width: 130 },
  fieldValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 13, flex: 1, textAlign: 'right' },
  input: {
    color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10, flex: 1,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  linkBtnText: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 12 },

  // Platform Controls
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 4,
  },
  toggleTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13, flex: 1, marginRight: 8 },
  toggleDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  systemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: SAC.border, gap: 8,
  },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    minWidth: 140, maxWidth: 200,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  editBtnText: { color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 11 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    minWidth: 140, maxWidth: 200,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectValue: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 12, flex: 1 },

  // Picker Modal
  pickerBackdrop: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  pickerCard: {
    width: '100%', maxWidth: 440,
    backgroundColor: SAC.bg2, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(251,146,60,0.25)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  pickerHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  pickerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  pickerSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  credentialBody: {
    padding: 16,
    gap: 12,
  },
  credentialHelp: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    lineHeight: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: SAC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  credentialLabel: {
    color: SAC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    marginBottom: 6,
  },
  credentialInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  credentialInput: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.med,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  iconOnlyBtn: {
    padding: 4,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(251,146,60,0.10)',
    borderColor: 'rgba(251,146,60,0.30)',
  },
  pickerOptionRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: SAC.border2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pickerRadioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: GRAD_TO,
  },
  pickerOptionText: { color: SAC.text, fontFamily: FONTS.med, fontSize: 13, flex: 1 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: SAC.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Old dropdown styles (kept for reference, not used)
  dropdown: {},
  dropdownItem: {},
  dropdownItemActive: {},
  dropdownItemText: {},
  editBtnFull: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SAC.border,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  iconDangerBtn: {
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  dangerBtnText: { color: SAC.red, fontFamily: FONTS.bold, fontSize: 12 },

  // Integrations
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  searchWrap: {
    flex: 1, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: {
    flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  popularToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  popularToggleActive: {
    borderColor: 'rgba(251,146,60,0.55)',
    backgroundColor: 'rgba(251,146,60,0.10)',
  },
  popularToggleText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  emptyBox: {
    marginTop: 18, padding: 30, alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, borderColor: SAC.border,
    backgroundColor: SAC.cardSolid,
  },
  emptyTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  emptySub: {
    color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center',
    maxWidth: 360, lineHeight: 17,
  },
  clearBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  clearBtnText: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 12 },

  testResult: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1,
  },
  testResultOk:  { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' },
  testResultErr: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.30)' },
  testResultText: { fontFamily: FONTS.bold, fontSize: 12, flex: 1 },

  catPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, marginRight: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  catPillActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 6 },
  catPillText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  catPillActiveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  catLabel: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.6, marginBottom: 10 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: {
    width: 240, minHeight: 170, padding: 14, borderRadius: 12,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, position: 'relative',
  },
  toolIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  toolName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  toolDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 10, lineHeight: 15.5, minHeight: 30 },
  toolBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8,
  },
  toolBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  toolBtnSec: {
    marginTop: 10, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toolBtnSecText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  connectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)',
  },
  connectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SAC.green },
  connectedPillText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3 },
  disconnectedPill: {
    marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border,
  },
  disconnectedPillText: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3 },
  popPill: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  popPillText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.6 },

  // Roles
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  roleCard: {
    width: 280, minHeight: 200, padding: 16, borderRadius: 12,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    flexDirection: 'column',
  },
  roleBadge: {
    width: 40, height: 40, borderRadius: 999, borderWidth: 1.4,
    alignItems: 'center', justifyContent: 'center',
  },
  roleBadgeText: { fontFamily: FONTS.xbold, fontSize: 13.5 },
  roleName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  permLine: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, flex: 1 },
  sysPill: { backgroundColor: 'rgba(251,146,60,0.16)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(251,146,60,0.40)' },
  sysPillText: { color: '#FB923C', fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.8 },

  // Notifications
  notifHeadRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 14,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  notifHead: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },

  // Security
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 4,
  },
  inputIconBtn: {
    width: 32, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  sessRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: SAC.border,
  },
  sessIcon: { width: 32, height: 32, marginTop: 2, borderRadius: 8, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)' },
  activeChipText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 10.5 },
  revokeBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  revokeBtnText: { color: SAC.red, fontFamily: FONTS.xbold, fontSize: 11 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  logDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GRAD_TO, marginTop: 5 },
  logAction: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },

  trustBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: 'rgba(16,185,129,0.08)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  trustBtnText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 11 },
  trustedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.04)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)',
  },
  trustedIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', alignItems: 'center', justifyContent: 'center' },

  // Digital ID
  idCard: {
    padding: 6, borderRadius: 22,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 30px 70px rgba(217,119,6,0.30)' } as any) : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } }),
  },
  idOrg: { color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 2 },
  idLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  idBadge: { backgroundColor: 'rgba(31,17,7,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(31,17,7,0.25)' },
  idBadgeText: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1 },
  idName: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5 },
  idTitle: { color: 'rgba(31,17,7,0.75)', fontFamily: FONTS.bold, fontSize: 13, marginTop: 4 },
  idAdminLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1.4 },
  idAdminVal: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 19,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  qrBox: { width: 106, height: 106, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  idFlipHint: { color: 'rgba(31,17,7,0.7)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  idFlipHintDark: { color: 'rgba(251,191,36,0.7)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  flipOrg: { color: 'rgba(251,191,36,0.9)', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 2, textAlign: 'center' },
  flipTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  flipSub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', marginTop: 2 },
  flipDataLabel: { color: 'rgba(251,191,36,0.7)', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 1.4 },
  flipQrData: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },
  idActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  idActionText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  featCard: {
    flex: 1, minWidth: 220, padding: 16, borderRadius: 12,
    backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, gap: 8,
  },
  featIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },

  // Primary buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
  },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secondaryBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  secondaryBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: SAC.red,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  // Modals
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 600, maxHeight: '90%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  modalSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  modalClose: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    padding: 14, borderTopWidth: 1, borderTopColor: SAC.border, backgroundColor: SAC.card,
  },
  helpBox: {
    flexDirection: 'row', gap: 8, padding: 12, borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)',
    alignItems: 'flex-start',
  },
  helpText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16, flex: 1 },
  helpInline: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, lineHeight: 14 },
  docLink: { flexDirection: 'row', alignItems: 'center', gap: 5,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  docLinkText: { color: GRAD_TO, fontFamily: FONTS.bold, fontSize: 11.5, textDecorationLine: 'underline' },

  permGroup: { backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, padding: 10 },
  permGroupTitle: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkbox: { width: 17, height: 17, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  permLabel: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  permId: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  errorText: { color: SAC.red, fontFamily: FONTS.bold, fontSize: 12 },

  // Signature editor
  sigPreview: {
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border,
    padding: 14, marginTop: 14, gap: 2,
  },
  sigPreviewLine:      { color: SAC.text,  fontFamily: FONTS.med,   fontSize: 12.5, lineHeight: 17 },
  sigPreviewLineFirst: { color: '#fff',    fontFamily: FONTS.xbold, fontSize: 13 },
  sigEditor: {
    minHeight: 130, paddingHorizontal: 12, paddingTop: 10,
    color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1, borderRadius: 10,
    textAlignVertical: 'top' as any, marginTop: 6,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  tplChip: {
    paddingHorizontal: 12, height: 28, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tplChipText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11 },

  // Role drill-in
  roleDetailHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  roleDetailBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, height: 30, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  roleDetailBackText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  roleDetailTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 },
  roleDetailSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  roleStatRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 14 },
  roleStat: {
    flex: 1, minWidth: 140,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  roleStatLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },
  roleStatValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, marginTop: 4 },
  roleUserRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10, backgroundColor: SAC.cardSolid,
    borderWidth: 1, borderColor: SAC.border,
  },
  roleUserAv: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.32)', borderWidth: 1 },
  roleUserName: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12.5 },
  roleUserMeta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
});

const previewStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chrome: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold, DMSansBold, sans-serif',
    fontSize: 26,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
  },
  divider: {
    height: 2,
    backgroundColor: '#F59E0B',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  scrollArea: {
    maxHeight: 500,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hint: {
    color: '#64748b',
    fontFamily: FONTS.med,
    fontSize: 10.5,
    paddingHorizontal: 4,
  },
});

