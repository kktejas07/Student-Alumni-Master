/**
 * SuggestionAutocomplete
 *
 * A lightweight free-text input with typeahead suggestions from a static list.
 * Used on the Mentor onboarding form to speed up Organization picking while
 * still allowing any custom value.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput } from 'react-native';

export function SuggestionAutocomplete({
  label,
  value,
  onChangeText,
  placeholder,
  suggestions,
  maxVisible = 8,
  helper,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suggestions: string[];
  maxVisible?: number;
  helper?: string;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions.slice(0, maxVisible);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, maxVisible);
  }, [value, suggestions, maxVisible]);

  const showDropdown = focused && filtered.length > 0;
  const borderColor = focused ? '#B07FDF' : 'rgba(255,255,255,0.14)';

  return (
    // Dynamic zIndex: when this autocomplete is focused / showing the dropdown,
    // its container needs to sit ABOVE later siblings (each subsequent
    // SuggestionAutocomplete also has zIndex 30). 9999 ensures the dropdown
    // overlays any field that comes after it in the same ScrollView.
    <View style={{
      position: 'relative',
      zIndex: showDropdown ? 9999 : 30,
      ...(Platform.OS === 'web' ? ({ isolation: 'isolate' } as any) : {}),
      marginBottom: 14,
    }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.wrap, { borderColor }]}>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          testID={testID}
          autoCapitalize="words"
          style={s.input}
        />
      </View>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
      {showDropdown && (
        <View style={s.dropdown}>
          {filtered.map((x) => (
            <Pressable
              key={x}
              onPress={() => { onChangeText(x); setFocused(false); }}
              style={({ hovered }: any) => [s.item, hovered && s.itemHover]}
            >
              <Text style={s.itemText}>{x}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 6,
  },
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 9,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  helper: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11.5, marginTop: 6,
  },
  dropdown: {
    position: 'absolute', top: 74, left: 0, right: 0,
    backgroundColor: '#1A1625',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    borderRadius: 12, paddingVertical: 6,
    maxHeight: 280, overflow: 'hidden', zIndex: 99,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as any) : { elevation: 8 }),
  },
  item: {
    paddingHorizontal: 14, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  itemHover: { backgroundColor: 'rgba(124,58,237,0.14)' },
  itemText: { color: '#F3F4F6', fontFamily: 'DMSans_500Medium', fontSize: 13.5 },
});
