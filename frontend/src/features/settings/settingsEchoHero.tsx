// TAB 11 — ECHO landing hero (global hero_config editor for the public /echo landing) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Image } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { getBaseUrl } from '@/src/lib/env';
import { s } from './settingsStyles';
import { Loading } from './settingsWidgets';


/* ─────────────────────────────────────────────────────────────────
 * ECHO Landing Hero — global hero_config for the public /echo landing.
 * API contract (echo_showcase.py):
 *   GET  /api/echo/admin/settings → hero_config (server merges its own
 *        defaults for keys never saved; read needs no auth)
 *   PUT  /api/echo/admin/settings → per-key merge; only keys sent are
 *        replaced, so this editor sends ONLY hero_config. Template,
 *        invoice, email and branding settings are never overwritten.
 * The existing CTA behaviour (label + fixed targets) is preserved: the
 * hero_config schema stores labels only, so no target fields are added.
 * ───────────────────────────────────────────────────────────────── */
export type HeroStatRow = { value: string; label: string; color: string };

export function HeroField({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        multiline={multiline}
        scrollEnabled={multiline}
        numberOfLines={multiline ? 3 : undefined}
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          padding: 12, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 13,
          minHeight: multiline ? 72 : undefined, textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
    </View>
  );
}

export function EchoLandingHeroTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

  // Controlled form state — populated ONLY from the saved settings response.
  const [badge, setBadge] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stats, setStats] = useState<HeroStatRow[]>([]);
  const [hostsText, setHostsText] = useState('');
  const [ctaPrimary, setCtaPrimary] = useState('');
  const [ctaSecondary, setCtaSecondary] = useState('');
  const [sectionBadge, setSectionBadge] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');

  const loadSettings = useCallback(async () => {
    setLoadState('loading');
    try {
      const base = getBaseUrl();
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('Could not load ECHO settings');
      const d = await resp.json();
      const hero = (d && d.hero_config) || {};
      // Initialise from the saved settings (server-side defaults included).
      // If loading fails the state stays empty and saving stays blocked,
      // so saved values are never overwritten with empty defaults.
      setBadge(hero.badge != null ? String(hero.badge) : '');
      setTitle(hero.title != null ? String(hero.title) : '');
      setDescription(hero.description != null ? String(hero.description) : '');
      setStats(Array.isArray(hero.stats) ? hero.stats.map((st: any) => ({
        value: st?.value != null ? String(st.value) : '',
        label: st?.label != null ? String(st.label) : '',
        color: st?.color != null ? String(st.color) : '',
      })) : []);
      setHostsText(Array.isArray(hero.recent_hosts) ? hero.recent_hosts.map(String).join('\n') : '');
      setCtaPrimary(hero.cta_primary != null ? String(hero.cta_primary) : '');
      setCtaSecondary(hero.cta_secondary != null ? String(hero.cta_secondary) : '');
      setSectionBadge(hero.section_badge != null ? String(hero.section_badge) : '');
      setSectionTitle(hero.section_title != null ? String(hero.section_title) : '');
      setSectionDescription(hero.section_description != null ? String(hero.section_description) : '');
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const statsValid = stats.every((st) =>
    (!st.value.trim() && !st.label.trim()) || (st.value.trim() && st.label.trim()));

  const save = async () => {
    if (loadState !== 'ready') { onSaved('Error: settings not loaded — reload before saving.'); return; }
    if (!statsValid) {
      onSaved('Invalid statistic: value and label are both required.');
      return;
    }
    setSaving(true);
    try {
      const base = getBaseUrl();
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const heroConfig = {
        badge: badge.trim(),
        title: title.trim(),
        description: description.trim(),
        stats: stats
          .filter((st) => st.value.trim() || st.label.trim())
          .map((st) => ({
            value: st.value.trim(),
            label: st.label.trim(),
            color: st.color.trim() || undefined,
          })),
        recent_hosts: hostsText.split('\n').map((h) => h.trim()).filter(Boolean),
        cta_primary: ctaPrimary.trim(),
        cta_secondary: ctaSecondary.trim(),
        section_badge: sectionBadge.trim(),
        section_title: sectionTitle.trim(),
        section_description: sectionDescription.trim(),
      };
      // Only `hero_config` — unrelated global settings are untouched.
      const resp = await fetch(`${base}/api/echo/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ hero_config: heroConfig }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      onSaved('ECHO landing hero saved');
    } catch (err: any) {
      onSaved(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', padding: 20, gap: 14,
  } as const;

  if (loadState === 'loading') return <Loading />;
  if (loadState === 'error') {
    return (
      <View style={[cardStyle, { alignItems: 'center', gap: 10 }]}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fca5a5' }}>Could not load ECHO settings</Text>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Loading failed — the form stays empty and saving is disabled so no saved value can be overwritten with defaults.
        </Text>
        <Pressable onPress={loadSettings} style={{
          backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22, cursor: 'pointer',
        }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={{
        padding: 16, borderRadius: 12, backgroundColor: 'rgba(124,92,252,0.10)',
        borderWidth: 1, borderColor: 'rgba(124,92,252,0.28)',
      }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#c4b5fd' }}>Public landing hero — /echo</Text>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          Global content shown above the events list on the public ECHO page. CTA buttons keep their
          current destinations (events section / contact page) — only the labels are configurable here.
          Per-event banners, images and downloads are managed in the ECHO Showcase CMS.
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Hero Content</Text>
        <HeroField label="Badge" value={badge} onChange={setBadge} placeholder="ON THE GROUND" />
        <HeroField label="Title" value={title} onChange={setTitle} placeholder="The network is a feed until it meets in person." />
        <HeroField label="Description" value={description} onChange={setDescription} placeholder="ECHO events turn feeds into handshakes." multiline />
      </View>

      <View style={cardStyle}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>Statistics</Text>
        <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#94a3b8' }}>
          The "86 events run · 31 cities · 4.8 rating" style strip under the hero title.
        </Text>
        {stats.map((st, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ width: 110, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Value</Text>
              <TextInput
                value={st.value}
                onChangeText={(v) => setStats((prev) => prev.map((p, j) => (j === i ? { ...p, value: v } : p)))}
                placeholder="86"
                placeholderTextColor="#475569"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 12.5 }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Label</Text>
              <TextInput
                value={st.label}
                onChangeText={(v) => setStats((prev) => prev.map((p, j) => (j === i ? { ...p, label: v } : p)))}
                placeholder="ECHO events across India"
                placeholderTextColor="#475569"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 12.5 }}
              />
            </View>
            <View style={{ width: 92, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Color</Text>
              <TextInput
                value={st.color}
                onChangeText={(v) => setStats((prev) => prev.map((p, j) => (j === i ? { ...p, color: v } : p)))}
                placeholder="#4B3FD6"
                placeholderTextColor="#475569"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, color: '#e2e8f0', fontFamily: FONTS.medium, fontSize: 12.5 }}
              />
            </View>
            <Pressable onPress={() => setStats((prev) => prev.filter((_, j) => j !== i))} style={{
              width: 34, height: 34, borderRadius: 8, marginBottom: 2, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', cursor: 'pointer',
            }}>
              <Trash2 size={14} color="#f87171" />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => setStats((prev) => [...prev, { value: '', label: '', color: '' }])} style={{
          alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
          borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, cursor: 'pointer',
          backgroundColor: 'rgba(37,99,235,0.12)', borderWidth: 1, borderColor: '#2563EB',
        }}>
          <Plus size={13} color="#93C5FD" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#93C5FD' }}>Add statistic</Text>
        </Pressable>
      </View>

      <View style={cardStyle}>
        <HeroField
          label="Recent host names — one per line"
          value={hostsText}
          onChange={setHostsText}
          placeholder={'Sreenidhi Institute\nVNR VJIET\nCBIT Hyderabad'}
          multiline
        />
      </View>

      <View style={cardStyle}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>CTA Button Labels</Text>
        <HeroField label="Primary button" value={ctaPrimary} onChange={setCtaPrimary} placeholder="Browse all events" />
        <HeroField label="Secondary button" value={ctaSecondary} onChange={setCtaSecondary} placeholder="Contact us" />
      </View>

      <View style={cardStyle}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#f1f5f9' }}>ECHO Events Section Header</Text>
        <HeroField label="Section badge" value={sectionBadge} onChange={setSectionBadge} placeholder="UPCOMING ECHO EVENTS" />
        <HeroField label="Section title" value={sectionTitle} onChange={setSectionTitle} placeholder="Meet them in person." />
        <HeroField label="Section description" value={sectionDescription} onChange={setSectionDescription} placeholder="Image galleries, partners, speakers…" multiline />
      </View>

      <Pressable onPress={save} disabled={saving} style={{
        backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center', cursor: 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{saving ? 'Saving...' : 'Save ECHO Landing Hero'}</Text>
      </Pressable>
    </View>
  );
}
