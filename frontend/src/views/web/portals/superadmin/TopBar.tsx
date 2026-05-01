/**
 * Super Admin Portal — top bar with title + date + search + bell + avatar.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { SAC, FONTS } from './tokens';
import { ADMIN } from './data';
import { Av } from './atoms';

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TopBar({ title = 'Overview' }: { title?: string }) {
  return (
    <View style={s.bar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.date}>{today()}</Text>
      </View>

      <View style={s.searchBox}>
        <Search size={14} color={SAC.dim} />
        <TextInput placeholder="Search anything…" placeholderTextColor={SAC.dim} style={s.searchInput} />
      </View>

      <Pressable style={({ hovered }: any) => [s.bell, hovered && { backgroundColor: SAC.cardH }]}>
        <Bell size={16} color={SAC.muted} />
        <View style={s.bellDot} />
      </Pressable>

      <Av initials={ADMIN.initials} size={36} color={SAC.primaryD} />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 22, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
    backgroundColor: SAC.bg2,
  },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4 },
  date:  { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 240, height: 34, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  bell: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: SAC.card,
    borderColor: SAC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  bellDot: {
    position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4,
    backgroundColor: SAC.red, borderWidth: 1.5, borderColor: SAC.bg2,
  },
});
