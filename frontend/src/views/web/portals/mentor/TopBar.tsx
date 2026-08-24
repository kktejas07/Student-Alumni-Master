import React from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Search, Bell } from 'lucide-react-native';
import { MC, FONTS } from './tokens';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';

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
  const fullName = displayName(user);
  const initials = displayInitials(user);
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;

  return (
    <View className="flex-row items-center gap-2.5 h-14 px-5 border-b border-glass-border bg-bg relative z-50">
      <Text className="text-white font-display-bold text-lg tracking-[-0.4px]">{title}</Text>
      <View className="flex-1" />
      <View className="flex-row items-center gap-2 w-[280px] h-9 px-[11px] rounded-[10px] bg-card border border-glass-border">
        <Search size={14} color={MC.dim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search students, sessions..."
          placeholderTextColor={MC.dim}
          className="flex-1 text-white font-body-semibold text-[12.5px]"
          style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
        />
      </View>

      <Pressable onPress={onBellPress} className="w-9 h-9 rounded-[10px] items-center justify-center" style={({ hovered }: any) => hovered ? { backgroundColor: 'rgba(20,184,166,0.10)' } : undefined}>
        <Bell size={16} color={MC.muted} />
        {notifCount > 0 && (
          <View className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 rounded-[7px] items-center justify-center px-[3px]" style={{ backgroundColor: MC.red, borderColor: MC.bg, borderWidth: 1.5 }}>
            <Text className="text-white font-display-bold text-[9px]">{notifCount}</Text>
          </View>
        )}
      </Pressable>
      <View className="ml-1 flex-row items-center gap-2">
        <HelpMenu portal="mentor" />
        <Pressable onPress={onAvatarPress} style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
          <Av initials={initials} size={34} color={MC.teal} photo={photo} />
        </Pressable>
      </View>
    </View>
  );
}
