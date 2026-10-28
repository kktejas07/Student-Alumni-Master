// TAB 1 — Manage Profile (profile tab, signature card + editor modal) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Platform, Modal, TextInput, ScrollView } from 'react-native';
import { Pencil, Check, X, Mail } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { Card } from '@/src/views/web/portals/superadmin/applekit';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { GRAD_FROM, GRAD_TO, GRAD_DEEP } from './settingsTokens';
import { s } from './settingsStyles';
import { GradientButton, Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 1 — Manage Profile
 * ═══════════════════════════════════════════════════════════════ */
export function ProfileTab({ onSaved }: { onSaved: (s?: string) => void }) {
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
export function SignatureCard({ signature, onSaved }: { signature: string; onSaved: () => Promise<void> | void }) {
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

export function SignatureEditorModal({ visible, initial, onClose, onSaved }: {
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
