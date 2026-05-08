/**
 * Agent K Launcher — sidebar feature card.
 *
 * Sits ABOVE the main nav (between My Student Card and Main Menu header).
 * Two visual modes:
 *   • Expanded sidebar  → gradient feature card with BETA pill, pulse ring
 *   • Collapsed sidebar → 48px circle with same gradient + pulse
 *
 * On click → routes to /agent-k. Cmd/Ctrl+K opens the QuickLauncher modal
 * (handled separately in AgentKQuickLauncher).
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { NX } from '@/src/theme/nexus';
import { useAgentKStore } from '@/src/viewmodels/stores/agentKStore';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

function PulseRing({ color = NX.purple, size = 32 }: { color?: string; size?: number }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [sv]);
  const a = useAnimatedStyle(() => ({
    opacity: 0.6 - sv.value * 0.6,
    transform: [{ scale: 1 + sv.value * 0.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 2, borderColor: color,
        },
        a,
      ]}
    />
  );
}

export function AgentKLauncher({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const activeRun = useAgentKStore((s) => s.activeRun);

  if (collapsed) {
    return (
      <Pressable
        onPress={() => router.push('/agent-k')}
        accessibilityRole="button"
        accessibilityLabel="Agent K · Run automations"
        style={({ hovered, pressed }: any) => ([
          styles.collapsedWrap,
          hovered && Platform.OS === 'web' ? { transform: [{ scale: 1.05 }] } as any : null,
          pressed ? { transform: [{ scale: 0.96 }] } : null,
        ])}
      >
        <PulseRing size={48} />
        <LinearGradient
          colors={[NX.purple, NX.cyan] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.collapsedCircle}
        >
          <MaterialCommunityIcons name="robot-outline" size={20} color="#fff" />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/agent-k')}
      accessibilityRole="button"
      accessibilityLabel="Agent K · Run automations"
      style={({ hovered }: any) => ([
        styles.outer,
        hovered && Platform.OS === 'web' ? { borderColor: 'rgba(124,58,237,0.55)', transform: [{ translateY: -1 }] } as any : null,
      ])}
    >
      <LinearGradient
        colors={['rgba(124,58,237,0.16)', 'rgba(34,211,238,0.10)'] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Top row: pulse + label + BETA */}
        <View style={styles.topRow}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <PulseRing size={32} />
            <View style={styles.iconTile}>
              <MaterialCommunityIcons name="robot-outline" size={16} color="#fff" />
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.kicker}>AGENT K</Text>
            <View style={styles.betaPill}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Run automations</Text>
        <Text style={styles.subtitle}>Let AI handle multi-step tasks for you</Text>

        {/* Cmd+K hint */}
        <View style={styles.kbdRow}>
          <View style={styles.kbd}><Text style={styles.kbdText}>⌘</Text></View>
          <View style={styles.kbd}><Text style={styles.kbdText}>K</Text></View>
          <Text style={styles.kbdHint}>quick launcher</Text>
        </View>

        {/* Active run progress bar */}
        {activeRun && (
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer',
      transitionProperty: 'border-color, transform, box-shadow',
      transitionDuration: '200ms',
      boxShadow: '0 0 24px -8px rgba(124,58,237,0.4)',
    } as any) : {}),
  },
  gradient: { padding: 14, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  iconTile: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: NX.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  kicker: {
    color: '#C4B5FD', fontFamily: FONT, fontSize: 11,
    fontWeight: '700', letterSpacing: 1.4,
  },
  betaPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.18)',
  },
  betaText: {
    color: '#67E8F9', fontFamily: FONT, fontSize: 9,
    fontWeight: '700', letterSpacing: 0.6,
  },
  title: { color: '#fff', fontFamily: FONT, fontSize: 14, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontFamily: FONT, fontSize: 12, marginBottom: 4 },
  kbdRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  kbd: {
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  kbdText: { color: '#E5E7EB', fontFamily: FONT, fontSize: 10, fontWeight: '700' },
  kbdHint: { color: 'rgba(255,255,255,0.45)', fontFamily: FONT, fontSize: 10, marginLeft: 4 },
  progressBar: {
    height: 3, marginTop: 8, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', width: '40%',
    ...(Platform.OS === 'web' ? ({ background: 'linear-gradient(90deg, #7C3AED, #22D3EE)' } as any)
      : { backgroundColor: NX.purple }),
  },

  // ─── Collapsed state ───
  collapsedWrap: {
    width: 48, height: 48, marginVertical: 12, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer', transitionProperty: 'transform', transitionDuration: '180ms',
    } as any) : {}),
  },
  collapsedCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 0 16px -4px rgba(124,58,237,0.6)',
    } as any) : {}),
  },
});
