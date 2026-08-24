// @ts-nocheck
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
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { NX } from '@/src/theme/nexus';
import { useAgentKStore } from '@/src/viewmodels/stores/agentKStore';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

function PulseRing({ color = NX.purple, size = 32 }: { color?: string; size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size + 6,
        height: size + 6,
        borderRadius: (size + 6) / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity: 0.35,
      }}
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
        style={({ hovered }: any) => ([
          styles.collapsedBtn,
          hovered && Platform.OS === 'web' ? { transform: [{ scale: 1.06 }] } as any : null,
        ])}
      >
        <LinearGradient
          colors={['#7C3AED', '#22D3EE']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.collapsedGrad}
        >
          <Bot size={22} color="#fff" />
          {activeRun && <View style={styles.runningDot} />}
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
              <Bot size={16} color="#fff" />
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

const styles = {
  outer: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.32)',
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.85)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(124,58,237,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset',
      transition: 'border-color 160ms, transform 160ms, box-shadow 160ms',
      cursor: 'pointer',
    } as any : {}),
  },
  gradient: {
    padding: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NX.purple,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(124,58,237,0.45)',
    } as any : {}),
  },
  kicker: {
    color: '#E0E7FF',
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  betaPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(34,211,238,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
  },
  betaText: {
    color: '#22D3EE',
    fontFamily: FONT,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  subtitle: {
    color: '#94A3B8',
    fontFamily: FONT,
    fontSize: 11,
    lineHeight: 15,
  },
  kbdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  kbd: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  kbdText: {
    color: '#CBD5E1',
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: '700',
  },
  kbdHint: {
    color: '#64748B',
    fontFamily: FONT,
    fontSize: 10,
    marginLeft: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    width: '65%',
    backgroundColor: '#22D3EE',
  },
  collapsedBtn: {
    width: 44,
    height: 44,
    marginHorizontal: 'auto',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  collapsedGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  runningDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22D3EE',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
} as const;
