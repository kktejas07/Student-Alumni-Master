// self-contained shared widgets used by several tabs (FeatureCard, GradientButton, Loading) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import React from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD_FROM, GRAD_TO } from './settingsTokens';
import { s } from './settingsStyles';

export function FeatureCard({ icon: Icon, tint, title, text }: { icon: any; tint: string; title: string; text: string }) {
  return (
    <View style={s.featCard}>
      <View style={[s.featIcon, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
        <Icon size={16} color={tint} />
      </View>
      <Text style={s.featTitle}>{title}</Text>
      <Text style={s.muted}>{text}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Shared building blocks
 * ───────────────────────────────────────────────────────────────── */
export function GradientButton({ onPress, loading, children, disabled }: {
  onPress: () => void; loading?: boolean; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading || disabled} style={({ hovered }: any) => [
      { opacity: loading || disabled ? 0.6 : 1 },
      hovered && Platform.OS === 'web' ? { transform: [{ translateY: -1 }] } : null,
    ]}>
      <LinearGradient colors={[GRAD_FROM, GRAD_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : children}
      </LinearGradient>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <ActivityIndicator color={GRAD_TO} size="small" />
      <Text style={s.muted}>Loading…</Text>
    </View>
  );
}
