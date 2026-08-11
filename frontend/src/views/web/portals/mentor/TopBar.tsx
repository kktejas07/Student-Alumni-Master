import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { MC, FONTS } from './tokens';
import { Av } from './atoms';
import { MENTOR } from './data';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function TopBar({
  title, query, setQuery, notifCount = 4, onBellPress, onAvatarPress,
}: {
  title: string;
  query: string;
  setQuery: (q: string) => void;
  notifCount?: number;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
}) {
  const user = useAuthStore((u) => u.user) as any;
  const fullName = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim() || MENTOR.name;
  const initials = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || MENTOR.avatar).toUpperCase();
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;

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
            <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 9 }}>{notifCount}</Text>
          </View>
        )}
      </Pressable>
      <View style={{ marginLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <HelpMenu portal="mentor" />
        <Pressable onPress={onAvatarPress} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}>
          <Av initials={initials} size={34} color={MC.teal} photo={photo} />
        </Pressable>
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
    position: 'relative', zIndex: 50,
  },
  title: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 280, height: 36, paddingHorizontal: 11, borderRadius: 10,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12.5,
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
