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

export function ImportantRegistrationInfo({ phones = [] }: { phones?: string[] }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 500;

  const openDialer = (number: string) => {
    Linking.openURL(`tel:${normalizePhoneForDialer(number)}`);
  };

  const validPhones = phones.filter((p) => p.trim().length > 0);

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
              {validPhones.reduce<React.ReactNode[]>((rows, phone, idx) => {
                if (idx % 2 === 0) {
                  rows.push(
                    <View key={idx} style={s.contactRow}>
                      <Text onPress={() => openDialer(phone)} style={s.phoneText}>{phone}</Text>
                      {idx + 1 < validPhones.length && <Text style={s.divider}> | </Text>}
                    </View>
                  );
                } else {
                  const last = rows[rows.length - 1] as React.ReactElement;
                  if (last && last.props?.children) {
                    rows[rows.length - 1] = React.cloneElement(last, {
                      children: [
                        ...React.Children.toArray(last.props.children),
                        <Text key={`d-${idx}`} style={s.divider}> | </Text>,
                        <Text key={`p-${idx}`} onPress={() => openDialer(phone)} style={s.phoneText}>{phone}</Text>,
                      ],
                    });
                  }
                }
                return rows;
              }, [])}
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
