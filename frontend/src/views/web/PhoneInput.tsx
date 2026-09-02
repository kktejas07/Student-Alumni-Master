/**
 * PhoneInput — lightweight international phone number input.
 *
 * Shows a country-code dropdown (flag + dial code) followed by the local
 * number. Defaults to India (+91). Exposes the full E.164-ish string via
 * `onChangeText(fullValue)` so parent forms don't need to track the pieces.
 *
 * Uses no external dep — country list is curated (top 40 countries covering
 * 95%+ of SA's target users). We can swap in `libphonenumber-js` later if
 * strict validation is needed.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput as RNTextInput, ScrollView } from 'react-native';
import { ChevronDown, Search } from 'lucide-react-native';
import { FONTS } from '@/src/views/auth/tokens';

export type Country = { code: string; dial: string; flag: string; name: string };

export const COUNTRIES: Country[] = [
  { code: 'IN', dial: '+91',  flag: 'IN', name: 'India' },
  { code: 'US', dial: '+1',   flag: 'US', name: 'United States' },
  { code: 'GB', dial: '+44',  flag: 'GB', name: 'United Kingdom' },
  { code: 'CA', dial: '+1',   flag: 'CA', name: 'Canada' },
  { code: 'AU', dial: '+61',  flag: 'AU', name: 'Australia' },
  { code: 'AE', dial: '+971', flag: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', dial: '+65',  flag: 'SG', name: 'Singapore' },
  { code: 'DE', dial: '+49',  flag: 'DE', name: 'Germany' },
  { code: 'FR', dial: '+33',  flag: 'FR', name: 'France' },
  { code: 'NL', dial: '+31',  flag: 'NL', name: 'Netherlands' },
  { code: 'IE', dial: '+353', flag: 'IE', name: 'Ireland' },
  { code: 'NZ', dial: '+64',  flag: 'NZ', name: 'New Zealand' },
  { code: 'JP', dial: '+81',  flag: 'JP', name: 'Japan' },
  { code: 'CN', dial: '+86',  flag: 'CN', name: 'China' },
  { code: 'KR', dial: '+82',  flag: 'KR', name: 'South Korea' },
  { code: 'HK', dial: '+852', flag: 'HK', name: 'Hong Kong' },
  { code: 'MY', dial: '+60',  flag: 'MY', name: 'Malaysia' },
  { code: 'ID', dial: '+62',  flag: 'ID', name: 'Indonesia' },
  { code: 'PH', dial: '+63',  flag: 'PH', name: 'Philippines' },
  { code: 'VN', dial: '+84',  flag: 'VN', name: 'Vietnam' },
  { code: 'TH', dial: '+66',  flag: 'TH', name: 'Thailand' },
  { code: 'SA', dial: '+966', flag: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', flag: 'QA', name: 'Qatar' },
  { code: 'KW', dial: '+965', flag: 'KW', name: 'Kuwait' },
  { code: 'OM', dial: '+968', flag: 'OM', name: 'Oman' },
  { code: 'BH', dial: '+973', flag: 'BH', name: 'Bahrain' },
  { code: 'IL', dial: '+972', flag: 'IL', name: 'Israel' },
  { code: 'TR', dial: '+90',  flag: 'TR', name: 'Turkey' },
  { code: 'CH', dial: '+41',  flag: 'CH', name: 'Switzerland' },
  { code: 'IT', dial: '+39',  flag: 'IT', name: 'Italy' },
  { code: 'ES', dial: '+34',  flag: 'ES', name: 'Spain' },
  { code: 'SE', dial: '+46',  flag: 'SE', name: 'Sweden' },
  { code: 'NO', dial: '+47',  flag: 'NO', name: 'Norway' },
  { code: 'FI', dial: '+358', flag: 'FI', name: 'Finland' },
  { code: 'DK', dial: '+45',  flag: 'DK', name: 'Denmark' },
  { code: 'BR', dial: '+55',  flag: 'BR', name: 'Brazil' },
  { code: 'MX', dial: '+52',  flag: 'MX', name: 'Mexico' },
  { code: 'ZA', dial: '+27',  flag: 'ZA', name: 'South Africa' },
  { code: 'NG', dial: '+234', flag: 'NG', name: 'Nigeria' },
  { code: 'KE', dial: '+254', flag: 'KE', name: 'Kenya' },
  { code: 'EG', dial: '+20',  flag: 'EG', name: 'Egypt' },
  { code: 'BD', dial: '+880', flag: 'BD', name: 'Bangladesh' },
  { code: 'LK', dial: '+94',  flag: 'LK', name: 'Sri Lanka' },
  { code: 'NP', dial: '+977', flag: 'NP', name: 'Nepal' },
  { code: 'PK', dial: '+92',  flag: 'PK', name: 'Pakistan' },
];

function parsePhone(value: string): { dial: string; local: string; country: Country } {
  const v = (value || '').trim();
  // Try to match the longest dial code first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (v.startsWith(c.dial)) {
      return { dial: c.dial, local: v.slice(c.dial.length).trim(), country: c };
    }
  }
  return { dial: '+91', local: v, country: COUNTRIES[0] };
}

export const PhoneInput = React.forwardRef<RNTextInput, {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  testID?: string;
  helper?: string;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
}>(function PhoneInput(props, ref) {
  const { label, value, onChangeText, placeholder = '98765 43210', testID, helper, onSubmitEditing, blurOnSubmit } = props;
  const parsed = parsePhone(value);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [local, setLocal] = useState<string>(parsed.local);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q
    );
  }, [search]);

  const commit = (c: Country, n: string) => {
    const rawDigits = n.replace(/\D/g, '').slice(0, 10);
    setCountry(c);
    setLocal(rawDigits);
    const joined = rawDigits ? `${c.dial} ${rawDigits}` : '';
    onChangeText(joined);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={{ position: 'relative', zIndex: pickerOpen ? 999 : 40 }}>
        <View style={s.row}>
          <Pressable onPress={() => setPickerOpen((o) => !o)} style={s.cc} testID={`${testID || 'phone'}-cc`}>
            <Text style={s.dial}>
              <Text style={s.flag}>{country.flag}</Text>   {country.dial}
            </Text>
            <ChevronDown size={14} color="#9CA3AF" />
          </Pressable>
          <View style={s.num}>
            <RNTextInput
              ref={ref}
              value={local}
              onChangeText={(n) => commit(country, n)}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoCorrect={false}
              onSubmitEditing={onSubmitEditing}
              blurOnSubmit={blurOnSubmit}
              style={s.input}
              testID={testID}
            />
          </View>
        </View>

        {pickerOpen && (
          <>
            {Platform.OS === 'web' && (
              <Pressable
                style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onPress={() => setPickerOpen(false)}
              />
            )}
            <View style={s.dropdown}>
            <View style={s.searchRow}>
              <Search size={14} color="#9CA3AF" />
              <RNTextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search country"
                placeholderTextColor="#9CA3AF"
                style={s.searchInput}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
              {filtered.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => { commit(c, local); setPickerOpen(false); setSearch(''); }}
                  style={({ hovered }: any) => [s.item, hovered && s.itemHover]}
                >
                  <Text style={s.itemName}>
                    <Text style={s.flag}>{c.flag}</Text>   {c.name} ({c.code})
                  </Text>
                  <Text style={s.itemDial}>{c.dial}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          </>
        )}
      </View>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
    </View>
  );
});

const s = StyleSheet.create({
  label: {
    color: '#374151', fontFamily: FONTS.bold,
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  cc: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 48,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12,
    minWidth: 100,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  codeText: { color: '#111827', fontFamily: FONTS.med, fontSize: 14, marginLeft: 2, marginRight: 2 },
  flag: { fontSize: 16, color: '#111827' },
  dial: {
    color: '#111827', fontFamily: FONTS.med, fontSize: 14,
    transform: [{ translateY: -2 }],
  },
  num: { flex: 1 },
  input: {
    color: '#111827', fontFamily: FONTS.med, fontSize: 14,
    paddingHorizontal: 14, height: 48,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  helper: {
    color: '#9CA3AF', fontFamily: FONTS.med,
    fontSize: 11.5, marginTop: 6,
  },
  dropdown: {
    position: 'absolute', top: 52, left: 0, width: 280,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB', borderWidth: 1,
    borderRadius: 12, paddingVertical: 6,
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.1)' } as any) : { elevation: 12 }),
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomColor: '#E5E7EB', borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#111827', fontFamily: FONTS.med, fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  itemHover: { backgroundColor: '#F3F4F6' },
  itemName: { flex: 1, color: '#111827', fontFamily: FONTS.med, fontSize: 13 },
  itemDial: { color: '#6B7280', fontFamily: FONTS.bold, fontSize: 12 },
});
