import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { CC } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

const FALLBACK = { stages: { shortlisted: [] as any[], interviewing: [] as any[], offered: [] as any[], joined: [] as any[] } };

const COLUMNS = [
  { id:'shortlisted',  label:'Shortlisted',  color:'#A78BFA' },
  { id:'interviewing', label:'Interviewing', color:'#FBBF24' },
  { id:'offered',      label:'Offered',      color:'#22C55E' },
  { id:'joined',       label:'Joined',       color:'#22D3EE' },
];

export function PlacementsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/placements', FALLBACK);
  const PIPELINE = data?.stages || FALLBACK.stages;
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  return (
    <View className={stack ? 'flex-col gap-3' : 'flex-row gap-3'}>
      {COLUMNS.map((col) => {
        const items = (PIPELINE as any)[col.id];
        return (
          <View key={col.id} className={`bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-[14px] p-[14px] min-h-[320px] ${!stack ? 'flex-1' : ''}`}>
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-2 h-2 rounded" style={{ backgroundColor: col.color }} />
              <Text className="text-text font-display-bold text-[13px]">{col.label}</Text>
              <View className="bg-[rgba(255,255,255,0.06)] px-[7px] py-[1px] rounded-md">
                <Text className="text-muted font-display-bold text-[10px]">{items.length}</Text>
              </View>
            </View>
            <View className="gap-2">
              {items.map((p: any) => (
                <View key={p.id} className="bg-glass-soft border border-glass-border rounded-[10px] p-[10px]">
                  <View className="flex-row items-center gap-2">
                    <Av initials={p.initials} size={32} color={p.color} />
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-text font-body-bold text-xs">{p.name}</Text>
                      <Text numberOfLines={1} className="text-muted font-body text-[10.5px]">{p.role}</Text>
                    </View>
                  </View>
                  <Text className="text-teal font-body-bold text-[11px] mt-2">{p.company}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
