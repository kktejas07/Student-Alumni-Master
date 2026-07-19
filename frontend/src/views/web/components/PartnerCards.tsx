import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { fetchPortal } from '@/src/lib/portalApi';

type PartnerItem = {
  name: string;
  logo: string;
  referral_id: string;
  url: string;
};

export function PartnerCards() {
  const [items, setItems] = useState<PartnerItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPortal<{ items: PartnerItem[] }>('/partner-websites')
      .then((res) => { if (!cancelled && res.items?.length) setItems(res.items.filter((i) => i.name)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!items.length) return null;

  return (
    <View style={s.row}>
      {items.map((item, idx) => (
        <Pressable key={idx} onPress={() => item.url && Linking.openURL(item.url)} style={s.card}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={s.logo} resizeMode="contain" />
          ) : (
            <View style={[s.logo, { backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#666', fontFamily: 'Inter_700Bold', fontSize: 10, textAlign: 'center' }}>{item.name?.charAt(0) || '?'}</Text>
            </View>
          )}
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          {item.referral_id ? (
            <Text style={s.ref}>Ref: {item.referral_id}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 12, flexWrap: 'wrap',
  },
  card: {
    flex: 1, minWidth: 160, maxWidth: 240,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}),
  },
  logo: {
    width: 48, height: 48, borderRadius: 8,
  },
  name: {
    color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'center',
  },
  ref: {
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_600SemiBold', fontSize: 10,
  },
});
