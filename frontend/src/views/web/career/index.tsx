import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center gap-2">
        {icon && <MaterialCommunityIcons name={icon as any} size={18} color="#818CF8" />}
        <Text className="text-white font-display-bold text-lg">{title}</Text>
      </View>
      {subtitle && <Text className="text-white/50 font-body-semibold text-[13px] mt-0.5">{subtitle}</Text>}
    </View>
  );
}

export function CareerSectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4 mb-3.5" style={style}>
      {children}
    </View>
  );
}

export function InfoChip({ label, color = '#818CF8' }: { label: string; color?: string }) {
  return (
    <View className="rounded-md px-2 py-1 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
      <Text className="text-white text-[11px] font-semibold" style={{ color }}>{label}</Text>
    </View>
  );
}

export function MetricCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <View className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5">
      <Text className="text-white/50 text-xs">{label}</Text>
      <Text className="text-white font-display-bold text-[22px] my-1">{value}</Text>
      {subtext && <Text className="text-indigo-400 text-[11px]">{subtext}</Text>}
    </View>
  );
}

export function ActionCard({ title, impact, type, onPress }: { title: string; impact: string; type?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-3 mb-2"
      style={({ hovered }: any) => hovered ? { borderColor: '#818CF8' } : undefined}
    >
      <View className="flex-1 mr-2">
        <Text className="text-white text-[13px] font-semibold">{title}</Text>
        <Text className="text-green-400 text-[11px] mt-0.5">{impact}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(238,240,255,0.5)" />
    </Pressable>
  );
}

export function SkillBar({ name, score }: { name: string; score: number }) {
  return (
    <View className="mb-2.5">
      <View className="flex-row justify-between mb-1">
        <Text className="text-white text-xs font-semibold">{name}</Text>
        <Text className="text-indigo-400 text-xs font-bold">{score}%</Text>
      </View>
      <View className="h-1.5 bg-white/[0.08] rounded-[3px] overflow-hidden">
        <View className="h-full rounded-[3px] bg-indigo-400" style={{ width: `${score}%` as any }} />
      </View>
    </View>
  );
}

export function AIInsightBubble({ text }: { text: string }) {
  return (
    <View className="flex-row gap-2.5 bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.25)] rounded-xl p-3.5 mb-2.5">
      <MaterialCommunityIcons name="sparkles" size={18} color="#818CF8" />
      <Text className="flex-1 text-white text-[13px] leading-[18px]">{text}</Text>
    </View>
  );
}

export function MilestoneCard({ milestone, meta, onPress }: { milestone: any; meta?: any; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress || meta?.onPress}
      className="flex-row items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-3 mb-2"
    >
      <MaterialCommunityIcons name={milestone.completed ? 'check-circle' : 'circle-outline'} size={20} color={milestone.completed ? '#34D399' : 'rgba(238,240,255,0.3)'} />
      <View className="flex-1">
        <Text className="text-white text-[13px] font-semibold" style={{ color: milestone.completed ? 'rgba(238,240,255,0.5)' : 'white', textDecorationLine: milestone.completed ? 'line-through' : 'none' }}>{milestone.title}</Text>
        {milestone.description && <Text className="text-white/30 text-[11px] mt-0.5">{milestone.description}</Text>}
      </View>
    </Pressable>
  );
}

export function WeeklyTaskCard({ task, onToggle }: { task: any; onToggle?: () => void }) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 py-2">
      <MaterialCommunityIcons name={task.completed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={task.completed ? '#818CF8' : 'rgba(238,240,255,0.3)'} />
      <Text className="text-white text-[13px]">{task.title}</Text>
    </Pressable>
  );
}

export function CareerGoalSimulator({ currentRole, targetRole }: { currentRole?: string; targetRole?: string }) {
  return (
    <CareerSectionCard>
      <SectionHeader title="Career Goal Simulator" subtitle={`Simulating path from ${currentRole || 'Student'} to ${targetRole || 'Software Engineer'}`} icon="compass" />
      <Text className="text-white/50 text-[13px] leading-[18px]">
        Based on market telemetry, completing the recommended milestones will place your profile in the top percentile of candidate selections.
      </Text>
    </CareerSectionCard>
  );
}

export function CareerPageSkeleton() {
  return (
    <View className="p-6 items-center justify-center">
      <ActivityIndicator size="large" color="#818CF8" />
      <Text className="text-white/50 mt-3 text-[13px]">Loading Career AI Engine...</Text>
    </View>
  );
}
