/**
 * DarkDropdown — Custom dark-themed select component matching StudentAlumni form design.
 *
 * Supports single selection from an array of { value, label } options.
 * Renders cleanly on desktop and mobile with accessible popover overlay.
 */
import * as React from 'react';
import { useState } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, Platform,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { PALETTE, FONTS, TYPO } from '../portals/student/tokens';
import { GRAD } from '../portals/student/portalkit';

export interface SelectOption {
  value: string;
  label: string;
}

interface DarkDropdownProps {
  label?: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  modalTitle?: string;
}

export function DarkDropdown({
  label,
  required = false,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  disabled = false,
  modalTitle,
}: DarkDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value || '';

  return (
    <View style={s.wrap}>
      {label ? (
        <Text style={s.label}>
          {label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ hovered, pressed }: any) => [
          s.trigger,
          error ? s.triggerError : null,
          hovered && !disabled && s.triggerHover,
          pressed && !disabled && s.triggerPress,
          open && s.triggerActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
      >
        <Text style={[s.triggerText, !displayLabel && s.placeholderText]} numberOfLines={1}>
          {displayLabel || placeholder}
        </Text>
        <ChevronDown size={18} color={PALETTE.muted} />
      </Pressable>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {open && (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{modalTitle || label || 'SELECT AN OPTION'}</Text>
              </View>

              <ScrollView style={s.optionsList} nestedScrollEnabled>
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      style={({ hovered }: any) => [
                        s.optionRow,
                        isSelected && s.optionRowSelected,
                        hovered && !isSelected && s.optionRowHover,
                      ]}
                    >
                      <Text style={[s.optionText, isSelected && s.optionTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && <Check size={16} color={GRAD.from} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = {
  wrap: { marginBottom: 4, flex: 1 },
  label: { color: '#94a3b8', fontFamily: FONTS.semi, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  trigger: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: PALETTE.glassBorder, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  triggerHover: { borderColor: 'rgba(167,139,250,0.5)' },
  triggerPress: { borderColor: GRAD.from },
  triggerActive: { borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.1)' },
  triggerError: { borderColor: '#F87171' },
  triggerText: { color: '#fff', fontFamily: FONTS.med, fontSize: 14, flex: 1 },
  placeholderText: { color: PALETTE.dim },
  errorText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12, marginTop: 4 },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 420, maxHeight: 400, backgroundColor: '#0d1326',
    borderRadius: 16, borderWidth: 1, borderColor: PALETTE.glassBorder,
    paddingVertical: 12, gap: 8,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' } as any) : {}),
  },
  modalHeader: {
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#C4B5FD', fontFamily: TYPO.display700, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  optionsList: { paddingHorizontal: 8 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginVertical: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  optionRowHover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  optionRowSelected: { backgroundColor: 'rgba(124,58,237,0.18)' },
  optionText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13.5, flex: 1 },
  optionTextSelected: { color: '#fff', fontFamily: TYPO.display700 },
} as const;
