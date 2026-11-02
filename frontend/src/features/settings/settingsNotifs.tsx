// TAB 5 — Notifications (per-event channel matrix) + the shared liveAgo() time-ago helper — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { request } from '@/src/models/services/api';
import { GRAD_TO } from './settingsTokens';
import { s } from './settingsStyles';
import { Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 5 — Notifications
 * ═══════════════════════════════════════════════════════════════ */
export function NotificationsTab({ onSaved }: { onSaved: (s?: string) => void }) {
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

export function liveAgo(iso?: string) {
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
