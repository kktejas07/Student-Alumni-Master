/**
 * College Admin Portal — top bar.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, Bell, Calendar as CalIcon, Inbox } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CC, FONTS } from './tokens';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';

export function TopBar({
  title = 'Dashboard',
  onCalendarPress,
  onNotificationsPress,
  onProfilePress,
}: {
  title?: string;
  onCalendarPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
}) {
  const router = useRouter();
  const user = useAuthStore((u) => u.user);
  const fullName = user?.full_name || '';
  const initials = fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('').toUpperCase() || 'CO';
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64 || user?.college_info?.logo;
  
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.notifications().then((r) => {
      const items = r.notifications || r.items || [];
      setUnreadCount(items.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, []);
  return (
    <View style={s.bar}>
      <Text style={s.title}>{title}</Text>

      <View style={{ flex: 1 }} />

      <View style={s.searchBox}>
        <Search size={14} color={CC.dim} />
        <TextInput placeholder="Search…" placeholderTextColor={CC.dim} style={s.searchInput} />
      </View>



      <Pressable
        onPress={onCalendarPress || (() => {})}
        style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: CC.cardH }]}
      >
        <CalIcon size={16} color={CC.muted} />
      </Pressable>

      <Pressable
        onPress={onNotificationsPress || (() => router.push('/notifications'))}
        style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: CC.cardH }]}
      >
        <Bell size={16} color={CC.muted} />
        {unreadCount > 0 && (
          <View style={[s.numPill, { backgroundColor: '#EF4444' }]}><Text style={s.numText}>{unreadCount}</Text></View>
        )}
      </Pressable>


      <Pressable
        onPress={onProfilePress}
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}
      >
        <Av initials={initials} size={34} color="#6366F1" photo={photo} />
      </Pressable>

      <HelpMenu portal="college" />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 22, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: CC.border,
    backgroundColor: CC.bg2,
    position: 'relative', zIndex: 10,
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
  numText: { color: '#1E1B4B', fontFamily: FONTS.xbold, fontSize: 9 },

  addCta: { borderRadius: 10, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms', boxShadow: '0px 4px 14px rgba(99,102,241,0.40)' } as any) : {}) },
  addCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34 },
  addCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.2 },
});
