import React, { useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Bell, Search } from './iconShims';
import { SC, FONTS } from './tokens';
import { STUDENT } from '../student/data';
import { Av } from './atoms';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { AlumniPortalNavContext } from './AlumniPortalRN';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TopBar({
  activeView = 'dashboard',
  onAvatarPress,
}: {
  activeView?: string;
  onAvatarPress?: () => void;
} = {}) {
  const router = useRouter();
  const user = useAuthStore((u) => u.user);
  const fullName = user?.full_name || STUDENT.name;
  const firstName = fullName.split(' ')[0] || STUDENT.name.split(' ')[0];
  const initials = fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('').toUpperCase() || STUDENT.initials;
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;
  const portalNav = React.useContext(AlumniPortalNavContext);
  const [q, setQ] = React.useState(portalNav?.searchQuery || '');

  useEffect(() => {
    setQ(portalNav?.searchQuery || '');
  }, [portalNav?.searchQuery]);

  const handleSearch = () => {
    if (q.trim() && portalNav) {
      portalNav.setSearchQuery(q.trim());
      if (activeView !== 'network' && activeView !== 'internships') {
        portalNav.navigate('internships');
      }
    }
  };

  return (
    <View style={s.bar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.greet}>{greeting()}, {firstName} 👋</Text>
        <Text style={s.sub}>Here’s your personalised dashboard for today</Text>
      </View>

      <View style={s.searchBox}>
        <Pressable
          onPress={handleSearch}
          style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}
          accessibilityLabel="Execute search"
        >
          <Search size={14} color={q.trim() ? '#fff' : SC.dim} />
        </Pressable>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={handleSearch}
          placeholder="Search anything…"
          placeholderTextColor={SC.dim}
          style={s.searchInput}
        />
      </View>

      <Pressable
        onPress={() => router.push('/notifications')}
        style={({ hovered }: any) => [s.bell, hovered && { backgroundColor: SC.cardH }]}
      >
        <Bell size={16} color={SC.accent} />
        <View style={s.bellDot} />
      </Pressable>

      <HelpMenu portal="alumni" />

      <Pressable
        onPress={onAvatarPress || (() => router.push('/(tabs)/profile' as any))}
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}
      >
        <Av initials={initials} size={36} color={SC.primary} photo={photo} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 22, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: SC.border,
    backgroundColor: SC.bg2,
    position: 'relative', zIndex: 10,
  },
  greet: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 17, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 240, height: 36, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
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
