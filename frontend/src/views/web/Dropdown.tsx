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
import React, { useState, useRef, useEffect } from 'react';
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
  label?: string;
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

  // Editable text entry options
  editable?: boolean;
  keyboardType?: 'default' | 'numeric' | 'number-pad';
  maxLength?: number;
  inputRef?: React.RefObject<any>;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Render the options inline directly below the trigger instead of in a modal pop up */
  inline?: boolean;
  maxHeight?: number;
}

const OTHER_VALUE = '__other__';

export function Dropdown({
  label, required, optional, value, options, onChange,
  placeholder = 'Select…', testID, allowOther = true, overlayHeader,
  editable, keyboardType = 'default', maxLength, inputRef, onFocus, onBlur,
  inline, maxHeight,
}: Props) {
  const { primary } = useRoleTheme();
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [filterText, setFilterText] = useState('');
  const typeBufferRef = useRef('');

  // Clear filter when dropdown opens or closes
  useEffect(() => {
    typeBufferRef.current = '';
    setFilterText('');
  }, [open]);

  // Keyboard capture via document-level listener (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore if a text input inside the card is focused (manual mode)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;

      if (key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        return;
      }

      const buf = typeBufferRef.current;

      if (key === 'Enter') {
        if (buf) {
          const lower = buf.toLowerCase();
          const exact = options.find((o) => o.label.toLowerCase() === lower);
          if (exact) {
            onChange(exact.value);
            setManualMode(false);
            setOpen(false);
          }
        }
        return;
      }

      if (key === 'Backspace') {
        const next = buf.slice(0, -1);
        typeBufferRef.current = next;
        setFilterText(next);
        return;
      }

      if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const next = buf + key;
        typeBufferRef.current = next;
        setFilterText(next);

        const lower = next.toLowerCase();
        const matching = options.filter((o) => o.label.toLowerCase().startsWith(lower));
        if (matching.length === 1) {
          onChange(matching[0].value);
          setManualMode(false);
          setOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, options, onChange]);

  const [isFocused, setIsFocused] = useState(false);
  const [localText, setLocalText] = useState('');

  React.useEffect(() => {
    if (isFocused) {
      setLocalText(value || '');
    }
  }, [value, isFocused]);

  const sel = options.find((o) => o.value === value);
  // If the current value isn't in options, we're in "manual" mode.
  const showingManual = manualMode || (!!value && !sel);

  // Filter options based on keyboard type-ahead text
  const filteredOptions = filterText
    ? options.filter((o) => o.label.toLowerCase().startsWith(filterText.toLowerCase()))
    : options;

  const triggerLabel = showingManual
    ? (manualText || value || placeholder)
    : (sel?.label || placeholder);

  return (
    <View style={{ marginBottom: 14, position: 'relative', zIndex: open ? 999 : 1 }}>
      {label ? (
        <Text style={s.label}>
          {label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
          {optional ? <Text style={s.optional}>  Optional</Text> : null}
        </Text>
      ) : null}

      {/* Trigger / Manual input */}
      {editable ? (
        <View
          style={[
            s.triggerRow,
            isFocused && { borderColor: primary },
            open && { borderColor: primary, backgroundColor: `${primary}10` },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={isFocused ? localText : (sel?.label || value || '')}
            onChangeText={(t) => {
              setLocalText(t);
              onChange(t);
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={s.editableInput}
            keyboardType={Platform.OS === 'web' ? 'default' : keyboardType}
            maxLength={maxLength}
            onFocus={() => {
              setIsFocused(true);
              setLocalText(value || '');
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              setLocalText('');
              onBlur?.();
            }}
            testID={testID}
          />
          <Pressable onPress={() => setOpen(true)} style={s.chevronPressable}>
            <ChevronDown size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      ) : showingManual ? (
        <View style={[s.triggerRow, { borderColor: primary }]}>
          <TextInput
            value={manualText || value || ''}
            onChangeText={(t) => { setManualText(t); onChange(t); }}
            placeholder={`Please enter your ${label?.toLowerCase() || 'value'}`}
            placeholderTextColor="#9CA3AF"
            style={s.manualInput}
            autoCapitalize="words"
            testID={testID}
          />
          <Pressable
            onPress={() => { setManualMode(false); setManualText(''); onChange(''); setOpen(true); }}
            style={s.editPill}
          >
            <ChevronDown size={14} color="#111827" />
            <Text style={s.editPillText}>Pick</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(!open)}
          testID={testID}
          style={({ hovered, pressed }: any) => [
            s.triggerRow,
            hovered && { borderColor: `${primary}88` },
            pressed && { borderColor: primary },
            open && { borderColor: primary, backgroundColor: `${primary}10` },
          ]}
        >
          <Text style={[s.triggerText, !sel && s.triggerPlaceholder]} numberOfLines={1}>{triggerLabel}</Text>
          <ChevronDown size={18} color="#9CA3AF" />
        </Pressable>
      )}

      {/* Modal overlay or Inline dropdown */}
      {open && (
        inline ? (
          <>
            {Platform.OS === 'web' && (
              <Pressable
                style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                onPress={() => setOpen(false)}
              />
            )}
            <View style={{ marginTop: 6, zIndex: 10, position: 'absolute', top: '100%', left: 0, right: 0 }}>
              <OptionListCard
                maxHeight={maxHeight ?? 140}
                headerLabel={inline ? undefined : (overlayHeader || label?.toUpperCase() || 'SELECT')}
                options={filteredOptions}
                selectedValue={value}
                onSelect={(opt) => { onChange(opt.value); setManualMode(false); setOpen(false); }}
                showOther={allowOther}
                onSelectOther={() => { setOpen(false); setManualMode(true); setManualText(''); onChange(''); }}
              />
            </View>
          </>
        ) : (
          <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
            <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
              <Pressable
                onPress={(e: any) => e?.stopPropagation?.()}
                style={s.cardWrap}
                // @ts-ignore - React Native Web supports onKeyDown but types might not
                onKeyDown={(e: any) => {
                  if (Platform.OS === 'web' && e?.key === 'Escape') {
                    setOpen(false);
                  }
                }}
              >
                <OptionListCard
                  headerLabel={overlayHeader || label?.toUpperCase() || 'SELECT'}
                  options={filteredOptions}
                  selectedValue={value}
                  onSelect={(opt) => { onChange(opt.value); setManualMode(false); setOpen(false); }}
                  showOther={allowOther}
                  onSelectOther={() => { setOpen(false); setManualMode(true); setManualText(''); onChange(''); }}
                  maxHeight={maxHeight}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: { color: '#374151', fontFamily: 'DMSans_700Bold', fontSize: 13, marginBottom: 8 },
  optional: { color: '#9CA3AF', fontFamily: 'DMSans_500Medium', fontSize: 11 },
  triggerRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  triggerText: { flex: 1, color: '#111827', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  triggerPlaceholder: { color: '#9CA3AF' },
  manualInput: {
    flex: 1,
    minWidth: 0,
    color: '#111827',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}),
  },
  editableInput: {
    flex: 1,
    minWidth: 0,
    color: '#111827',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    padding: 0,
    height: '100%',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}),
  },
  chevronPressable: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(124,58,237,0.4)',
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    flexShrink: 0,
  },
  editPillText: { color: '#111827', fontFamily: 'DMSans_700Bold', fontSize: 11 },
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
