/**
 * Splash router - shows SA logo with animation, then routes user.
 */
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors as C, Gradients, Typography } from '@/src/theme';
import { GradientBackground, SALogo } from '@/src/views/components';

export default function Index() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    if (!initialized) return;
    const t = setTimeout(() => {
      if (!user) {
        router.replace('/welcome');
      } else if (!user.onboarding_completed) {
        router.replace('/(onboarding)/role-info');
      } else {
        router.replace('/(tabs)');
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [user, initialized, router]);

  return (
    <GradientBackground colors={Gradients.splash}>
      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center', gap: 18 }}>
          <SALogo size={92} variant="glass" />
          <Text style={styles.brand}>Student Alumni</Text>
          <Text style={styles.tag}>CAREER · MENTORSHIP · NETWORK</Text>
        </Animated.View>
        <View style={{ position: 'absolute', bottom: 60 }}>
          <ActivityIndicator color={C.white} />
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { ...Typography.h1, color: C.white },
  tag: { ...Typography.label, color: C.textOnPurpleMuted, fontSize: 11 },
});
