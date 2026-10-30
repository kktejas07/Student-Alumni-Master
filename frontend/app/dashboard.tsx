import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { tokenStore } from '@/src/models/services/api';
import { portalPathForRole } from '@/src/lib/portalHome';

/**
 * /dashboard — Central role-aware dashboard dispatcher and route guard.
 *
 * Ensures that newly onboarded or returning users navigating to /dashboard
 * are verified against authStore, localStorage, or tokenStore, and redirected
 * to their respective role portal (/student-portal/dashboard, /alumni-portal, etc.)
 * without being bounced to /login or trapped on /get-started.
 */
export default function DashboardRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const setUser = useAuthStore((s) => s.setUser);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuthAndRedirect() {
      try {
        let currentUser = user;

        // 1. Fallback: check localStorage for cached user session on web
        if (!currentUser && Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const rawUser = window.localStorage.getItem('sa_user');
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              if (parsed) {
                currentUser = parsed;
                setUser(parsed);
              }
            }
          } catch {}
        }

        // 2. Check for access token
        const token = await tokenStore.getAccess();

        // 3. If authenticated, route to the correct portal
        if (currentUser || token) {
          const role = (currentUser?.role || 'student').toLowerCase();
          let target = '/student-portal/dashboard';
          if (role === 'admin' || role === 'super_admin') {
            target = '/super-admin';
          } else if (role === 'college') {
            target = '/college-portal';
          } else if (role === 'mentor') {
            target = '/mentor-portal';
          } else if (role === 'alumni' || role === 'alumnus') {
            target = '/alumni-portal';
          }

          if (mounted) {
            router.replace(target as any);
          }
          return;
        }

        // 4. If initialized and genuinely no session found, send to login
        if (initialized && !token && !currentUser) {
          if (mounted) {
            router.replace('/login');
          }
          return;
        }
      } catch (err) {
        // Fallback: navigate to student dashboard rather than trapping user
        if (mounted) {
          router.replace('/student-portal/dashboard');
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    }

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, [user, initialized, router, setUser]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5B4FE9" />
      <Text style={styles.text}>Loading your dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
});

