// field helpers (inputs, selects, icons, tooltips) used by every editor — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import React, { useState } from 'react';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

// ── Field helpers ─────────────────────────────────────────────────────────────
export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 0.4 }}>
          {label.toUpperCase()}
        </Text>
        {hint && (
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{hint}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

// Human date ("July 31, 2026") <-> ISO date ("2026-07-31") for native pickers
export function humanToIso(human: string): string {
  if (!human) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(human)) return human;
  const t = Date.parse(human);
  if (isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function isoToHuman(iso: string): string {
  if (!iso) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
// 12h display ("10:00 AM") <-> 24h native time ("10:00")
export function humanTimeToNative(t: string): string {
  if (!t) return '';
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (m) {
    let h = parseInt(m[1], 10), mm = m[2], ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${mm}`;
  }
  return '';
}
export function nativeToHumanTime(t: string): string {
  if (!t) return '';
  const m = t.trim().match(/^(\d{2}):(\d{2})$/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

export function FieldDate({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={humanToIso(value)}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? isoToHuman(e.target.value) : '')}
        style={{
          backgroundColor: '#101019', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

export function FieldTime({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="time"
        value={humanTimeToNative(value)}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? nativeToHumanTime(e.target.value) : '')}
        style={{
          backgroundColor: '#101019', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

// ISO date field (YYYY-MM-DD) — use where the backend parses ISO directly
export function IsoDateField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.slice(0, 10) : ''}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? e.target.value.slice(0, 10) : '')}
        style={{
          backgroundColor: '#101019', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

export const fi = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: SAC.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: FONTS.med, fontSize: 13, color: SAC.text,
  },
});

export function Field({ value, onChangeText, placeholder, multiline = false, rows = 3 }: any) {
  return (
    <TextInput
      value={value || ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={SAC.dim}
      multiline={multiline}
      numberOfLines={multiline ? rows : 1}
      style={[fi.input, multiline && { minHeight: rows * 22, textAlignVertical: 'top' }]}
    />
  );
}

export function SelectNative({ value, onChange, options }: any) {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          backgroundColor: '#101019',
          border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text,
          width: '100%', appearance: 'none',
        } as any}
      >
        {options.map((o: string) => (
          <option key={o} value={o} style={{ backgroundColor: '#101019' }}>{o}</option>
        ))}
      </select>
    );
  }
  return <Field value={value} onChangeText={onChange} placeholder="Select…" />;
}

// ── Icon button ───────────────────────────────────────────────────────────────
export const cs = StyleSheet.create({
  meta: { fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
});

// ── Hover-tooltip icon action button (super-admin rows) ──────────────────────
export function IconAction({ icon, label, color, bg, onPress, disabled = false, danger = false }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg?: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <View
      style={{ position: 'relative', zIndex: hover ? 50 : 1 } as any}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          width: 30, height: 30, borderRadius: 8,
          backgroundColor: bg || (danger ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'),
          alignItems: 'center', justifyContent: 'center',
          cursor: (disabled ? 'default' : 'pointer') as any,
          opacity: disabled ? 0.45 : 1,
          transitionDuration: '120ms' as any,
        }}
      >
        {icon}
      </Pressable>
      {hover && !disabled && (
        <View style={{
          position: 'absolute', top: '100%', left: '50%',
          transform: [{ translateX: -50 }] as any,
          marginTop: 5, paddingHorizontal: 7, paddingVertical: 4,
          backgroundColor: '#0B0F1E', borderRadius: 6,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
          maxWidth: 150, zIndex: 60, whiteSpace: 'nowrap' as any,
        } as any}>
          <Text style={{ color: '#E9E4FF', fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', lineHeight: 13 }}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ── Generic hover tooltip wrapper (any icon button) ──────────────────────────
export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <View
      style={{ position: 'relative', zIndex: hover ? 50 : 1 } as any}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {children}
      {hover && (
        <View style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: [{ translateX: -50 }] as any,
          marginBottom: 5, paddingHorizontal: 7, paddingVertical: 4,
          backgroundColor: '#0B0F1E', borderRadius: 6,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
          maxWidth: 160, zIndex: 60, whiteSpace: 'nowrap' as any,
        } as any}>
          <Text style={{ color: '#E9E4FF', fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', lineHeight: 13 }}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ── Single image upload widget ────────────────────────────────────────────────
