import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Calendar as CalIcon, Plus } from 'lucide-react-native';
import { CC } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

type Ev = {
  id: string;
  title: string;
  date: string;
  mode: string;
  city: string;
  cat: string;
  attending: number;
  capacity: number;
  accent: string;
  price?: number | null;
};
const FALLBACK = { items: [] as Ev[] };

export function EventsView({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const collegeName = user?.college_info?.institution_name || user?.school_info?.institution_name || '';
  const path = collegeName ? `/college/events?college_name=${encodeURIComponent(collegeName)}` : '/college/events';
  const { data } = usePortalData<typeof FALLBACK>(path, FALLBACK);
  const events = data?.items || [];
  return (
    <View>
      <View className="flex-row items-center mb-[14px]">
        <Text className="text-text font-display-bold text-[16px]">All Events ({events.length})</Text>
        <View className="flex-1" />
        <Pressable className="flex-row gap-[6px] items-center px-[14px] h-[34px] rounded-[10px] bg-violet" onPress={() => onNavigate?.('create-event')}>
          <Plus size={14} color="#fff" />
          <Text className="text-text font-display-bold text-xs">Create Event</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {events.map((e) => (
          <View key={e.id} className="bg-glass-soft border border-glass-border rounded-[14px] p-4" style={{ flexGrow: 1, flexBasis: 300, maxWidth: 360 }}>
            <View className="w-10 h-10 rounded-[10px] border items-center justify-center mb-3" style={{ backgroundColor: e.accent + '20', borderColor: e.accent + '40' }}>
              <CalIcon size={20} color={e.accent} />
            </View>
            <Text numberOfLines={2} className="text-text font-body-bold text-[14px] leading-[18px]">{e.title}</Text>
            <Text className="text-muted font-body text-[11.5px] mt-1">{e.date} · {e.mode}</Text>
            <View className="flex-row items-center gap-[6px] mt-2"><Badge label={`${e.attending} attending`} color="cyan" /></View>
            <Pressable
              className="mt-3 h-8 rounded-lg bg-glass-soft border border-glass-border items-center justify-center"
              onPress={() => router.push({
                pathname: `/manage-event/${e.id}` as any,
                params: {
                  id: e.id,
                  title: e.title,
                  start_date: e.date,
                  venue: e.city || 'Online',
                  registration_deadline: e.date,
                  category: e.cat || 'Workshop',
                  organizer: 'Institution Partner',
                  image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400',
                  url: '',
                  tags: 'Networking,Career,Academic',
                  price: e.price !== undefined && e.price !== null ? String(e.price) : '',
                }
              })}
            >
              <Text className="text-teal font-body-bold text-xs">Manage →</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
