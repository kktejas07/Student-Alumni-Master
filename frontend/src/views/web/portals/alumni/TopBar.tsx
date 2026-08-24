import React, { useEffect } from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { Bell, Search } from './iconShims';
import { SC, FONTS } from './tokens';
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
  const fullName = displayName(user);
  const firstName = fullName.split(/[\s@]/)[0] || 'there';
  const initials = displayInitials(user);
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
    <View className="flex-row items-center gap-3.5 px-[22px] py-3.5 border-b border-glass-border bg-bg2 relative z-10">
      <View className="flex-1 min-w-0">
        <Text className="text-white font-display-bold text-[17px] tracking-tight">{greeting()}, {firstName} 👋</Text>
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>Here's your personalised dashboard for today</Text>
      </View>

      <View className="flex-row items-center gap-2 w-60 h-9 px-[11px] rounded-[10px] bg-glass border border-glass-border">
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
          className="flex-1 text-white font-body-medium text-[12.5px]"
          style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
        />
      </View>

      <Pressable
        onPress={() => router.push('/notifications')}
        style={({ hovered }: any) => [
          { width: 36, height: 36, borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } : {}) },
          hovered && { backgroundColor: SC.cardH }
        ]}
      >
        <Bell size={16} color={SC.accent} />
        <View className="absolute top-2 right-[9px] w-[7px] h-[7px] rounded-full border-[1.5px]" style={{ backgroundColor: '#EF4444', borderColor: SC.bg2 }} />
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
