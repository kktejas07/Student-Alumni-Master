/**
 * SuggestionAutocomplete — Search-as-you-type field that opens the
 * canonical OptionListCard. Used identically across all 4 onboarding flows
 * for Current Role / Designation / Company / City / State and any other
 * pre-populated free-text field.
 *
 * Visual + interaction parity with <Dropdown/> — same row chrome, same
 * checkmark on selected, same "Other (type your own)" fallback, same
 * role-aware accent colour.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput,
} from 'react-native';
import { Edit3, Search } from 'lucide-react-native';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';
import { OptionListCard } from '@/src/views/components/OptionListCard';

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

  return (
    <View style={[styles.container, { zIndex: showDropdown ? 9999 : 30 }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, {
        borderColor: focused ? primary : 'rgba(255,255,255,0.12)',
        backgroundColor: focused ? `${primary}10` : 'rgba(255,255,255,0.03)',
      }]}>
        {!manualMode && <Search size={14} color="rgba(255,255,255,0.5)" />}
        <RNTextInput
          value={value}
          onChangeText={(t) => { if (manualMode) setManualMode(true); onChangeText(t); }}
          placeholder={manualMode ? `Please enter your ${label.toLowerCase()}` : placeholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          testID={testID}
          autoCapitalize="words"
          style={styles.input}
        />
        {manualMode && (
          <Pressable
            onPress={() => { setManualMode(false); onChangeText(''); setFocused(true); }}
            style={styles.editPill}
          >
            <Edit3 size={12} color="#FFF" />
            <Text style={styles.editPillText}>Pick</Text>
          </Pressable>
        )}
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {!focused && value && (isMatchedSuggestion || manualMode) ? (
        <Text style={styles.statusHint}>{isMatchedSuggestion ? '✓ Selected from list' : '✎ Manual entry'}</Text>
      ) : null}

      {/* Inline dropdown — uses the same canonical card as <Dropdown/> */}
      {showDropdown && (
        <View style={styles.dropdownAnchor} pointerEvents="box-none">
          <OptionListCard
            headerLabel={label.toUpperCase()}
            options={filtered.map((label) => ({ value: label, label }))}
            selectedValue={value}
            onSelect={(opt) => { onChangeText(opt.value); setManualMode(false); setFocused(false); }}
            showOther={allowOther}
            otherLabel={otherLabel}
            onSelectOther={() => { setManualMode(true); onChangeText(''); setFocused(false); }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 14,
    ...(Platform.OS === 'web' ? ({ isolation: 'isolate' } as any) : {}),
  },
  label: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13, marginBottom: 8 },
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 48,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, gap: 8,
    ...(Platform.OS === 'web' ? ({ transitionDuration: '160ms' } as any) : {}),
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
  dropdownAnchor: {
    position: 'absolute',
    top: 78, left: 0, right: 0,
    zIndex: 99,
  },
});
