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
  View, Text, StyleSheet, Animated, Easing, Platform,
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
  const beatOpacities = BEATS.map(() => useRef(new Animated.Value(0)).current);
  const beatScales   = BEATS.map(() => useRef(new Animated.Value(0.85)).current);

  // Icon row activation (left-to-right)
  const iconAnims = BEATS.map(() => useRef(new Animated.Value(0)).current);

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
      <View style={s.container}>

        {/* Header */}
        <Text style={s.label}>Getting {firstName}'s dashboard ready…</Text>

        {/* Icon activation row */}
        <View style={s.iconRow}>
          {BEATS.map((beat, i) => {
            const opacity = iconAnims[i];
            const bg = iconAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255,255,255,0.04)', 'rgba(124,58,237,0.30)'],
            });
            const border = iconAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(255,255,255,0.08)', 'rgba(196,181,253,0.55)'],
            });
            return (
              <React.Fragment key={i}>
                <Animated.View style={[
                  s.iconBubble,
                  { backgroundColor: bg, borderColor: border },
                ]}>
                  <Animated.View style={[{ opacity: iconAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]}>
                    <beat.icon size={20} color="#FFF" />
                  </Animated.View>
                </Animated.View>
                {i < BEATS.length - 1 && (
                  <Animated.View style={[
                    s.iconConnector,
                    {
                      backgroundColor: iconAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['rgba(255,255,255,0.08)', 'rgba(124,58,237,0.5)'],
                      }),
                    },
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Beat text blocks — stacked, only active one is visible */}
        <View style={s.beatContainer}>
          {beatTexts.map((text, i) => (
            <Animated.View
              key={i}
              style={[
                s.beatRow,
                {
                  opacity: beatOpacities[i],
                  transform: [{ scale: beatScales[i] }],
                  display: i <= activeBeat ? 'flex' : 'none',
                },
              ]}
            >
              <View style={s.beatIconWrap}>
                {React.createElement(BEATS[i].icon as any, { size: 16, color: i === activeBeat ? '#FFF' : 'rgba(255,255,255,0.5)' })}
              </View>
              <Text style={[
                s.beatText,
                i === activeBeat && s.beatTextActive,
              ]}>{text}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={s.barBg}>
          <Animated.View style={[s.barFill, { width: progressWidth }]} />
        </View>

        {/* Personalizing label */}
        <Text style={s.sub}>
          Personalizing based on your{' '}
          <Text style={s.highlight}>{pathLabel}</Text>
          {' '}profile
        </Text>

      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 20,
  },

  label: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  // Icon row
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  iconConnector: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },

  // Beat text stack
  beatContainer: {
    width: '100%',
    minHeight: 120,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    justifyContent: 'flex-end',
  },
  beatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  beatIcon: { fontSize: 16 },
  beatText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FONTS.med,
    fontSize: 13.5,
    flex: 1,
  },
  beatTextActive: {
    color: '#FFF',
    fontFamily: FONTS.bold,
  },

  // Progress bar
  barBg: {
    width: '100%',
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#7C3AED',
    ...(Platform.OS === 'web' ? { transition: 'width 0.3s ease' } as any : {}),
  },

  // Footer
  sub: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    textAlign: 'center',
  },
  highlight: {
    color: '#C4B5FD',
    fontFamily: FONTS.bold,
  },
});
