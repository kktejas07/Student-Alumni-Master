import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface OnboardingProgressBarProps {
  step: number;
  totalSteps?: number;
  labels?: string[];
  stepSeconds?: number[];
  minutesLeftOverride?: number;
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

  const progressRatio = total > 1 ? currentStep / (total - 1) : 1;

  const remainingSeconds = stepSeconds
    .slice(currentStep)
    .reduce((acc, val) => acc + (val || 30), 0);
  const calculatedMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
  const minsLeft = minutesLeftOverride ?? calculatedMinutes;

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
      className="w-full mb-[18px]"
      style={style as any}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${total}: ${currentLabel}. Approximately ${minsLeft} minutes remaining.`}
      accessibilityValue={{ min: 1, max: total, now: currentStep + 1 }}
    >
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-gray-600 font-body-semibold text-[11.5px]">
          Step {currentStep + 1} of {total}
        </Text>
        <Text className="text-gray-500 font-body-semibold text-[11.5px]">~{minsLeft} min left</Text>
      </View>

      <View className="h-1 rounded bg-gray-200 mb-2 overflow-hidden">
        <Animated.View
          className="h-full rounded bg-violet-600"
          style={[{ width: barWidth }, Platform.OS === 'web' ? { transition: 'width 0.38s cubic-bezier(0.16, 1, 0.3, 1)' } : undefined]}
        />
      </View>

      <View className="w-full">
        <Animated.View className="flex-row items-center justify-between w-full py-0.5" style={{ opacity: labelOpacityAnim }}>
          {labels.map((label, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <React.Fragment key={`${label}-${i}`}>
                <View className="flex-row items-center">
                  <Text
                    className="font-body-semibold text-[11px]"
                    style={{
                      color: isCompleted ? '#10B981' : isCurrent ? '#111827' : '#9CA3AF',
                      fontFamily: isCurrent ? 'DMSans_700Bold' : undefined,
                    }}
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
