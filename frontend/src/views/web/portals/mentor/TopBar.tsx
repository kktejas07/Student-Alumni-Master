/**
 * Top Bar for the Mentor Portal RN — page title, search, notifications.
 */
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { MC, FONTS } from './tokens';
import { Av } from './atoms';
import { MENTOR } from './data';

export function TopBar({
  title, query, setQuery, notifCount = 4, onBellPress,
}: {
  title: string;
  query: string;
  setQuery: (q: string) => void;
  notifCount?: number;
  onBellPress?: () => void;
}) {
  return (
    <View style={s.bar}>
      <Text style={s.title}>{title}</Text>
      <View style={{ flex: 1 }} />
      <View style={s.searchBox}>
        <Search size={14} color={MC.dim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search students, sessions..."
          placeholderTextColor={MC.dim}
          style={s.searchInput}
        />
      </View>
      <Pressable onPress={onBellPress} style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: 'rgba(20,184,166,0.10)' }]}>
        <Bell size={16} color={MC.muted} />
        {notifCount > 0 && (
          <View style={s.badge}>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 9 }}>{notifCount}</Text>
          </View>
        )}
      </Pressable>
      <View style={{ marginLeft: 4 }}>
        <Av initials={MENTOR.avatar} size={34} color={MC.teal} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 56, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: MC.border,
    backgroundColor: MC.bg,
  },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 280, height: 36, paddingHorizontal: 11, borderRadius: 10,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: MC.red, borderColor: MC.bg, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
});
