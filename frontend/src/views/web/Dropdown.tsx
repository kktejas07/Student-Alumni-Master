/**
 * Dropdown — Glass/Gradient styled dropdown picker for onboarding.
 *
 * • Trigger looks identical to <WebField/>.
 * • Opens a glassy modal sheet with options (Pressable rows).
 * • Works on both Web and Native.
 * • Supports required indicator, optional flag, placeholder, and custom test IDs.
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, FlatList, Platform,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

export interface DropdownOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  label: string;
  required?: boolean;
  optional?: boolean;
  value?: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  testID?: string;
}

export function Dropdown({
  label, required, optional, value, options, onChange,
  placeholder = 'Select…', testID,
}: Props) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        testID={testID}
        style={({ hovered, pressed }: any) => [
          styles.trigger,
          (hovered || pressed) && styles.triggerHover,
        ]}
      >
        <Text style={[styles.value, !sel && styles.placeholder]} numberOfLines={1}>
          {sel?.label || placeholder}
        </Text>
        <ChevronDown size={16} color="rgba(255,255,255,0.55)" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    onPress={() => { onChange(item.value); setOpen(false); }}
                    testID={`${testID}-opt-${item.value}`}
                    style={({ hovered, pressed }: any) => [
                      styles.opt,
                      (hovered || pressed) && styles.optHover,
                      active && styles.optActive,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optLabel, active && { color: '#C4B5FD' }]}>
                        {item.label}
                      </Text>
                      {!!item.hint && <Text style={styles.optHint}>{item.hint}</Text>}
                    </View>
                    {active && <Check size={16} color="#C4B5FD" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium',
    fontSize: 12, letterSpacing: 0.4, marginBottom: 6,
  },
  req: { color: '#FCA5A5' },
  optional: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_400Regular' },

  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '120ms' } as any),
  },
  triggerHover: {
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderColor: 'rgba(167,139,250,0.35)',
  },
  value: { flex: 1, color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  placeholder: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_400Regular' },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  sheet: {
    width: '100%', maxWidth: 420,
    backgroundColor: 'rgba(20,8,40,0.96)',
    borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 18,
    padding: 16,
    shadowColor: '#7C3AED', shadowOpacity: 0.30, shadowRadius: 32, shadowOffset: { width: 0, height: 14 },
  },
  sheetTitle: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4,
  },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 10, marginBottom: 4,
    ...({ cursor: 'pointer', transitionDuration: '120ms' } as any),
  },
  optHover: { backgroundColor: 'rgba(124,58,237,0.16)' },
  optActive: { backgroundColor: 'rgba(124,58,237,0.22)' },
  optLabel: { color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  optHint: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
});
