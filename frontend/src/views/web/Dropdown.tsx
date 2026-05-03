/**
 * Dropdown — Standardised selector matching the canonical OptionListCard
 * (Institution Type design).
 *
 * Used by all 4 onboarding flows for any single-select picker (institution
 * type, batch year, graduation year, etc.). Includes built-in "Other"
 * option that switches the field into a labelled free-text input.
 *
 * Props match the legacy Dropdown surface so existing call sites work.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Platform, TextInput,
} from 'react-native';
import { ChevronDown, Check, Edit3 } from 'lucide-react-native';
import { OptionListCard } from '@/src/views/components/OptionListCard';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';

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
  /** Show "Other" item that toggles into a text input. Default: true. */
  allowOther?: boolean;
  /** Extra label for the dropdown overlay header (e.g. "INSTITUTION TYPE"). */
  overlayHeader?: string;
}

const OTHER_VALUE = '__other__';

export function Dropdown({
  label, required, optional, value, options, onChange,
  placeholder = 'Select…', testID, allowOther = true, overlayHeader,
}: Props) {
  const { primary } = useRoleTheme();
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');

  const sel = options.find((o) => o.value === value);
  // If the current value isn't in options, we're in "manual" mode.
  const showingManual = manualMode || (!!value && !sel);

  const triggerLabel = showingManual
    ? (manualText || value || placeholder)
    : (sel?.label || placeholder);

  return (
    <View style={{ marginBottom: 14, position: 'relative' }}>
      <Text style={s.label}>
        {label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
        {optional ? <Text style={s.optional}>  Optional</Text> : null}
      </Text>

      {/* Trigger / Manual input */}
      {showingManual ? (
        <View style={[s.triggerRow, { borderColor: primary }]}>
          <TextInput
            value={manualText || value || ''}
            onChangeText={(t) => { setManualText(t); onChange(t); }}
            placeholder={`Please enter your ${label.toLowerCase()}`}
            placeholderTextColor="rgba(255,255,255,0.32)"
            style={s.manualInput}
            autoCapitalize="words"
            testID={testID}
          />
          <Pressable
            onPress={() => { setManualMode(false); setManualText(''); onChange(''); setOpen(true); }}
            style={s.editPill}
          >
            <ChevronDown size={14} color="#FFF" />
            <Text style={s.editPillText}>Pick</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          testID={testID}
          style={({ hovered, pressed }: any) => [
            s.triggerRow,
            hovered && { borderColor: `${primary}88` },
            pressed && { borderColor: primary },
            open && { borderColor: primary, backgroundColor: `${primary}10` },
          ]}
        >
          <Text style={[s.triggerText, !sel && s.triggerPlaceholder]} numberOfLines={1}>{triggerLabel}</Text>
          <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      )}

      {/* Modal overlay — backdrop click closes; positioned-centred card */}
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            // Stop propagation: tapping inside the card should not close it
            onPress={(e: any) => e?.stopPropagation?.()}
            style={s.cardWrap}
          >
            <OptionListCard
              headerLabel={overlayHeader || label.toUpperCase()}
              options={options}
              selectedValue={value}
              onSelect={(opt) => { onChange(opt.value); setManualMode(false); setOpen(false); }}
              showOther={allowOther}
              onSelectOther={() => { setOpen(false); setManualMode(true); setManualText(''); onChange(''); }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13, marginBottom: 8 },
  optional: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_500Medium', fontSize: 11 },
  triggerRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  triggerText: { flex: 1, color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  triggerPlaceholder: { color: 'rgba(255,255,255,0.4)' },
  manualInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}),
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(124,58,237,0.4)',
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  editPillText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 420,
  },
});
