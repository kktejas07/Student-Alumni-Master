import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { Search, Bell, Calendar as CalIcon, Inbox, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CC } from './tokens';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';

export function TopBar({
  title = 'Dashboard',
  onCalendarPress,
  onNotificationsPress,
  onProfilePress,
  onAddPress,
}: {
  title?: string;
  onCalendarPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onAddPress?: () => void;
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
    <View className="flex-row items-center gap-[10px] px-[22px] py-3 border-b border-glass-border bg-bg2 relative z-10">
      <Text className="text-text font-display-bold text-[17px] tracking-tight">{title}</Text>

      <View className="flex-1" />

      <View className="flex-row items-center gap-2 w-[220px] h-[34px] px-[11px] rounded-[10px] bg-glass-soft border border-glass-border">
        <Search size={14} color={CC.dim} />
        <TextInput placeholder="Search…" placeholderTextColor={CC.dim}
          className="flex-1 text-text font-body text-xs"
          style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
      </View>

      {onAddPress && (
        <Pressable onPress={onAddPress} className="rounded-[10px] overflow-hidden"
          style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms', boxShadow: '0px 4px 14px rgba(99,102,241,0.40)' } as any : {}}>
          <View className="flex-row items-center gap-[6px] px-[14px] h-[34px]">
            <Plus size={14} color="#fff" />
            <Text className="text-text font-display-bold text-xs tracking-wider">Add</Text>
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={onCalendarPress || (() => {})}
        className="w-[34px] h-[34px] rounded-[10px] bg-glass-soft border border-glass-border items-center justify-center relative"
        style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
        <CalIcon size={16} color={CC.muted} />
      </Pressable>

      <Pressable
        onPress={onNotificationsPress || (() => router.push('/notifications'))}
        className="w-[34px] h-[34px] rounded-[10px] bg-glass-soft border border-glass-border items-center justify-center relative"
        style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
        <Bell size={16} color={CC.muted} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full items-center justify-center border-[1.5px] border-bg2" style={{ backgroundColor: '#EF4444' }}>
            <Text className="text-text font-display-bold text-[9px]">{unreadCount}</Text>
          </View>
        )}
      </Pressable>


      <Pressable
        onPress={onProfilePress}
        style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
        <Av initials={initials} size={34} color="#6366F1" photo={photo} />
      </Pressable>

      <HelpMenu portal="college" />
    </View>
  );
}
