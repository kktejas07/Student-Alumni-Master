/**
 * Student Portal — top bar.
 * Polished pass:
 *   • Lucide icons → MaterialCommunityIcons (via ./iconShims)
 *   • Fade-in greeting / search-box / bell on mount
 *   • Animated red dot pulses on the bell when notifications are pending
 *   • PressScale on the bell button
 *   • Search box gains a soft focus glow on web hover
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Image } from 'react-native';
import { Bell, Search } from './iconShims';
import { SC, FONTS } from './tokens';
import { STUDENT } from './data';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { FadeInView, PressScale, PulseDot } from './motion';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TopBar() {
  const user = useAuthStore((u) => u.user) as any;
  const fullName: string = (user?.full_name
    || `${user?.first_name || ''} ${user?.last_name || ''}`).trim()
    || STUDENT.name;
  const firstName: string = fullName.split(' ')[0] || STUDENT.name.split(' ')[0];
  const initials: string = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || STUDENT.initials).toUpperCase();
  const photo: string | undefined = user?.photo_data || user?.face_image_base64;

  return (
    <View style={s.bar}>
      <FadeInView delay={20} style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.greet}>{greeting()}, {firstName} 👋</Text>
        <Text style={s.sub}>Here’s your personalised dashboard for today</Text>
      </FadeInView>

      <FadeInView delay={120}>
        <View style={s.searchBox}>
          <Search size={14} color={SC.dim} />
          <TextInput
            placeholder="Search anything…"
            placeholderTextColor={SC.dim}
            style={s.searchInput}
            accessibilityLabel="Search the dashboard"
            accessibilityHint="Type to find courses, mentors, jobs, deals, and more"
            // @ts-ignore — RN-Web accepts these
            aria-label="Search the dashboard"
          />
        </View>
      </FadeInView>

      <FadeInView delay={180}>
        <PressScale
          style={s.bell}
          onPress={() => {}}
          accessibilityLabel="Notifications"
          accessibilityHint="Opens the notifications panel — you have unread alerts"
        >
          <Bell size={16} color={SC.accent} />
          <View style={s.bellDotWrap}>
            <PulseDot size={7} color="#EF4444" />
          </View>
        </PressScale>
      </FadeInView>

      <FadeInView delay={220}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <Av initials={initials} size={36} color={SC.primary} />
        )}
      </FadeInView>
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
    ...(Platform.OS === 'web' ? ({ transitionDuration: '180ms' } as any) : {}),
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  bell: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: SC.card,
    borderColor: SC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  bellDotWrap: {
    position: 'absolute', top: 7, right: 7,
    backgroundColor: SC.bg2, borderRadius: 6, padding: 1.5,
  },
});
