// TAB — Settings Changelog (ST2): append-only timeline of platform setting changes with inline old→new diff, filters, CSV export and rollback.
// @ts-nocheck
import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Platform, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import {
  History, Download, RotateCcw, ChevronDown, ChevronRight, Filter,
  ArrowRight, Eye, EyeOff, X, Check, AlertTriangle, ShieldAlert,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SAC, useSAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import { GRAD_TO, GRAD_FROM } from './settingsTokens';
import { s } from './settingsStyles';
import { GradientButton, Loading } from './settingsWidgets';

type Entry = {
  id: string;
  section: string;
  key: string;
  label: string;
  old_value: any;
  new_value: any;
  action: string;
  at: string;
  is_secret?: boolean;
  changed_by?: { user_id?: string; email?: string; name?: string };
  rolled_back_from?: string;
};

const SECTION_LABELS: Record<string, string> = {
  feature_flags: 'Feature Flags',
  system_settings: 'System Settings',
  roles: 'Roles & Permissions',
  profile: 'Admin Profile',
};

const ACTION_TINT: Record<string, string> = {
  update: GRAD_TO,
  create: '#10B981',
  delete: '#EF4444',
  reset: '#A855F7',
  rollback: '#38BDF8',
};

/* ─────────────────────────────────────────────────────────────────
 * Value formatting — values may be scalars, lists or objects.
 * ───────────────────────────────────────────────────────────────── */
function fmtValue(v: any): string {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v === '' ? '""' : v;
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return v.map((x) => (typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x))).join(', ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function fmtWhen(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ═════════════════════════════════════════════════════════════════
 * Changelog tab
 * ═══════════════════════════════════════════════════════════════ */
export function ChangelogTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [sections, setSections] = useState<{ section: string; count: number; keys: string[] }[]>([]);
  const [section, setSection] = useState<string | null>(null);
  const [actor, setActor] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Entry | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showValues, setShowValues] = useState(true);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (section) q.set('section', section);
      if (actor.trim()) q.set('actor', actor.trim());
      const res: any = await request<any>(`/admin/settings-changelog?${q.toString()}`);
      setEntries(res?.entries || []);
    } catch {
      setEntries([]);
    }
    try {
      const res: any = await request<any>('/admin/settings-changelog/sections');
      setSections(res?.sections || []);
    } catch {
      setSections([]);
    }
  }, [section, actor]);

  useEffect(() => { load(); }, [load]);

  const onRollback = async (entry: Entry) => {
    setBusyId(entry.id);
    try {
      const res: any = await request(`/admin/settings-changelog/${entry.id}/rollback`, {
        method: 'POST',
        body: { confirm: true },
      });
      setConfirm(null);
      onSaved(res?.message || 'Rolled back');
      await load();
    } catch (e: any) {
      onSaved(e?.message || 'Rollback failed');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const { getBaseUrl } = await import('@/src/lib/env');
      const token = await tokenStore.getAccess();
      const q = new URLSearchParams();
      if (section) q.set('section', section);
      const resp = await fetch(`${getBaseUrl()}/api/admin/settings-changelog/changelog.csv?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'settings_changelog.csv';
      a.click();
      URL.revokeObjectURL(url);
      onSaved('Changelog exported');
    } catch (e: any) {
      onSaved(e?.message || 'Export failed');
    }
  };

  const totalCount = useMemo(() => sections.reduce((n, x) => n + (x.count || 0), 0), [sections]);

  if (entries === null) return <Loading />;

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      {/* ── Header ── */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Settings Changelog</Text>
            <Text style={s.cardSub}>
              Every platform setting change, who made it and what it was before.
              Append-only — nothing here is ever edited or removed.
            </Text>
          </View>
          <Pressable onPress={() => setShowFilter((v) => !v)} style={({ hovered }: any) => [
            s.selectBtn,
            hovered && Platform.OS === 'web' ? { borderColor: 'rgba(251,146,60,0.60)' } : null,
          ]}>
            <Filter size={13} color={showFilter ? GRAD_TO : SAC.muted} />
            <Text style={[s.selectValue, !showFilter && { color: SAC.muted }]}>Filter</Text>
          </Pressable>
          <Pressable onPress={exportCsv} style={({ hovered }: any) => [
            s.selectBtn,
            hovered && Platform.OS === 'web' ? { borderColor: 'rgba(251,146,60,0.60)' } : null,
          ]}>
            <Download size={13} color={GRAD_TO} />
            <Text style={s.selectValue}>CSV</Text>
          </Pressable>
        </View>

        {showFilter && (
          <View style={{ marginTop: 14, gap: 12 }}>
            {/* Section filter */}
            <View style={{ gap: 6 }}>
              <Text style={s.label}>SECTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <FilterPill label={`All (${totalCount})`} active={!section} onPress={() => setSection(null)} />
                {sections.map((sec) => (
                  <FilterPill
                    key={sec.section}
                    label={`${SECTION_LABELS[sec.section] || sec.section} (${sec.count})`}
                    active={section === sec.section}
                    onPress={() => setSection(section === sec.section ? null : sec.section)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Actor filter */}
            <View style={{ gap: 6 }}>
              <Text style={s.label}>CHANGED BY (EMAIL)</Text>
              <View style={s.searchRow}>
                <View style={[s.searchWrap, { flex: 1, minWidth: 200 }]}>
                  <TextInput
                    style={s.searchInput}
                    value={actor}
                    onChangeText={setActor}
                    placeholder="e.g. admin@college.edu"
                    placeholderTextColor={SAC.dim}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Pressable onPress={() => setActor('')} style={s.clearBtn}>
                  <Text style={s.clearBtnText}>Clear</Text>
                </Pressable>
              </View>
            </View>

            {/* Value visibility */}
            <Pressable
              onPress={() => setShowValues((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {showValues
                ? <Eye size={13} color={GRAD_TO} />
                : <EyeOff size={13} color={SAC.muted} />}
              <Text style={[s.subtle, { color: showValues ? GRAD_TO : SAC.muted }]}>
                {showValues ? 'Values visible' : 'Values hidden'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Timeline ── */}
      {!entries.length ? (
        <View style={s.emptyBox}>
          <History size={22} color={SAC.dim} />
          <Text style={s.emptyTitle}>No changes recorded yet</Text>
          <Text style={s.emptySub}>
            Toggle a feature flag or edit a system setting and it will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {entries.map((e, idx) => {
            const isOpen = expanded === e.id;
            const tint = ACTION_TINT[e.action] || SAC.muted;
            const actorName = e.changed_by?.name || e.changed_by?.email || 'system';
            return (
              <Animated.View key={e.id} entering={FadeInDown.duration(200).delay(Math.min(idx, 12) * 12)}>
                <View style={s.card}>
                  <Pressable
                    onPress={() => setExpanded(isOpen ? null : e.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <View style={[s.iconBox, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
                      {e.action === 'rollback'
                        ? <RotateCcw size={14} color={tint} />
                        : <History size={14} color={tint} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.toggleTitle} numberOfLines={1}>
                        {e.label || e.key}
                      </Text>
                      <Text style={s.toggleDesc} numberOfLines={1}>
                        {SECTION_LABELS[e.section] || e.section} · {actorName} · {fmtWhen(e.at)}
                      </Text>
                    </View>
                    <View style={[s.pillNeutral, { borderColor: tint + '55', backgroundColor: tint + '18' }]}>
                      <Text style={[s.pillNeutralText, { color: tint }]}>{e.action}</Text>
                    </View>
                    {isOpen ? <ChevronDown size={15} color={SAC.muted} /> : <ChevronRight size={15} color={SAC.muted} />}
                  </Pressable>

                  {isOpen && (
                    <View style={{ marginTop: 14, gap: 12 }}>
                      {/* Inline diff */}
                      <View style={{ gap: 6 }}>
                        <Text style={s.label}>CHANGE</Text>
                        <DiffRow label="Before" value={showValues ? fmtValue(e.old_value) : '••••'} tint="#EF4444" />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
                          <ArrowRight size={12} color={SAC.dim} />
                        </View>
                        <DiffRow label="After" value={showValues ? fmtValue(e.new_value) : '••••'} tint="#10B981" />
                      </View>

                      {e.is_secret && (
                        <View style={[s.helpBox, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                          <ShieldAlert size={14} color={SAC.red} />
                          <Text style={[s.helpText, { color: SAC.red }]}>
                            This is a secret value — it was masked before being written to the log
                            and cannot be restored by rollback.
                          </Text>
                        </View>
                      )}

                      {e.rolled_back_from && (
                        <Text style={s.muted}>Reverted a change from {String(e.rolled_back_from).slice(-8)}.</Text>
                      )}

                      {/* Rollback action */}
                      {e.is_secret ? (
                        <View style={[s.helpBox, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                          <AlertTriangle size={14} color={SAC.red} />
                          <Text style={[s.helpText, { color: SAC.red }]}>
                            Rollback unavailable for secrets — the original value was never stored.
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setConfirm(e)}
                          style={({ hovered }: any) => [
                            s.dangerBtn,
                            hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(56,189,248,0.10)', borderColor: 'rgba(56,189,248,0.45)' } : null,
                          ]}>
                          <RotateCcw size={13} color="#38BDF8" />
                          <Text style={[s.dangerBtnText, { color: '#38BDF8' }]}>Roll back this change</Text>
                          <View style={{ flex: 1 }} />
                          <ChevronRight size={13} color="#38BDF8" />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* ── Rollback confirm modal ── */}
      {confirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
          <Pressable style={s.modalBackdrop} onPress={() => setConfirm(null)}>
            <Pressable onPress={(e) => e.stopPropagation?.()}>
              <Animated.View entering={FadeInDown.duration(200)} style={s.modalCard}>
                <View style={s.modalHead}>
                  <View style={[s.iconBox, { backgroundColor: 'rgba(56,189,248,0.14)', borderColor: 'rgba(56,189,248,0.45)' }]}>
                    <RotateCcw size={16} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>Roll back this change?</Text>
                    <Text style={s.modalSub}>
                      {confirm.label || confirm.key} will be restored to its previous value.
                    </Text>
                  </View>
                  <Pressable onPress={() => setConfirm(null)} style={s.modalClose}>
                    <X size={16} color={SAC.muted} />
                  </Pressable>
                </View>

                <View style={{ gap: 10, marginTop: 14 }}>
                  <DiffRow label="Currently" value={fmtValue(confirm.new_value)} tint="#EF4444" />
                  <DiffRow label="Will become" value={fmtValue(confirm.old_value)} tint="#10B981" />
                </View>

                <Text style={[s.muted, { marginTop: 12 }]}>
                  The rollback is written to the changelog as its own entry — the original record stays.
                </Text>

                <View style={s.modalFooter}>
                  <Pressable onPress={() => setConfirm(null)} style={s.secondaryBtn}>
                    <Text style={s.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                  <GradientButton onPress={() => onRollback(confirm)} loading={busyId === confirm.id}>
                    <Check size={14} color="#fff" />
                    <Text style={s.primaryBtnText}>Confirm rollback</Text>
                  </GradientButton>
                </View>
              </Animated.View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Small pieces
 * ───────────────────────────────────────────────────────────────── */
function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.catPill,
        active && { backgroundColor: 'rgba(251,146,60,0.16)', borderColor: 'rgba(251,146,60,0.45)' },
      ]}>
      <Text style={[s.catPillText, active && { color: GRAD_TO, fontFamily: FONTS.xbold }]}>{label}</Text>
    </Pressable>
  );
}

function DiffRow({ label, value, tint }: { label: string; value: string; tint: string }) {
  const T = useSAC();
  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: tint + '33',
      padding: 10,
      gap: 4,
    }}>
      <Text style={[s.label, { color: tint, fontSize: 9.5 }]}>{label.toUpperCase()}</Text>
      <Text
        style={{
          color: SAC.text, fontFamily: FONTS.mono, fontSize: 12, lineHeight: 17,
        }}
        selectable>
        {value}
      </Text>
    </View>
  );
}
