/**
 * Profile editor shared primitives — Card, Field, TextField, TextArea, SelectField,
 * Toggle, ToggleRow, ChipPicker, SaveBar.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Animated, Platform } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export const C = {
  bg: '#0C0818',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.09)',
  borderHi: 'rgba(255,255,255,0.18)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.65)',
  text3: 'rgba(255,255,255,0.45)',
  purple: '#A78BFA',
  green: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  cyan: '#22D3EE',
};

export function Card({ title, subtitle, children, action }: {
  title?: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      {(title || action) && (
        <View style={s.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {!!title && <Text style={s.cardTitle}>{title}</Text>}
            {!!subtitle && <Text style={s.cardSub}>{subtitle}</Text>}
          </View>
          {action}
        </View>
      )}
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

export function Field({ label, hint, children, half }: {
  label: string; hint?: string; children: React.ReactNode; half?: boolean;
}) {
  return (
    <View style={[{ gap: 6 }, half ? { flex: 1, minWidth: 220 } : null]}>
      <Text style={s.label}>{label}</Text>
      {children}
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export function TF({ value, onChangeText, placeholder, secure, leftIcon, testID }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string;
  secure?: boolean; leftIcon?: React.ReactNode; testID?: string;
}) {
  return (
    <View style={s.tfWrap}>
      {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        secureTextEntry={secure}
        style={s.tf}
        testID={testID}
      />
    </View>
  );
}

export function TA({ value, onChangeText, placeholder, rows = 3, testID }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; rows?: number; testID?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.text3}
      multiline
      numberOfLines={rows}
      style={[s.tf, s.ta, { minHeight: rows * 22 + 16 }]}
      testID={testID}
    />
  );
}

export function SF({ value, onChange, options, placeholder, testID }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: open ? 50 : 1 }}>
      <Pressable style={s.tfWrap} onPress={() => setOpen((o) => !o)} testID={testID}>
        <Text style={[s.tf, { color: value ? C.text : C.text3, paddingVertical: 0 }]}>
          {value || placeholder || 'Select…'}
        </Text>
        <ChevronDown size={14} color={C.text2} />
      </Pressable>
      {open && (
        <View style={s.ddMenu}>
          {options.map((o) => (
            <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={s.ddItem}>
              <Text style={[s.ddText, value === o && { color: C.purple, fontFamily: 'DMSans_700Bold' }]}>{o}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function Toggle({ on, onChange, testID }: { on: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={[s.toggle, on && { backgroundColor: C.purple, borderColor: C.purple }]}
      testID={testID}
    >
      <Animated.View style={[s.toggleThumb, on && { transform: [{ translateX: 16 }] }]} />
    </Pressable>
  );
}

export function ToggleRow({ title, desc, on, onChange, testID }: {
  title: string; desc?: string; on: boolean; onChange: (v: boolean) => void; testID?: string;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <Text style={s.trTitle}>{title}</Text>
        {!!desc && <Text style={s.trDesc}>{desc}</Text>}
      </View>
      <Toggle on={on} onChange={onChange} testID={testID} />
    </View>
  );
}

export function ChipPicker({
  options, selected, onToggle, multi = true, max,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  multi?: boolean;
  max?: number;
}) {
  return (
    <View style={s.chipsWrap}>
      {options.map((o) => {
        const isSel = selected.includes(o);
        const disabled = !isSel && max != null && selected.length >= max;
        return (
          <Pressable
            key={o}
            onPress={() => !disabled && onToggle(o)}
            style={[s.chip, isSel && s.chipActive, disabled && { opacity: 0.4 }]}
            testID={`chip-${o.replace(/\s+/g, '_').toLowerCase()}`}
          >
            {isSel && <Check size={11} color="#fff" />}
            <Text style={[s.chipText, isSel && { color: '#fff' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SaveBar({ dirty, saving, onSave, onDiscard, lastSavedAt }: {
  dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; lastSavedAt?: string | null;
}) {
  return (
    <View style={s.saveBar}>
      {lastSavedAt ? (
        <Text style={s.saveStatus}>Last saved {lastSavedAt}</Text>
      ) : (
        <Text style={s.saveStatus}>{dirty ? 'You have unsaved changes' : 'All changes saved'}</Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {dirty && (
          <Pressable onPress={onDiscard} style={[s.btn, s.btnGhost]} testID="profile-discard">
            <Text style={s.btnGhostText}>Discard</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          style={[s.btn, s.btnPrimary, (!dirty || saving) && { opacity: 0.5 }]}
          testID="profile-save"
        >
          <Text style={s.btnPrimaryText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderColor: C.border, borderWidth: 1, borderRadius: 16,
    padding: 18, gap: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { color: C.text, fontFamily: 'DMSans_700Bold', fontSize: 14.5 },
  cardSub:   { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  label:     { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  hint:      { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  tfWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 8,
  },
  tf: { flex: 1, color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 13, ...({ outlineStyle: 'none' } as any) },
  ta: { textAlignVertical: 'top', paddingTop: 8 },
  ddMenu: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    backgroundColor: '#1A1426', borderColor: C.border, borderWidth: 1, borderRadius: 10,
    overflow: 'hidden', maxHeight: 220,
  },
  ddItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
  ddText: { color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 13 },

  toggle: {
    width: 38, height: 22, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: C.border, borderWidth: 1,
    padding: 2, ...({ cursor: 'pointer' } as any),
  },
  toggleThumb: {
    width: 16, height: 16, borderRadius: 99, backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1,
  },
  trTitle: { color: C.text, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  trDesc:  { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: C.border, borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  chipActive: { backgroundColor: C.purple, borderColor: C.purple },
  chipText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },

  saveBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, marginTop: 4,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, borderRadius: 14,
  },
  saveStatus: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, flexShrink: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 34, borderRadius: 9,
    ...({ cursor: 'pointer' } as any),
  },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  btnGhostText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnPrimary: { backgroundColor: C.purple, borderColor: C.purple, borderWidth: 1 },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
