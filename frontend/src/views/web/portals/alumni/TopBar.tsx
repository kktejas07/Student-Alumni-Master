/**
 * Student Portal — top bar with greeting + bell + search + avatar.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Bell, Search } from './iconShims';
import { SC, FONTS } from './tokens';
import { STUDENT } from './data';
import { Av } from './atoms';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TopBar() {
  const firstName = STUDENT.name.split(' ')[0];
  return (
    <View style={s.bar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.greet}>{greeting()}, {firstName} 👋</Text>
        <Text style={s.sub}>Here’s your personalised dashboard for today</Text>
      </View>

      <View style={s.searchBox}>
        <Search size={14} color={SC.dim} />
        <TextInput placeholder="Search anything…" placeholderTextColor={SC.dim} style={s.searchInput} />
      </View>

      <Pressable style={({ hovered }: any) => [s.bell, hovered && { backgroundColor: SC.cardH }]}>
        <Bell size={16} color={SC.accent} />
        <View style={s.bellDot} />
      </Pressable>

      <Av initials={STUDENT.initials} size={36} color={SC.primary} />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 22, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: SC.border,
    backgroundColor: SC.bg2,
  },
  greet: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 240, height: 36, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  bell: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: SC.card,
    borderColor: SC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: SC.bg2,
  },
});
