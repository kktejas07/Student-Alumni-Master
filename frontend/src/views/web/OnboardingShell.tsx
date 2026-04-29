/**
 * OnboardingShell — shared layout for all onboarding screens.
 *
 * Handles BOTH web (split-screen with brand pane) and mobile (dark full-screen)
 * with a consistent step bar, header, scrollable content, and sticky CTA row.
 *
 * Usage:
 *   <OnboardingShell
 *     step={1}
 *     stepLabel="Step 1 of 5"
 *     stepBarSteps={['Profile','School','Path','Photo','Done']}
 *     title={<>Tell us about your{'\n'}<Text>institution</Text></>}
 *     subtitle="We'll connect you with the right alumni and mentors."
 *     primaryLabel="Continue →"
 *     onPrimary={onSubmit}
 *     primaryDisabled={!valid}
 *     onSecondary={() => router.push('/skip')}
 *     secondaryLabel="Skip"
 *     onBack={() => router.back()}
 *   >
 *     ...form content...
 *   </OnboardingShell>
 */
import { ReactNode } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebPrimaryBtn, WebGhostBtn, WebStepBar } from '@/src/views/web/AuthWebControls';

const IS_WEB = Platform.OS === 'web';

export type OnboardingShellProps = {
  step: number;
  stepBarSteps: string[];
  title: ReactNode;
  subtitle?: string;
  kicker?: string;
  children: ReactNode;
  // Primary CTA
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  primaryTestID?: string;
  // Optional secondary CTA (e.g., Skip)
  secondaryLabel?: string;
  onSecondary?: () => void;
  // Back button
  onBack?: () => void;
  showBack?: boolean;
};

export function OnboardingShell({
  step,
  stepBarSteps,
  title,
  subtitle,
  kicker,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  primaryTestID,
  secondaryLabel,
  onSecondary,
  onBack,
  showBack = true,
}: OnboardingShellProps) {
  const Body = (
    <View style={{ width: '100%' }}>
      {/* Header row — back + step bar */}
      <View style={styles.headerRow}>
        {showBack && onBack ? (
          <Pressable
            onPress={onBack}
            style={({ hovered }: any) => [styles.backBtn, hovered && { opacity: 1 }]}
            testID="onboarding-back-btn"
          >
            <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <View style={{ flex: 1 }}>
          <WebStepBar steps={stepBarSteps} current={Math.max(0, Math.min(step, stepBarSteps.length - 1))} />
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Kicker / Title / Subtitle */}
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {/* Form content */}
      <View style={{ marginTop: 18 }}>{children}</View>

      {/* CTA row */}
      <View style={{ marginTop: 22 }}>
        <WebPrimaryBtn
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          loading={primaryLoading}
          testID={primaryTestID}
        />
        {secondaryLabel && onSecondary ? (
          <View style={{ marginTop: 10 }}>
            <WebGhostBtn label={secondaryLabel} onPress={onSecondary} />
          </View>
        ) : null}
      </View>
    </View>
  );

  // ─── WEB ─────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthWebShell variant="split">
        {Body}
      </AuthWebShell>
    );
  }

  // ─── NATIVE (iOS/Android) ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.nativeSafe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.nativeScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {Body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Shared dark-theme primitives ────────────────────────────────────────────

/** Pill-shaped chip with hover/active states. Use in interest/skill/category pickers. */
export function DarkChip({
  label, active, onPress, testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered, pressed }: any) => [
        chipStyles.chip,
        hovered && !active && { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(196,181,253,0.30)' },
        active && chipStyles.chipActive,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** Soft glass info card — used for hints/notes inside onboarding screens. */
export function DarkInfoCard({
  children, tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'info';
}) {
  const palette = {
    neutral: {
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.08)',
    },
    warning: {
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(252,211,77,0.28)',
    },
    info: {
      bg: 'rgba(124,58,237,0.12)',
      border: 'rgba(196,181,253,0.28)',
    },
  }[tone];
  return (
    <View
      style={[
        infoStyles.card,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      {children}
    </View>
  );
}

/** Toggle (switch) for dark theme. */
export function DarkToggle({
  on, onChange, testID,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      testID={testID}
      style={[toggleStyles.track, on && toggleStyles.trackOn]}
    >
      <View style={[toggleStyles.knob, on && toggleStyles.knobOn]} />
    </Pressable>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  backBtn: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  kicker: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },

  nativeSafe: {
    flex: 1,
    backgroundColor: '#0F0820',
  },
  nativeScroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 60,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    ...({ cursor: 'pointer', transitionDuration: '140ms' } as any),
  },
  chipActive: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderColor: '#7C3AED',
  },
  chipText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
});

const infoStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
});

const toggleStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 2,
    justifyContent: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  trackOn: { backgroundColor: '#7C3AED' },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  knobOn: { alignSelf: 'flex-end' },
});
