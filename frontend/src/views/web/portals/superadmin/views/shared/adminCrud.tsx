/**
 * Shared CRUD list/editor shell for Super Admin "ordered content" views
 * (Partners, Promotions, ...).
 *
 *  - `crud`                 shared StyleSheet (header, row chrome, toggle,
 *                           icon buttons, delete confirm, modal, inputs)
 *  - `useThemedCrudStyles`  theme-swap hook (same mechanism the views use
 *                           for their own sheets)
 *  - `RowActions`           visible/hidden toggle + edit/delete buttons
 *  - `DeleteConfirmBar`     inline destructive confirm strip
 *  - `CheckToggle`          checkbox-style boolean row for editors
 *  - `EditorModal`          modal with gradient hero, scroll body, error box
 *                           and Cancel/Submit actions
 *  - `useWebImageInput`     wires a hidden <input type=file> to a base64
 *                           callback with type/size validation (web only)
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Pencil, Trash2, X, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../../tokens';
import { GRAD, GradientButton, SecondaryButton, IconBox } from '../../applekit';

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────── */
export const crud = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 16 },
  sub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  btnText: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' as any },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  refreshText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  orderPill: {
    width: 30, height: 24, borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  orderText: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11 },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleBtnOn: { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.10)' },
  toggleText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  iconBtn: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  confirmBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    paddingVertical: 10, paddingHorizontal: 14, marginTop: -4,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  /* modal */
  modalBg: {
    flex: 1, backgroundColor: SAC.panel2,
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },

  input: {
    color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkBox: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11 },

  warnBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
  },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});

/** Swap the baked-in dark colours of the shared sheet for the active theme. */
export function useThemedCrudStyles() {
  const T = useSAC();
  Object.assign(crud, resolveColors(crud, T));
  return T;
}

/* ────────────────────────────────────────────────────────────────────
 * Row actions
 * ────────────────────────────────────────────────────────────────── */
export function RowActions({
  active, onToggle, onEdit, onRequestDelete, onLabel, offLabel,
}: {
  active: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <>
      <Pressable onPress={onToggle} style={[crud.toggleBtn, active && crud.toggleBtnOn]}>
        {active
          ? <Eye  size={12} color={GRAD.to} />
          : <EyeOff size={12} color={SAC.muted} />}
        <Text style={[crud.toggleText, active && { color: GRAD.to }]}>
          {active ? onLabel : offLabel}
        </Text>
      </Pressable>

      {/* Edit / Delete */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={onEdit} style={crud.iconBtn}>
          <Pencil size={12} color={SAC.muted} />
        </Pressable>
        <Pressable onPress={onRequestDelete} style={[crud.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
          <Trash2 size={12} color="#FCA5A5" />
        </Pressable>
      </View>
    </>
  );
}

export function DeleteConfirmBar({ name, onCancel, onConfirm }: {
  name: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(160)} style={crud.confirmBar}>
      <AlertTriangle size={13} color="#FCA5A5" />
      <Text style={[crud.muted, { color: '#FCA5A5', flex: 1 }]}>
        Delete "{name}"? This cannot be undone.
      </Text>
      <SecondaryButton size="sm" onPress={onCancel}>
        <Text style={crud.secText}>Cancel</Text>
      </SecondaryButton>
      <Pressable onPress={onConfirm} style={crud.destructiveBtn}>
        <Trash2 size={11} color="#fff" />
        <Text style={crud.btnText}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Editor pieces
 * ────────────────────────────────────────────────────────────────── */
export function CheckToggle({ value, onToggle, label, style }: {
  value: boolean; onToggle: () => void; label: string; style?: any;
}) {
  return (
    <Pressable onPress={onToggle} style={[crud.toggleRow, style]}>
      <View style={[crud.checkBox, value && { backgroundColor: GRAD.to, borderColor: GRAD.to }]}>
        {value && <Check size={11} color="#fff" />}
      </View>
      <Text style={crud.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function EditorModal({
  Icon, title, subtitle, onClose, maxWidth, bodyMaxHeight,
  error, busy, submitLabel, onSubmit, children,
}: {
  Icon: any;
  title: string;
  subtitle: string;
  onClose: () => void;
  maxWidth: number;
  bodyMaxHeight: number;
  error: string | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={crud.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={[crud.modalCard, { maxWidth }]}>
          {/* Header */}
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={crud.modalHero}>
            <IconBox size={40}><Icon size={20} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={crud.modalTitle}>{title}</Text>
              <Text style={crud.muted}>{subtitle}</Text>
            </View>
            <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: bodyMaxHeight }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            {children}

            {error && (
              <View style={crud.warnBox}>
                <AlertTriangle size={12} color="#FCA5A5" />
                <Text style={[crud.muted, { color: '#FCA5A5', flex: 1 }]}>{error}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={crud.actionsRow}>
              <SecondaryButton onPress={onClose}>
                <Text style={crud.secText}>Cancel</Text>
              </SecondaryButton>
              <GradientButton onPress={onSubmit} loading={busy}>
                <Check size={13} color="#fff" />
                <Text style={crud.btnText}>{submitLabel}</Text>
              </GradientButton>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Web file input -> base64
 * ────────────────────────────────────────────────────────────────── */
export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Attach a change listener to each hidden `<input type="file">` ref and
 * deliver the chosen image as a data URI. Web only; no-op elsewhere.
 */
export function useWebImageInput(
  inputs: Array<{ ref: React.MutableRefObject<any>; onDataUri: (uri: string) => void }>,
  setError: (msg: string | null) => void,
  messages: { type: string; size: string },
  maxBytes = 2_000_000,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const offs = inputs.map(({ ref, onDataUri }) => {
      const el = ref.current;
      if (!el) return () => {};
      const handler = async (e: any) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) { setError(messages.type); return; }
        if (f.size > maxBytes)        { setError(messages.size); return; }
        setError(null);
        onDataUri(await readAsDataURL(f));
      };
      el.addEventListener('change', handler);
      return () => el.removeEventListener('change', handler);
    });
    return () => { offs.forEach((off) => off()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
