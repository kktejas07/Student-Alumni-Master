import React from 'react';
import { View, Text } from 'react-native';
import { CC } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Skill = { skill: string; demand: number; supply: number; gap: number; color: string };
type Hiring = { company: string; openings: number; tier: string; season: string; color: string };
type Role = { role: string; growth: string; openings: number; color: string };
const FALLBACK = { skill_gaps: [] as Skill[], hiring_intent: [] as Hiring[], roles_in_demand: [] as Role[] };

export function CareerIntelView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/career-intel', FALLBACK);
  const SKILLS = data.skill_gaps || [];
  const HIRING = data.roles_in_demand || [];
  return (
    <View className="flex-row gap-4 flex-wrap">
      <View className="flex-[1.5] min-w-[320px]">
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[18px]">
          <Text className="text-text font-display-bold text-[14px]">Skill Demand vs Supply</Text>
          <Text className="text-muted font-body text-[11.5px] mt-[3px]">Aggregated from job-board data and your batch profiles.</Text>
          <View className="mt-4 gap-[14px]">
            {SKILLS.map((sk) => (
              <View key={sk.skill}>
                <View className="flex-row justify-between mb-[5px]">
                  <Text className="text-text font-body-bold text-[12.5px]">{sk.skill}</Text>
                  <Text className="font-body-bold text-[11px]" style={{ color: sk.gap > 30 ? CC.red : sk.gap > 10 ? CC.amber : CC.green }}>Gap: {sk.gap}</Text>
                </View>
                <View className="relative h-[10px]">
                  <View className="absolute h-[6px] rounded-[3px] top-[2px]" style={{ width: `${sk.demand}%` as any, backgroundColor: sk.color + '60' }} />
                  <View className="absolute h-[6px] rounded-[3px] top-0" style={{ width: `${sk.supply}%` as any, backgroundColor: sk.color }} />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-dim font-body text-[10.5px]">Supply: {sk.supply}%</Text>
                  <Text className="text-dim font-body text-[10.5px]">Demand: {sk.demand}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View className="flex-1 min-w-[280px]">
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[18px]">
          <Text className="text-text font-display-bold text-[14px]">Hiring Demand</Text>
          <Text className="text-muted font-body text-[11.5px] mt-[3px]">Roles in demand · last 30 days.</Text>
          <View className="gap-[10px] mt-3">
            {HIRING.map((h) => (
              <View key={h.role} className="flex-row items-center gap-[10px] py-2 border-b border-glass-border">
                <View className="flex-1 min-w-0">
                  <Text numberOfLines={1} className="text-text font-body-bold text-[12.5px]">{h.role}</Text>
                  <Text className="text-muted font-body text-[11px] mt-[2px]">{h.openings} openings</Text>
                </View>
                <Badge label={h.growth} color={h.growth.includes('↑') ? 'green' : 'red'} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
