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
  View, Text, Pressable, Platform, TextInput as RNTextInput,
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
    <View className="relative mb-3.5" style={{ zIndex: showDropdown ? 9999 : 30, ...(Platform.OS === 'web' ? { isolation: 'isolate' } as any : {}) }}>
      {label ? <Text className="font-body-bold text-gray-800 text-sm mb-2">{label}</Text> : null}
      <View
        className="flex-row items-center rounded-xl border px-3.5 gap-2"
        style={{
          height: 48,
          borderColor: focused ? primary : '#E5E7EB',
          backgroundColor: focused ? `${primary}10` : '#FFFFFF',
          ...(Platform.OS === 'web' ? { transitionDuration: '160ms' } as any : {}),
        }}
      >
        {!manualMode && <Search size={14} color="#6B7280" />}
        <RNTextInput
          value={value}
          onChangeText={(t) => { if (manualMode) setManualMode(true); onChangeText(t); }}
          placeholder={manualMode ? `Please enter your ${label.toLowerCase()}` : placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          testID={testID}
          autoCapitalize="words"
          className="flex-1 text-gray-800 text-base font-body-medium"
          style={{ ...(Platform.OS === 'web' ? { outlineWidth: 0, outlineStyle: 'none' } as any : {}) }}
        />
        {manualMode && (
          <Pressable
            onPress={() => { setManualMode(false); onChangeText(''); setFocused(true); }}
            className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: 'rgba(124,58,237,0.4)' }}
          >
            <Edit3 size={12} color="#111827" />
            <Text className="font-body-bold text-xs text-gray-800">Pick</Text>
          </Pressable>
        )}
      </View>
      {helper ? <Text className="font-body-medium text-xs mt-1.5" style={{ color: '#6B7280' }}>{helper}</Text> : null}
      {!focused && value && (isMatchedSuggestion || manualMode) ? (
        <Text className="font-body-semibold text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{isMatchedSuggestion ? '✓ Selected from list' : '✎ Manual entry'}</Text>
      ) : null}

      {showDropdown && (
        <View className="absolute left-0 right-0" style={{ top: 78, zIndex: 99 }} pointerEvents="box-none">
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
