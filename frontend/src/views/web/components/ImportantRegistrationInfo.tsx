import React from 'react';
import { View, Text, StyleSheet, Platform, Linking, useWindowDimensions } from 'react-native';
import { PALETTE, FONTS } from '@/src/views/web/portals/student/tokens';
import { Users, Info, HelpCircle, Check } from 'lucide-react-native';

function normalizePhoneForDialer(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return digits;
  return digits;
}

const DEFAULT_PHONES = [
  '91214 95077',
  '84669 65800',
  '+91 6281 083 332',
  '+91 63001 97713',
];

export function ImportantRegistrationInfo({ phones = [] }: { phones?: string[] }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 500;

  const openDialer = (number: string) => {
    Linking.openURL(`tel:${normalizePhoneForDialer(number)}`);
  };

  const rawPhones = phones && phones.length > 0 ? phones : DEFAULT_PHONES;
  const validPhones = rawPhones.filter((p) => p && p.trim().length > 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Info size={16} color="#A78BFA" />
        <Text style={s.title}>Important Information</Text>
      </View>

      <View style={s.item}>
        <View style={s.itemHeader}>
          <Users size={14} color={PALETTE.muted} />
          <Text style={s.itemTitle}>Team Formation</Text>
        </View>
        <Text style={s.itemText}>
          Teams can be formed at the venue with 2–5 members.
        </Text>
      </View>

      <View style={s.item}>
        <View style={s.itemHeader}>
          <Check size={14} color={PALETTE.muted} />
          <Text style={s.itemTitle}>Registration</Text>
        </View>
        <Text style={s.itemText}>
          Please ensure that the details provided during registration are correct.
        </Text>
      </View>

      {validPhones.length > 0 && (
        <View style={s.item}>
          <View style={s.itemHeader}>
            <HelpCircle size={14} color={PALETTE.muted} />
            <Text style={s.itemTitle}>Need Help?</Text>
          </View>
          <Text style={s.itemText}>
            For any registration issues or queries, contact:
          </Text>

          {isMobile ? (
            <View style={[s.contactGrid, { flexDirection: 'column', gap: 6 }]}>
              {validPhones.map((phone, idx) => (
                <Text key={idx} onPress={() => openDialer(phone)} style={s.phoneText}>{phone}</Text>
              ))}
            </View>
          ) : (
            <View style={s.contactGrid}>
              {Array.from({ length: Math.ceil(validPhones.length / 2) }, (_, rowIdx) => {
                const pair = validPhones.slice(rowIdx * 2, rowIdx * 2 + 2);
                return (
                  <View key={rowIdx} style={s.contactRow}>
                    {pair.map((phone, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <Text style={s.divider}> | </Text>}
                        <Text onPress={() => openDialer(phone)} style={s.phoneText}>{phone}</Text>
                      </React.Fragment>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: '#A78BFA',
    fontFamily: FONTS.semi,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    color: '#E5E7EB',
    fontFamily: FONTS.med,
    fontSize: 13,
  },
  itemText: {
    color: PALETTE.dim,
    fontFamily: FONTS.med,
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 22,
  },
  contactGrid: {
    paddingLeft: 22,
    marginTop: 4,
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    color: '#A78BFA',
    fontFamily: FONTS.med,
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  divider: {
    color: PALETTE.dim,
    fontFamily: FONTS.med,
    fontSize: 13,
    marginHorizontal: 8,
  },
});
