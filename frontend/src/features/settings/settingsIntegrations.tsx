// TAB 3 — Integrations (connect/disconnect tools, API-key entry modal) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Plug, Pencil, X, Eye, EyeOff, ExternalLink, AlertTriangle, KeyRound, Search, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import { TOOL_DOCS, GRAD_FROM, GRAD_TO, GRAD_DEEP, GRAD_BG, Tool } from './settingsTokens';
import { s } from './settingsStyles';
import { GradientButton } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 3 — Integrations  (with Connect API-key modal)
 * ═══════════════════════════════════════════════════════════════ */
export function IntegrationsTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [groups, setGroups] = useState<{ category: string; items: Tool[] }[]>([]);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [connectTool, setConnectTool] = useState<Tool | null>(null);
  const [connectPrefill, setConnectPrefill] = useState<Record<string, string> | null>(null);
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
    setConnectPrefill(null);
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
                      onConnect={() => { setConnectPrefill(null); setConnectTool(t); }}
                      onEdit={() => { setConnectPrefill(t.credentials_plain || null); setConnectTool(t); }}
                      onDisconnect={() => disconnect(t.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <ConnectModal
        tool={connectTool}
        prefill={connectPrefill}
        onClose={() => { setConnectTool(null); setConnectPrefill(null); }}
        onConnected={onConnected}
      />
    </Animated.View>
  );
}

export function ToolCard({ tool, busy, onConnect, onEdit, onDisconnect }: {
  tool: Tool; busy: boolean; onConnect: () => void; onEdit: () => void; onDisconnect: () => void;
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
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable onPress={onEdit} disabled={busy} style={[s.toolBtnSec, { flex: 1 }, busy && { opacity: 0.5 }]}>
            <Pencil size={12} color={SAC.muted} />
            <Text style={s.toolBtnSecText}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDisconnect} disabled={busy} style={[s.toolBtnSec, { flex: 1 }, busy && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator size="small" color={SAC.muted} /> : (
              <Text style={s.toolBtnSecText}>Disconnect</Text>
            )}
          </Pressable>
        </View>
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

export function ConnectModal({ tool, prefill, onClose, onConnected }: {
  tool: Tool | null; prefill: Record<string, string> | null; onClose: () => void; onConnected: () => void;
}) {
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tool) {
      // Pre-fill the form with previously saved (non-password) credential values
      // when editing an already-connected tool, so the admin can see/review them.
      const next: Record<string, string> = {};
      if (prefill) {
        for (const [k, v] of Object.entries(prefill)) {
          if (v) next[k] = v;
        }
      }
      setCreds(next); setError(null); setShowSecret({}); setTest(null);
    }
  }, [tool, prefill]);

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
              <Text style={s.modalTitle}>{prefill ? `Edit ${tool.name}` : `Connect ${tool.name}`}</Text>
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
            {prefill ? (
              <View style={s.helpBox}>
                <Text style={s.helpText}>
                  Reviewing the saved {tool.name} credentials. Password/secret fields are hidden —
                  leave one blank to keep the saved value, or type a new one to replace it.
                </Text>
              </View>
            ) : null}

            {fields.length === 0 ? (
              <Text style={s.muted}>No credentials required — click Connect to enable.</Text>
            ) : fields.map((f) => {
              const isPwd = f.type === 'password';
              const show = !!showSecret[f.key];
              const isSavedPwd = isPwd && prefill && !creds[f.key];
              return (
                <View key={f.key} style={{ gap: 6 }}>
                  <Text style={s.modalLabel}>{f.label}</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      value={creds[f.key] || ''}
                      onChangeText={(v) => setCreds({ ...creds, [f.key]: v })}
                      placeholder={isSavedPwd ? 'Saved (leave blank to keep)' : (f.placeholder || '')}
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
                  {isSavedPwd && <Text style={s.helpInline}>Currently saved — blank keeps it, or enter a new value to change.</Text>}
                  {!isSavedPwd && f.help && <Text style={s.helpInline}>{f.help}</Text>}
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
              <Text style={s.primaryBtnText}>{prefill ? 'Save changes' : `Connect ${tool.name}`}</Text>
            </GradientButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
