/**
 * Profile editor shared primitives — Card, Field, TextField, TextArea, SelectField,
 * Toggle, ToggleRow, ChipPicker, SaveBar.
 */
import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Animated, Platform, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { COUNTRY_CODES } from './countryCodes';

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

export function TF({ value, onChangeText, placeholder, secure, leftIcon, testID, onSubmitEditing }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string;
  secure?: boolean; leftIcon?: React.ReactNode; testID?: string;
  onSubmitEditing?: () => void;
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
        onSubmitEditing={onSubmitEditing}
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
      style={[
        s.tf,
        s.ta,
        {
          minHeight: rows * 22 + 16,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderColor: C.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
        },
      ]}
      testID={testID}
    />
  );
}

export function SF({ value, onChange, options, placeholder, testID }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && wrapRef.current.contains && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    }
    return () => {
      if (Platform.OS === 'web') document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <View ref={wrapRef} style={[{ position: 'relative' }, Platform.OS === 'web' ? { zIndex: open ? 9999 : 1 } as any : { zIndex: open ? 9999 : 1 }]}>
      <Pressable style={[s.tfWrap, open && { borderColor: C.purple, backgroundColor: 'rgba(167,139,250,0.08)' }]} onPress={() => setOpen((o) => !o)} testID={testID}>
        <Text style={[s.tf, { color: value ? C.text : C.text3, paddingVertical: 0 }]}>
          {value || placeholder || 'Select…'}
        </Text>
        <ChevronDown size={14} color={open ? C.purple : C.text2} />
      </Pressable>
      {open && (
        <View style={s.ddMenu}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
            {options.map((o) => (
              <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={s.ddItem}>
                <Text style={[s.ddText, value === o && { color: C.purple, fontFamily: 'DMSans_700Bold' }]}>{o}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export function SSF({ value, onChange, options, placeholder, testID }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && wrapRef.current.contains && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    }
    return () => {
      if (Platform.OS === 'web') document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <View ref={wrapRef} style={[{ position: 'relative' }, Platform.OS === 'web' ? { zIndex: open ? 9999 : 1 } as any : { zIndex: open ? 9999 : 1 }]}>
      <Pressable style={[s.tfWrap, open && { borderColor: C.purple, backgroundColor: 'rgba(167,139,250,0.08)' }]} onPress={() => setOpen((o) => !o)} testID={testID}>
        <Text style={[s.tf, { color: value ? C.text : C.text3, paddingVertical: 0 }]} numberOfLines={1}>
          {value || placeholder || 'Select…'}
        </Text>
        <ChevronDown size={14} color={open ? C.purple : C.text2} />
      </Pressable>
      {open && (
        <View style={s.ddMenu}>
          <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: C.borderHi || 'rgba(255,255,255,0.1)' }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
              placeholderTextColor={C.text3}
              style={[{ color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 13, padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 }, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
              autoFocus
            />
          </View>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {filtered.map((o) => (
              <Pressable key={o} onPress={() => { onChange(o); setOpen(false); }} style={s.ddItem}>
                <Text style={[s.ddText, value === o && { color: C.purple, fontFamily: 'DMSans_700Bold' }]}>{o}</Text>
              </Pressable>
            ))}
            {filtered.length === 0 && (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: C.text3, fontSize: 12, fontFamily: 'DMSans_400Regular' }}>No matches found</Text>
              </View>
            )}
          </ScrollView>
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

export function PhoneField({ value, onChange, placeholder, testID }: {
  value: string; onChange: (v: string) => void; placeholder?: string; testID?: string;
}) {
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  
  let code = '+91';
  let num = value || '';
  
  if (value && value.startsWith('+')) {
    const match = sortedCodes.find(c => value.startsWith(c.code));
    if (match) {
      code = match.code;
      num = value.slice(match.code.length);
    }
  } else if (value && !value.startsWith('+')) {
    num = value;
  }

  const handleCodeChange = (newDisplayVal: string) => {
    const newCode = newDisplayVal.split(' ')[0];
    onChange(newCode + num);
  };

  const handleNumChange = (t: string) => {
    const digits = t.replace(/\D/g, '');
    const config = COUNTRY_CODES.find(c => c.code === code);
    if (config && digits.length > config.max) {
      return; 
    }
    // If the user clears the number, we might just want to keep the code, or clear everything.
    // Usually it's better to store code + digits. If digits is empty, maybe we just store the code.
    onChange(digits ? code + digits : '');
  };

  const selectedDisplay = `${code} (${COUNTRY_CODES.find(c => c.code === code)?.name || ''})`;
  const options = COUNTRY_CODES.map(c => `${c.code} (${c.name})`);

  return (
    <View style={[{ flexDirection: 'row', gap: 10 }, Platform.OS === 'web' ? { zIndex: 99 } : {}]}>
      <View style={{ flex: 4, position: 'relative', zIndex: 99 }}>
        <SSF 
          value={selectedDisplay} 
          onChange={handleCodeChange} 
          options={options} 
          placeholder="Code" 
        />
      </View>
      <View style={{ flex: 7 }}>
        <TF 
          value={num} 
          onChangeText={handleNumChange} 
          placeholder={placeholder || 'Number...'} 
          testID={testID} 
        />
      </View>
    </View>
  );
}
;
