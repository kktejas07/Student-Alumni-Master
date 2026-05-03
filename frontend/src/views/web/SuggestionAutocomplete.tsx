/**
 * SuggestionAutocomplete — unified component used by ALL onboarding flows
 * (student, mentor, alumni, college).
 *
 * Behaviour parity guarantees per spec:
 *  • Single shared design (font, padding, border, focus, hover) across roles.
 *  • Empty list shows nothing (no broken empty box).
 *  • When `allowOther` is true, an explicit "Other (type your own)" item
 *    appears at the bottom. Selecting it switches the field into manual-entry
 *    mode with a labelled free-text input perfectly aligned with the rest of
 *    the form.
 *  • Focus border + checkmark colour pulled from the active RoleTheme so the
 *    component blends with the surrounding flow.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput } from 'react-native';
import { Check, Edit3 } from 'lucide-react-native';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';

const OTHER_VALUE = '__other__';

export function SuggestionAutocomplete({
  label,
  value,
  onChangeText,
  placeholder,
  suggestions,
  maxVisible = 8,
  helper,
  allowOther = true,
  otherLabel = 'Other (type your own)',
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suggestions: string[];
  maxVisible?: number;
  helper?: string;
  allowOther?: boolean;
  otherLabel?: string;
  testID?: string;
}) {
  const { primary } = useRoleTheme();
  const [focused, setFocused] = useState(false);
  // When user explicitly picks "Other", we lock into manual-entry mode and
  // hide the dropdown until the user clears the field.
  const [manualMode, setManualMode] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, maxVisible);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, maxVisible);
  }, [value, suggestions, maxVisible]);

  const isMatchedSuggestion = useMemo(
    () => suggestions.some((s) => s.toLowerCase() === value.trim().toLowerCase()),
    [suggestions, value],
  );

  const showDropdown = focused && !manualMode && (filtered.length > 0 || allowOther);
  const focusBg = `${primary}10`; // 10% alpha role tint

  const onPickSuggestion = (x: string) => {
    onChangeText(x);
    setManualMode(false);
    setFocused(false);
  };
  const onPickOther = () => {
    onChangeText('');
    setManualMode(true);
    setFocused(false);
  };

  return (
    <View style={[s.container, { zIndex: showDropdown ? 9999 : 30 }]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.wrap, { borderColor: focused ? primary : 'rgba(255,255,255,0.12)', backgroundColor: focused ? focusBg : 'rgba(255,255,255,0.03)' }]}>
        <RNTextInput
          value={value}
          onChangeText={(t) => { if (manualMode) setManualMode(true); onChangeText(t); }}
          placeholder={manualMode ? 'Type manually…' : placeholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          onFocus={() => setFocused(true)}
          // Delay blur so the dropdown <Pressable> fires before this fires.
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          testID={testID}
          autoCapitalize="words"
          style={s.input}
        />
        {manualMode ? (
          <Pressable onPress={() => { setManualMode(false); onChangeText(''); }} style={s.editPill}>
            <Edit3 size={12} color="#FFF" />
            <Text style={s.editPillText}>Manual</Text>
          </Pressable>
        ) : null}
      </View>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}

      {showDropdown && (
        <View style={s.dropdown}>
          {filtered.map((x) => {
            const selected = x.toLowerCase() === value.trim().toLowerCase();
            return (
              <Pressable
                key={x}
                onPress={() => onPickSuggestion(x)}
                style={({ hovered }: any) => [
                  s.item,
                  hovered && { backgroundColor: `${primary}24` },
                  selected && { backgroundColor: `${primary}38` },
                ]}
              >
                <Text style={s.itemText}>{x}</Text>
                {selected ? <Check size={14} color="#FFF" /> : null}
              </Pressable>
            );
          })}
          {allowOther && (
            <Pressable
              onPress={onPickOther}
              style={({ hovered }: any) => [
                s.item,
                s.otherItem,
                hovered && { backgroundColor: `${primary}24` },
              ]}
            >
              <Edit3 size={13} color="rgba(255,255,255,0.7)" />
              <Text style={[s.itemText, { color: 'rgba(255,255,255,0.85)' }]}>{otherLabel}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* When matched OR in manual mode show small status hint for clarity */}
      {!focused && value && (isMatchedSuggestion || manualMode) ? (
        <Text style={s.statusHint}>{isMatchedSuggestion ? '✓ Selected from list' : '✎ Manual entry'}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 14,
    ...(Platform.OS === 'web' ? ({ isolation: 'isolate' } as any) : {}),
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    marginBottom: 8,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  helper: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11.5,
    marginTop: 6,
  },
  statusHint: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    marginTop: 6,
  },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(124,58,237,0.4)',
    borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  editPillText: { color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 10 },
  dropdown: {
    position: 'absolute',
    top: 74, left: 0, right: 0,
    backgroundColor: '#1A1625',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    borderRadius: 12, paddingVertical: 6,
    maxHeight: 320, overflow: 'hidden', zIndex: 99,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as any) : { elevation: 8 }),
  },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  otherItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
    paddingTop: 12,
    justifyContent: 'flex-start',
  },
  itemText: {
    color: '#F3F4F6',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13.5,
  },
});
