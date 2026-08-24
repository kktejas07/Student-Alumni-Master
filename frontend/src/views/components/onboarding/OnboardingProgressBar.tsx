/**
 * Reusable Onboarding Progress Component.
 *
 * Supports:
 *   - Current Step & Total Steps ("Step 2 of 8")
 *   - Estimated Time Remaining ("~4 min left")
 *   - Animated Progress Bar (smooth width transition via Animated.timing)
 *   - Scrollable Step Labels with status indication:
 *       • Completed steps: muted green with checkmark
 *       • Current step: highlighted
 *       • Future steps: muted
 *   - Fully responsive for mobile and web
 *   - Uses design tokens from auth tokens
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AC, FONTS } from '@/src/views/auth/tokens';

export interface OnboardingProgressBarProps {
  /** Current step index (0-indexed) */
  step: number;
  /** Total number of steps (defaults to labels.length or 8) */
  totalSteps?: number;
  /** Ordered array of step labels */
  labels?: string[];
  /** Estimated seconds per step (defaults to sensible onboarding timing) */
  stepSeconds?: number[];
  /** Optional override for remaining minutes */
  minutesLeftOverride?: number;
  /** Optional custom style for the outer container */
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_LABELS = [
  'College',
  'Education',
  'Career Path',
  'Goal',
  'Interests',
  'Skills',
  'Profile',
  'Badge',
];

const DEFAULT_STEP_SECONDS = [90, 20, 25, 15, 30, 30, 60, 20];

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  step = 0,
  totalSteps,
  labels = DEFAULT_LABELS,
  stepSeconds = DEFAULT_STEP_SECONDS,
  minutesLeftOverride,
  style,
}) => {
  const total = totalSteps ?? labels.length ?? 8;
  const currentStep = Math.max(0, Math.min(step, total - 1));

  // Compute progress ratio (0 to 1)
  const progressRatio = total > 1 ? currentStep / (total - 1) : 1;

  // Compute estimated time remaining
  const remainingSeconds = stepSeconds
    .slice(currentStep)
    .reduce((acc, val) => acc + (val || 30), 0);
  const calculatedMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const minsLeft = minutesLeftOverride ?? calculatedMinutes;

  // Animated width for the progress bar
  const progressAnim = useRef(new Animated.Value(progressRatio)).current;
  const labelOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progressRatio,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Subtle label pulse when step changes
      Animated.sequence([
        Animated.timing(labelOpacityAnim, {
          toValue: 0.65,
          duration: 120,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(labelOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [currentStep, progressRatio, progressAnim, labelOpacityAnim]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentLabel = labels[currentStep] || `Step ${currentStep + 1}`;

  return (
    <View
      style={[s.container, style]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${total}: ${currentLabel}. Approximately ${minsLeft} minutes remaining.`}
      accessibilityValue={{ min: 1, max: total, now: currentStep + 1 }}
    >
      {/* Top Row: Current Step indicator (Top Left) & Time Remaining (Top Right) */}
      <View style={s.topRow}>
        <Text style={s.stepCounter}>
          Step {currentStep + 1} of {total}
        </Text>
        <Text style={s.timeLeft}>~{minsLeft} min left</Text>
      </View>

      {/* Below: Animated Progress Bar */}
      <View style={s.barBackground}>
        <Animated.View style={[s.barFill, { width: barWidth }]} />
      </View>

      {/* Below: Labels */}
      <View style={s.labelsContainer}>
        <Animated.View style={[s.labelsRow, { opacity: labelOpacityAnim }]}>
          {labels.map((label, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <React.Fragment key={`${label}-${i}`}>
                <View style={s.labelItem}>
                  <Text
                    style={[
                      s.labelBase,
                      isCompleted && s.labelCompleted,
                      isCurrent && s.labelCurrent,
                    ]}
                  >
                    {isCompleted ? '✓ ' : ''}
                    {label}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
};

export default OnboardingProgressBar;

const s = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCounter: {
    color: '#374151',
    fontFamily: FONTS.med,
    fontSize: 11.5,
  },
  timeLeft: {
    color: '#6B7280',
    fontFamily: FONTS.med,
    fontSize: 11.5,
  },
  barBackground: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2563EB',
    ...(Platform.OS === 'web'
      ? ({ transition: 'width 0.38s cubic-bezier(0.16, 1, 0.3, 1)' } as any)
      : {}),
  },
  labelsContainer: {
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 2,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelBase: {
    color: '#9CA3AF',
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  labelCompleted: {
    color: '#10B981',
  },
  labelCurrent: {
    color: '#111827',
    fontFamily: FONTS.bold,
  },
  labelSeparator: {
    color: '#9CA3AF',
    fontSize: 10.5,
    marginHorizontal: 4,
  },
});
