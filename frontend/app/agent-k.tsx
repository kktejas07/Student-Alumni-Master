// @ts-nocheck
/**
 * /agent-k — Unified Agent K view (v0.14.0).
 *
 * One view, portal-aware. Three modes:
 *
 *   1. NO-AUTH               → quietly redirect to /login
 *   2. NO-AI-CONNECTED       → empty state with "Connect AI" CTA → /marketplace
 *   3. READY                 → Prescription Cards grid + Run history below
 *
 * Prescription cards come from `GET /api/agent-k/prescriptions?portal=...`
 * and are 1-click actions derived from the user's active dashboard
 * recommendations. Each tap submits the canned `prompt` to /agent-k/run
 * which is gated server-side (BYO-AI). Run history is the existing
 * /agent-k/runs feed, collapsed below the prescriptions.
 *
 * Replaces the previous 781-line 3-column template workspace AND the
 * standalone /agent-k/runs route (now a redirect).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, useWindowDimensions,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';
import { PORTAL_ACCENTS } from '@/src/theme/nexus';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { AiCopilotFab as StudentAiCopilotFab } from '@/src/views/web/portals/student/glass';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

type Card = {
  id: string; icon: string; tint: string;
  kicker: string; title: string; subtitle?: string;
  cta: string; prompt: string; tools: string[];
};
type Provider = { tool_id: string; label: string; connected_at?: string };
type Prescriptions = {
  portal: string;
  cards: Card[];
  ai_connected: boolean;
  is_admin: boolean;
  deeplink_marketplace: string;
};
type RunRow = {
  _id?: string; id?: string; prompt?: string; status?: string;
  started_at?: string; result_summary?: string | null;
};
type Schedule = {
  id: string;
  title: string;
  prompt: string;
  cadence: 'hourly' | 'daily' | 'weekly' | 'cron';
  hour?: number;
  minute?: number;
  weekday?: number;
  interval_hours?: number;
  cron_expr?: string | null;
  timezone?: string;
  status: 'active' | 'paused';
  cadence_label?: string;
  last_run_at?: string | null;
  last_status?: string | null;
  next_run_at?: string | null;
  runs_count?: number;
};
type PortalKey = 'student' | 'alumni' | 'mentor' | 'college' | 'admin';

/** Map the logged-in user's role → which portal's prescriptions to fetch. */
function rolePortal(role?: string | null): PortalKey {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'alumni') return 'alumni';
  if (r === 'mentor') return 'mentor';
  if (r === 'college' || r === 'college_admin') return 'college';
  return 'student';
}

/** Map portal → brand colour stops (mirrors PORTAL_ACCENTS for the gradient). */
function portalGradient(p: PortalKey): [string, string] {
  const a = PORTAL_ACCENTS[p];
  return [a.primary, a.primaryD];
}

export default function AgentKPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);

  const portal: PortalKey = rolePortal(user?.role);
  const grad = portalGradient(portal);

  const [presc, setPresc] = useState<Prescriptions | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [busyCardId, setBusyCardId] = useState<string | null>(null);

  const integrationsRoute = useMemo(() => {
    const role = user?.role || 'student';
    if (role === 'alumni') {
      return '/alumni-portal?tab=profile&ptab=integrations';
    }
    return '/student-portal?tab=profile&ptab=integrations';
  }, [user?.role]);

  // Pretty-print the connected providers for the "Powered by …" badge.
  const poweredByLabel = useMemo(() => {
    if (!providers.length) return '';
    const labels = providers.map((p) =>
      p.label || ({
        openai: 'OpenAI', claude: 'Anthropic', anthropic: 'Anthropic',
        gemini: 'Gemini', google: 'Gemini', mistral: 'Mistral',
        cohere: 'Cohere', perplexity: 'Perplexity', groq: 'Groq',
        'together-ai': 'Together AI', 'fireworks-ai': 'Fireworks',
        huggingface: 'Hugging Face', deepseek: 'DeepSeek',
      } as Record<string, string>)[p.tool_id] || p.tool_id,
    );
    return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} & ${labels.slice(-1)}`;
  }, [providers]);

  const goBack = useCallback(() => {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(tabs)' as any);
  }, [router]);

  // Fetch prescriptions + providers + recent runs + schedules in parallel
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, pv] = await Promise.all([
        request(`/agent-k/prescriptions?portal=${portal}`),
        request('/agent-k/installed-providers').catch(() => ({ providers: [] as Provider[] })),
      ]);
      setPresc(p as Prescriptions);
      setProviders(((pv as any)?.providers as Provider[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load Agent K');
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => { load(); }, [load]);

  const runCard = useCallback((card: Card) => {
    router.push({ pathname: '/chat', params: { prompt: card.prompt } });
  }, [router]);

  // Layout
  const cols = width >= 1180 ? 3 : width >= 760 ? 2 : 1;

  // Body switch ────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={s.center}>
        <ActivityIndicator size="small" color={grad[0]} />
        <Text style={[s.dim, { color: theme.textTer, marginTop: 8 }]}>
          Loading your Agent K…
        </Text>
      </View>
    );
  } else {
    body = (
      <EmptyConnectAI
        gradient={grad}
        textColor={theme.text}
        subColor={theme.textSec}
        borderColor={theme.hairline}
        onConnect={() => router.push(integrationsRoute as any)}
      />
    );
  }

  if (!user) {
    // not logged in — soft redirect
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  return (
    <View style={[ss.shell, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {/* Top bar — Back + title + "Powered by …" pill */}
      <View style={[ss.topBar, { borderBottomColor: theme.hairline }]}>
        <Pressable onPress={goBack} style={[ss.backBtn, { borderColor: theme.hairline }]}>
          <MaterialCommunityIcons name="arrow-left" size={16} color={theme.text} />
          <Text style={[ss.backText, { color: theme.text }]}>Back to Dashboard</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {!!poweredByLabel && (
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={ss.poweredBy}
          >
            <MaterialCommunityIcons name="flash" size={11} color="#fff" />
            <Text style={ss.poweredByText}>Powered by {poweredByLabel}</Text>
          </LinearGradient>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 + (insets.bottom || 0) }}>
        {/* Header card */}
        <View style={[s.hero, { borderColor: theme.hairline, backgroundColor: theme.bgElevated }]}>
          <View style={[s.heroIcon, { borderColor: grad[0] + '60', backgroundColor: grad[0] + '18' }]}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={grad[0]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.heroTitle, { color: theme.text }]}>Agent K</Text>
            <Text style={[s.heroSub, { color: theme.textSec }]}>
              Personalised automations powered by your connected AI provider.
            </Text>
          </View>
          {presc?.ai_connected && !presc?.is_admin && (
            <Pressable onPress={() => router.push(integrationsRoute as any)}
                       style={[s.miniBtn, { borderColor: theme.hairline }]}>
              <MaterialCommunityIcons name="key-outline" size={12} color={theme.textSec} />
              <Text style={[s.miniBtnText, { color: theme.textSec }]}>Manage providers</Text>
            </Pressable>
          )}
        </View>

        {!!error && (
          <View style={[s.errBar, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.32)' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FCA5A5" />
            <Text style={{ color: '#FCA5A5', fontFamily: FONT, fontSize: 12.5 }}>{error}</Text>
          </View>
        )}

        {body}
      </ScrollView>

      {/* Global AI Copilot FAB (student portal only) — visible on
          Agent K too per design contract. Tapping is a no-op visual. */}
      {portal === 'student' && (
        <StudentAiCopilotFab onPress={() => router.push('/agent-k')} />
      )}
    </View>
  );
}



function EmptyConnectAI({ gradient, textColor, subColor, borderColor }: {
  gradient: [string, string]; textColor: string; subColor: string; borderColor: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'your' | 'featherless'>('your');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccess = async () => {
    const k = apiKey.trim();
    if (!k) return;
    
    let inferredProvider = 'gemini';
    let inferredModel = 'gemini-1.5-pro';
    if (k.startsWith('sk-ant-')) {
      inferredProvider = 'claude';
      inferredModel = 'claude-3-5-sonnet-20240620';
    } else if (k.startsWith('AIza')) {
      inferredProvider = 'gemini';
      inferredModel = 'gemini-1.5-pro';
    } else if (k.startsWith('gsk_')) {
      inferredProvider = 'groq';
      inferredModel = 'llama-3.1-8b-instant';
    } else if (k.startsWith('sk-')) {
      inferredProvider = 'openai';
      inferredModel = 'gpt-4o';
    }

    setLoading(true);
    try {
      await request('/agent-k/providers/byok', {
        method: 'POST',
        body: {
          provider: mode === 'featherless' ? 'featherless' : inferredProvider,
          api_key: k,
          model: mode === 'featherless' ? 'featherless-default-model' : inferredModel
        }
      });
      router.push('/chat');
    } catch (e: any) {
      alert(e.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(280)} style={[s.empty, { borderColor }]}>
      <View style={[s.emptyIcon, { borderColor: gradient[0] + '60', backgroundColor: gradient[0] + '14' }]}>
        <MaterialCommunityIcons name="key-variant" size={28} color={gradient[0]} />
      </View>
      <Text style={[s.emptyTitle, { color: textColor }]}>Connect AI to unlock Agent K</Text>
      <Text style={[s.emptySub, { color: subColor, marginBottom: 10 }]}>
        Agent K runs every action with the AI provider YOU connect.
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <Pressable
          onPress={() => setMode('your')}
          style={[
            s.chip,
            { borderColor: mode === 'your' ? gradient[0] : borderColor, backgroundColor: mode === 'your' ? gradient[0] + '14' : 'transparent' }
          ]}
        >
          <Text style={[s.chipText, { color: mode === 'your' ? gradient[0] : subColor }]}>Your API Key</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('featherless')}
          style={[
            s.chip,
            { borderColor: mode === 'featherless' ? gradient[0] : borderColor, backgroundColor: mode === 'featherless' ? gradient[0] + '14' : 'transparent' }
          ]}
        >
          <Text style={[s.chipText, { color: mode === 'featherless' ? gradient[0] : subColor }]}>Featherless API Key</Text>
        </Pressable>
      </View>

      <TextInput
        style={{
          width: '100%', maxWidth: 400, height: 44,
          borderRadius: 10, borderWidth: 1, borderColor,
          paddingHorizontal: 14, color: textColor,
          fontFamily: FONT, fontSize: 14, marginBottom: 16,
          backgroundColor: 'transparent'
        }}
        placeholder={mode === 'featherless' ? "Paste Featherless API Key..." : "Paste Claude/OpenAI API Key..."}
        placeholderTextColor={subColor}
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
      />

      <Pressable onPress={handleAccess} disabled={loading || !apiKey.trim()}>
        <LinearGradient
          colors={loading || !apiKey.trim() ? [borderColor, borderColor] : gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.emptyCta, { opacity: (loading || !apiKey.trim()) ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#fff" />
          )}
          <Text style={s.emptyCtaText}>Access Agent K</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  heroIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800' as any },
  heroSub: { fontFamily: FONT, fontSize: 12.5, marginTop: 2 },
  miniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, height: 28, borderRadius: 999, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  miniBtnText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },

  errBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },

  center: { paddingVertical: 60, alignItems: 'center' },

  dot: { width: 7, height: 7, borderRadius: 4 },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800' as any, letterSpacing: 1.6 },
  section: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800' as any, letterSpacing: 1.6 },
  h1: { fontFamily: FONT, fontSize: 22, fontWeight: '800' as any, letterSpacing: -0.4 },
  dim: { fontFamily: FONT, fontSize: 12 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
  },
  card: {
    flex: 1, minWidth: 280,
    padding: 16, borderRadius: 14, borderWidth: 1, gap: 8,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 4px 14px rgba(0,0,0,0.18)' } as any) : {}),
  },
  iconBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cardKicker: { fontFamily: FONT, fontSize: 10, fontWeight: '800' as any, letterSpacing: 1.5 },
  cardTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: '800' as any, lineHeight: 19 },
  cardSub: { fontFamily: FONT, fontSize: 12, lineHeight: 16.5 },
  cardCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 10, marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardCtaText: { color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: '800' as any },

  runRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  runPrompt: { fontFamily: FONT, fontSize: 12.5, fontWeight: '700' as any },

  // Scheduled automations
  scheduleEmpty: {
    alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' as any,
  },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  scheduleTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: '700' as any },
  miniPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, height: 22, borderRadius: 999, borderWidth: 1,
  },
  miniPillText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardScheduleBtn: {
    width: 36, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  empty: {
    alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1, gap: 12,
    backgroundColor: 'transparent',
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '800' as any, textAlign: 'center' as any },
  emptySub: { fontFamily: FONT, fontSize: 13, lineHeight: 19, textAlign: 'center' as any, maxWidth: 580 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 38, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  emptyCtaText: { color: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: '800' as any },

  chip: {
    paddingHorizontal: 10, height: 26, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },
});

/* ─── Outer shell styles (top bar / back button / powered-by pill) ─── */
const ss = StyleSheet.create({
  shell: { flex: 1, minHeight: '100%' as any },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backText: { fontFamily: FONT, fontSize: 12, fontWeight: '700' as any },
  poweredBy: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 26, borderRadius: 999,
  },
  poweredByText: { color: '#fff', fontFamily: FONT, fontSize: 11, fontWeight: '800' as any, letterSpacing: 0.3 },
});
