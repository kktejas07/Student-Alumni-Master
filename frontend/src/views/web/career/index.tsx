import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/src/lib/designTokens';

export function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <MaterialCommunityIcons name={icon as any} size={18} color={COLORS.purpleL} />}
        <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      </View>
      {subtitle && <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>}
    </View>
  );
}

export function CareerSectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 }, style]}>
      {children}
    </View>
  );
}

export function InfoChip({ label, color = COLORS.purpleL }: { label: string; color?: string }) {
  return (
    <View style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function MetricCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: 12, padding: 14 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginVertical: 4 }}>{value}</Text>
      {subtext && <Text style={{ color: COLORS.purpleL, fontSize: 11 }}>{subtext}</Text>}
    </View>
  );
}

export function ActionCard({ title, impact, type, onPress }: { title: string; impact: string; type?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 }, hovered && { borderColor: COLORS.purpleL }]}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: COLORS.green, fontSize: 11, marginTop: 2 }}>{impact}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
    </Pressable>
  );
}

export function SkillBar({ name, score }: { name: string; score: number }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: COLORS.purpleL, fontSize: 12, fontWeight: '700' }}>{score}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${score}%`, backgroundColor: COLORS.purpleL, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export function AIInsightBubble({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.25)', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <MaterialCommunityIcons name="sparkles" size={18} color={COLORS.purpleL} />
      <Text style={{ flex: 1, color: COLORS.textPrimary, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

export function MilestoneCard({ milestone, meta, onPress }: { milestone: any; meta?: any; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress || meta?.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <MaterialCommunityIcons name={milestone.completed ? 'check-circle' : 'circle-outline'} size={20} color={milestone.completed ? COLORS.green : COLORS.dim} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: milestone.completed ? COLORS.textSecondary : COLORS.textPrimary, fontSize: 13, fontWeight: '600', textDecorationLine: milestone.completed ? 'line-through' : 'none' }}>{milestone.title}</Text>
        {milestone.description && <Text style={{ color: COLORS.dim, fontSize: 11, marginTop: 2 }}>{milestone.description}</Text>}
      </View>
    </Pressable>
  );
}

export function WeeklyTaskCard({ task, onToggle }: { task: any; onToggle?: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <MaterialCommunityIcons name={task.completed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={task.completed ? COLORS.purpleL : COLORS.dim} />
      <Text style={{ color: COLORS.textPrimary, fontSize: 13 }}>{task.title}</Text>
    </Pressable>
  );
}

export function CareerGoalSimulator({ currentRole, targetRole }: { currentRole?: string; targetRole?: string }) {
  return (
    <CareerSectionCard>
      <SectionHeader title="Career Goal Simulator" subtitle={`Simulating path from ${currentRole || 'Student'} to ${targetRole || 'Software Engineer'}`} icon="compass" />
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Based on market telemetry, completing the recommended milestones will place your profile in the top percentile of candidate selections.
      </Text>
    </CareerSectionCard>
  );
}

export function CareerPageSkeleton() {
  return (
    <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={COLORS.purpleL} />
      <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 13 }}>Loading Career AI Engine...</Text>
    </View>
  );
}
