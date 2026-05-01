/**
 * /mentor-portal — Pixel-exact rendering of the user-provided HTML spec
 * (Mentor Portal - Standalone.html). Renders as a full-screen iframe on
 * web, delivering the exact design/behavior of the source file.
 *
 * The spec HTML is a self-contained React + Babel prototype with all
 * 9 views (Dashboard, Students, Calendar, Requests, Earnings, Feedback,
 * Network, Profile, Create Event) and 20+ AI widgets already built in.
 *
 * Served from /app/frontend/public/mentor-portal.html via Expo Web's
 * static asset serving, so refreshing the page preserves all state.
 */
import React from 'react';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function MentorPortalRoute() {
  const router = useRouter();

  if (Platform.OS !== 'web') {
    // On native, we could render a WebView. For now, show a placeholder so
    // the route doesn't crash during Metro bundling for non-web targets.
    return (
      <View style={s.fallback}>
        <Text style={s.fallbackTitle}>Mentor Portal</Text>
        <Text style={s.fallbackText}>Open this URL on the web to see the full portal.</Text>
      </View>
    );
  }

  // Build iframe src so the browser fetches the static HTML directly
  // (served by Expo's web bundler at /mentor-portal.html).
  const src = '/mentor-portal.html';

  return (
    <View style={s.shell}>
      {/* Back to dashboard pill, fixed top-left */}
      <Pressable
        onPress={() => router.replace('/platform')}
        style={s.backBtn}
        accessibilityRole="button"
      >
        <ArrowLeft size={14} color="#fff" />
        <Text style={s.backText}>Student Alumni</Text>
      </Pressable>

      {/* Full-viewport iframe — spec HTML with all 9 views built-in */}
      {React.createElement('iframe', {
        src,
        title: 'Mentor Portal',
        style: {
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          border: 'none', background: '#071412',
        },
      })}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#071412', position: 'relative' as any },
  backBtn: {
    position: 'absolute' as any,
    top: 14, left: 14,
    zIndex: 1000,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, height: 28, borderRadius: 999,
    backgroundColor: 'rgba(10,26,22,0.85)',
    borderColor: 'rgba(20,184,166,0.35)', borderWidth: 1,
    ...({ backdropFilter: 'blur(12px)', cursor: 'pointer' } as any),
  },
  backText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.4 },
  fallback: { flex: 1, backgroundColor: '#071412', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#14B8A6', fontFamily: 'DMSans_700Bold', fontSize: 22 },
  fallbackText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 10 },
});
