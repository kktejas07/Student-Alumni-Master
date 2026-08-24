/**
 * Generating Experience — Emotional transition after onboarding.
 *
 * Replaces welcome-dashboard.tsx in the routing chain:
 *   member-id → generating-experience → portal (auto after 4.5s)
 *
 * The screen tells a 6-beat story using the user's actual onboarding data
 * (career_path, name) to make the "AI is working" feel genuine.
 *
 * Background prefetch: fires GET /dashboard + GET /ai/career-suggestions/cached
 * in parallel while the animation plays, so the dashboard loads instantly.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, Easing, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';
import { FONTS } from '@/src/views/auth/tokens';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { User, Compass, Users, BookOpen, Target } from 'lucide-react-native';

// Animation beat timings (ms)
const BEATS = [
  { delay: 0,    icon: User, text: 'Analyzing your profile…' },
  { delay: 800,  icon: Compass, text: 'placeholder' }, // filled dynamically with career_path
  { delay: 1700, icon: Users, text: 'Finding mentors for your goals…' },
  { delay: 2500, icon: BookOpen, text: 'Personalizing courses and opportunities…' },
  { delay: 3300, icon: Target, text: 'Your dashboard is ready.' },
];

const TOTAL_DURATION = 4500; // ms before navigation fires

// Maps career_path → human label for Beat 2
const PATH_LABELS: Record<string, string> = {
  job:              'Job Search',
  higher_education: 'Higher Education',
  startup:          'Startup',
  business:         'Business Leadership',
};

export default function GeneratingExperience() {
  const router = useRouter();
  const user = useAuthStore((u) => u.user);
  const firstName = user?.full_name?.split(' ')[0] || 'you';
  const careerPath = user?.career_path || '';
  const pathLabel = PATH_LABELS[careerPath] || 'Career';
  const role = user?.role || 'student';

  // Beat animation state
  const [activeBeat, setActiveBeat] = useState(-1);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [beatAnims] = useState(() =>
    BEATS.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.85),
      icon: new Animated.Value(0),
    }))
  );
  const beatOpacities = beatAnims.map((b) => b.opacity);
  const beatScales = beatAnims.map((b) => b.scale);
  const iconAnims = beatAnims.map((b) => b.icon);

  useEffect(() => {
    // ── Background data prefetch (silent) ────────────────────────────────────
    Promise.allSettled([
      api.dashboard().catch(() => null),
      api.getCachedSuggestions().catch(() => null),
    ]);

    // ── Animate progress bar over TOTAL_DURATION ──────────────────────────────
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TOTAL_DURATION - 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // ── Sequence beat activations ─────────────────────────────────────────────
    BEATS.forEach((beat, i) => {
      const timer = setTimeout(() => {
        setActiveBeat(i);
        // Fade in + scale the text block
        Animated.parallel([
          Animated.timing(beatOpacities[i], {
            toValue: 1, duration: 350, useNativeDriver: true,
          }),
          Animated.spring(beatScales[i], {
            toValue: 1, friction: 5, useNativeDriver: true,
          }),
        ]).start();
        // Glow the icon in the row
        Animated.timing(iconAnims[i], {
          toValue: 1, duration: 300, useNativeDriver: true,
        }).start();
      }, beat.delay);
      return () => clearTimeout(timer);
    });

    // ── Navigate after full duration ──────────────────────────────────────────
    const navTimer = setTimeout(() => {
      const dest =
        role === 'mentor'  ? '/mentor-portal' :
        role === 'alumni'  ? '/alumni-portal' :
        role === 'college' ? '/college-portal' :
        '/platform';
      router.replace(dest as any);
    }, TOTAL_DURATION);

    return () => clearTimeout(navTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  const beatTexts = BEATS.map((b, i) =>
    i === 1 ? `Mapping your ${pathLabel} roadmap…` : b.text
  );

  return (
    <AuthShell role={role as any}>
      <View className="items-center justify-center py-6 gap-5">

        <Text style={{ fontFamily: FONTS.bold }} className="text-text text-[20px] text-center tracking-tight">
          Getting {firstName}'s dashboard ready…
        </Text>

        <View className="flex-row items-center my-1.5">
          {BEATS.map((beat, i) => {
            const bg = iconAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['#F9FAFB', 'rgba(124,58,237,0.30)'],
            });
            const border = iconAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['#E5E7EB', 'rgba(196,181,253,0.55)'],
            });
            return (
              <React.Fragment key={i}>
                <Animated.View
                  style={{ backgroundColor: bg, borderColor: border }}
                  className="w-[46px] h-[46px] rounded-[23px] border-[1.5px] items-center justify-center"
                >
                  <Animated.View style={{ opacity: iconAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }}>
                    <beat.icon size={20} color="#111827" />
                  </Animated.View>
                </Animated.View>
                {i < BEATS.length - 1 && (
                  <Animated.View
                    style={{ backgroundColor: iconAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['#E5E7EB', 'rgba(124,58,237,0.5)'] }) }}
                    className="w-4 h-[2px] rounded-[1px]"
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View className="w-full min-h-[120px] bg-glass border border-glass-border rounded-2xl p-4 gap-2 justify-end">
          {beatTexts.map((text, i) => (
            <Animated.View
              key={i}
              style={{
                opacity: beatOpacities[i],
                transform: [{ scale: beatScales[i] }],
                display: i <= activeBeat ? 'flex' : 'none',
              }}
              className="flex-row items-center gap-2.5"
            >
              <View className="items-center justify-center">
                {React.createElement(BEATS[i].icon as any, { size: 16, color: i === activeBeat ? '#FFF' : '#6B7280' })}
              </View>
              <Text
                style={{ fontFamily: i === activeBeat ? FONTS.bold : FONTS.med }}
                className={`text-[13.5px] flex-1 ${i === activeBeat ? 'text-text' : 'text-muted'}`}
              >
                {text}
              </Text>
            </Animated.View>
          ))}
        </View>

        <View className="w-full h-[5px] rounded-[2.5px] bg-glass overflow-hidden">
          <Animated.View
            style={[
              { width: progressWidth },
              Platform.OS === 'web' ? { transition: 'width 0.3s ease' } as any : undefined,
            ]}
            className="h-full rounded-[2.5px] bg-violet"
          />
        </View>

        <Text style={{ fontFamily: FONTS.med }} className="text-dim text-[12.5px] text-center">
          Personalizing based on your{' '}
          <Text style={{ fontFamily: FONTS.bold }} className="text-violet">{pathLabel}</Text>
          {' '}profile
        </Text>

      </View>
    </AuthShell>
  );
}
