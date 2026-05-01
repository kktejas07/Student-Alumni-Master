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
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China' },
  { code: 'KR', dial: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: 'HK', dial: '+852', flag: '🇭🇰', name: 'Hong Kong' },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'VN', dial: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: 'TH', dial: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'KW', dial: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: 'BH', dial: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: 'FI', dial: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: 'DK', dial: '+45',  flag: '🇩🇰', name: 'Denmark' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'KE', dial: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'LK', dial: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
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

export function PhoneInput({
  label,
  value,
  onChangeText,
  placeholder = '98765 43210',
  testID,
  helper,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  testID?: string;
  helper?: string;
}) {
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
    setCountry(c);
    setLocal(n);
    const joined = n ? `${c.dial} ${n.replace(/^\s+/, '')}` : '';
    onChangeText(joined);
  };

  return (
    <View style={{ position: 'relative', zIndex: 40, marginBottom: 14 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.row}>
        <Pressable onPress={() => setPickerOpen((o) => !o)} style={s.cc} testID={`${testID || 'phone'}-cc`}>
          <Text style={s.flag}>{country.flag}</Text>
          <Text style={s.dial}>{country.dial}</Text>
          <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
        </Pressable>
        <View style={s.num}>
          <RNTextInput
            value={local}
            onChangeText={(n) => commit(country, n)}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.32)"
            keyboardType="phone-pad"
            style={s.input}
            testID={testID}
          />
        </View>
      </View>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}

      {pickerOpen && (
        <View style={s.dropdown}>
          <View style={s.searchRow}>
            <Search size={14} color="rgba(255,255,255,0.5)" />
            <RNTextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search country"
              placeholderTextColor="rgba(255,255,255,0.4)"
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
                <Text style={s.flag}>{c.flag}</Text>
                <Text style={s.itemName}>{c.name}</Text>
                <Text style={s.itemDial}>{c.dial}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold,
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  cc: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 12,
    minWidth: 112,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  flag: { fontSize: 16 },
  dial: { color: '#FFF', fontFamily: FONTS.med, fontSize: 14 },
  num: { flex: 1 },
  input: {
    color: '#FFF', fontFamily: FONTS.med, fontSize: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 12,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  helper: {
    color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.med,
    fontSize: 11.5, marginTop: 6,
  },
  dropdown: {
    position: 'absolute', top: 74, left: 0, width: 280,
    backgroundColor: '#1A1625',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    borderRadius: 12, paddingVertical: 6,
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as any) : { elevation: 12 }),
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#FFF', fontFamily: FONTS.med, fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as any) : {}),
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  itemHover: { backgroundColor: 'rgba(124,58,237,0.14)' },
  itemName: { flex: 1, color: '#F3F4F6', fontFamily: FONTS.med, fontSize: 13 },
  itemDial: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bold, fontSize: 12 },
});
