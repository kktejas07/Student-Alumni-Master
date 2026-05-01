/**
 * College Admin Portal — top bar.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, Bell, Calendar as CalIcon, Plus, Inbox } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CC, FONTS } from './tokens';

export function TopBar({ title = 'Dashboard' }: { title?: string }) {
  return (
    <View style={s.bar}>
      <Text style={s.title}>{title}</Text>

      <View style={{ flex: 1 }} />

      <View style={s.searchBox}>
        <Search size={14} color={CC.dim} />
        <TextInput placeholder="Search…" placeholderTextColor={CC.dim} style={s.searchInput} />
      </View>

      <Pressable style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: CC.cardH }]}>
        <Inbox size={16} color={CC.muted} />
        <View style={s.numPill}><Text style={s.numText}>5</Text></View>
      </Pressable>

      <Pressable style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: CC.cardH }]}>
        <CalIcon size={16} color={CC.muted} />
      </Pressable>

      <Pressable style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: CC.cardH }]}>
        <Bell size={16} color={CC.muted} />
        <View style={[s.numPill, { backgroundColor: '#EF4444' }]}><Text style={s.numText}>3</Text></View>
      </Pressable>

      <Pressable style={({ hovered }: any) => [s.addCta, hovered && { transform: [{ translateY: -1 }] }]}>
        <LinearGradient colors={['#6366F1', '#22D3EE'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addCtaInner}>
          <Plus size={14} color="#fff" />
          <Text style={s.addCtaText}>Add College</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 22, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: CC.border,
    backgroundColor: CC.bg2,
  },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 220, height: 34, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: CC.card,
    borderColor: CC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  numPill: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: CC.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: CC.bg2 },
  numText: { color: '#000', fontFamily: FONTS.xbold, fontSize: 9 },

  addCta: { borderRadius: 10, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms', boxShadow: '0px 4px 14px rgba(99,102,241,0.40)' } as any) : {}) },
  addCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34 },
  addCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.2 },
});
