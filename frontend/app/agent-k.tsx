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
  ActivityIndicator,
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
type PortalKey = 'student' | 'alumni' | 'mentor' | 'college' | 'admin';

/** Map the logged-in user's role → which portal's prescriptions to fetch. */
function rolePortal(role?: string | null): PortalKey {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'super_admin' || r === 'superadmin') return 'admin';
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
  const [runs, setRuns]   = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [busyCardId, setBusyCardId] = useState<string | null>(null);

  // Where to send the user when they tap "Open AI Marketplace" — the
  // Profile → Tools & Integrations sub-tab is the official place to
  // connect / disconnect their AI providers.
  const integrationsRoute = '/me?tab=integrations';

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

  // Fetch prescriptions + providers + recent runs in parallel
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, pv, r] = await Promise.all([
        request(`/agent-k/prescriptions?portal=${portal}`),
        request('/agent-k/installed-providers').catch(() => ({ providers: [] as Provider[] })),
        request('/agent-k/runs?limit=5').catch(() => ({ runs: [] })),
      ]);
      setPresc(p as Prescriptions);
      setProviders(((pv as any)?.providers as Provider[]) || []);
      setRuns(((r as any)?.runs as RunRow[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load Agent K');
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => { load(); }, [load]);

  const runCard = useCallback(async (card: Card) => {
    setBusyCardId(card.id);
    try {
      const res: any = await request('/agent-k/run', {
        method: 'POST',
        body: JSON.stringify({ prompt: card.prompt, auto_execute: true }),
      });
      // Refresh run history then navigate to detail
      await load();
      if (res?.run_id) router.push(`/agent-k?run=${res.run_id}`);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('412') || msg.includes('setup_required')) {
        // BYO-AI gate triggered — push to Marketplace
        router.push('/marketplace?category=AI');
      } else {
        setError(msg || 'Run failed');
      }
    } finally {
      setBusyCardId(null);
    }
  }, [load, router]);

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
  } else if (!presc?.ai_connected && !presc?.is_admin) {
    body = (
      <EmptyConnectAI
        gradient={grad}
        textColor={theme.text}
        subColor={theme.textSec}
        borderColor={theme.hairline}
        onConnect={() => router.push(integrationsRoute as any)}
      />
    );
  } else {
    body = (
      <View style={{ gap: 18 }}>
        {/* Kicker */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.dot, { backgroundColor: grad[0] }]} />
          <Text style={[s.kicker, { color: theme.textSec }]}>
            TODAY’S PRESCRIPTION · POWERED BY YOUR CONNECTED AI
          </Text>
        </View>
        <Text style={[s.h1, { color: theme.text }]}>
          {portal === 'admin'    && 'Run the platform on autopilot'}
          {portal === 'college'  && 'Move every department forward today'}
          {portal === 'mentor'   && 'Show up prepared for every mentee'}
          {portal === 'alumni'   && 'Give back in 30 seconds'}
          {portal === 'student'  && 'One tap → Agent K does it for you'}
        </Text>

        {/* Cards grid */}
        <View style={[s.grid, Platform.OS === 'web' ? {
          // @ts-expect-error web grid
          display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14,
        } : null]}>
          {presc!.cards.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.duration(280).delay(60 * i)} style={[s.card, {
              backgroundColor: theme.bgElevated, borderColor: theme.hairline,
            }]}>
              <View style={[s.iconBox, { backgroundColor: c.tint + '22', borderColor: c.tint + '55' }]}>
                <MaterialCommunityIcons
                  name={(c.icon as any) || 'lightbulb-outline'}
                  size={16}
                  color={c.tint}
                />
              </View>
              <Text style={[s.cardKicker, { color: c.tint }]}>{c.kicker}</Text>
              <Text numberOfLines={2} style={[s.cardTitle, { color: theme.text }]}>{c.title}</Text>
              {!!c.subtitle && (
                <Text numberOfLines={3} style={[s.cardSub, { color: theme.textSec }]}>{c.subtitle}</Text>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => runCard(c)} disabled={busyCardId === c.id}>
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[s.cardCta, busyCardId === c.id && { opacity: 0.7 }]}
                >
                  {busyCardId === c.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialCommunityIcons name="lightning-bolt" size={13} color="#fff" />}
                  <Text style={s.cardCtaText}>{busyCardId === c.id ? 'Running…' : c.cta}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Run history (collapsed list) */}
        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[s.section, { color: theme.textSec }]}>RECENT RUNS</Text>
            {!!runs.length && (
              <Text style={[s.dim, { color: theme.textTer }]}>{runs.length} recent</Text>
            )}
          </View>
          {!runs.length ? (
            <Text style={[s.dim, { color: theme.textTer }]}>No runs yet — tap a prescription card to start.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {runs.map((r) => (
                <View
                  key={r._id || r.id}
                  style={[s.runRow, { backgroundColor: theme.bgInset, borderColor: theme.hairline }]}
                >
                  <View style={[s.statusDot, {
                    backgroundColor:
                      r.status === 'completed' ? '#10B981' :
                      r.status === 'failed' || r.status === 'cancelled' ? '#EF4444' :
                      grad[0],
                  }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[s.runPrompt, { color: theme.text }]}>{r.prompt}</Text>
                    {!!r.result_summary && (
                      <Text numberOfLines={1} style={[s.dim, { color: theme.textSec, marginTop: 2 }]}>
                        {r.result_summary}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.dim, { color: theme.textTer }]}>{r.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
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
    </View>
  );
}

/* ─── Empty state — Connect AI in Marketplace ───────────────────── */
function EmptyConnectAI({ gradient, textColor, subColor, borderColor, onConnect }: {
  gradient: [string, string]; textColor: string; subColor: string; borderColor: string; onConnect: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(280)} style={[s.empty, { borderColor }]}>
      <View style={[s.emptyIcon, { borderColor: gradient[0] + '60', backgroundColor: gradient[0] + '14' }]}>
        <MaterialCommunityIcons name="key-variant" size={28} color={gradient[0]} />
      </View>
      <Text style={[s.emptyTitle, { color: textColor }]}>Bring your own AI to unlock Agent K</Text>
      <Text style={[s.emptySub, { color: subColor }]}>
        Agent K runs every action with the AI provider YOU connect — your keys, your data, your control.
        Choose from OpenAI, Anthropic, Gemini, Mistral, Cohere, Perplexity, Groq and more in the Marketplace.
      </Text>
      <Pressable onPress={onConnect}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyCta}>
          <MaterialCommunityIcons name="storefront-outline" size={14} color="#fff" />
          <Text style={s.emptyCtaText}>Open AI Marketplace</Text>
        </LinearGradient>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['OpenAI', 'Anthropic', 'Gemini', 'Mistral', 'Cohere', 'Perplexity', 'Groq'].map((p) => (
          <View key={p} style={[s.chip, { borderColor }]}>
            <Text style={[s.chipText, { color: subColor }]}>{p}</Text>
          </View>
        ))}
      </View>
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
' as any },
});
