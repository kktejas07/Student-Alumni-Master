/**
 * /mentor-portal — Routes to the right rendering of the Mentor Portal:
 *
 *   • Web (default)        → True React Native portal (MentorPortalRN)
 *   • Web (?legacy=1)      → Iframe of the spec HTML (legacy fallback)
 *   • Native iOS / Android → WebView pointing to the spec HTML
 *
 * This way:
 *   - The RN port we're building is what users see by default
 *   - The original iframe-pixel-exact version is still 1 click away if
 *     anything looks off in the RN port
 *   - Mobile users get the same pixel-exact UI via WebView
 */
import React, { useEffect } from 'react';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import MentorPortalRN from '@/src/views/web/portals/mentor/MentorPortalRN';
import analytics from '@/src/lib/analytics';

// Lazy-imported on native only
let WebView: any;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch {}
}

export default function MentorPortalRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const logout = useAuthStore((st) => st.logout);

  const onLogout = async () => {
    analytics.track('logout', { from: 'mentor_portal' });
    analytics.reset();
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  // Fire portal_view on first mount
  useEffect(() => {
    analytics.pageView('mentor_portal', { variant: params.legacy === '1' ? 'iframe' : Platform.OS === 'web' ? 'rn' : 'webview' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Native: WebView fallback ───────────────────────────────────────────
  if (Platform.OS !== 'web') {
    if (!WebView) {
      return (
        <View style={s.fallback}>
          <Text style={s.fallbackTitle}>Mentor Portal</Text>
          <Text style={s.fallbackText}>react-native-webview is required on native.</Text>
        </View>
      );
    }
    return (
      <View style={s.shell}>
        <WebView
          source={{ uri: '/mentor-portal.html' }}
          style={{ flex: 1, backgroundColor: '#071412' }}
        />
        <FloatingLogout onPress={onLogout} />
      </View>
    );
  }

  // ── Web: opt-in to legacy iframe via ?legacy=1 ─────────────────────────
  const legacy = params.legacy === '1';
  if (legacy) {
    return (
      <View style={s.shell}>
        {React.createElement('iframe', {
          src: '/mentor-portal.html',
          title: 'Mentor Portal (Legacy)',
          style: {
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none', backgroundColor: '#071412',
          },
        })}
        <FloatingLogout onPress={onLogout} />
      </View>
    );
  }

  // ── Web: True React Native port (default) ──────────────────────────────
  return <MentorPortalRN />;
}

function FloatingLogout({ onPress }: { onPress: () => void }) {
  if (Platform.OS !== 'web') return null;
  return React.createElement(
    'div',
    { style: { position: 'fixed', bottom: 16, left: 16, zIndex: 1000 } },
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        s.logoutBtn,
        hovered && { backgroundColor: 'rgba(239,68,68,0.25)', borderColor: 'rgba(239,68,68,0.65)' },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Log out"
    >
      <LogOut size={14} color="#FCA5A5" />
      <Text style={s.logoutText}>Log Out</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#071412', position: 'relative' as any },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 30, borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(239,68,68,0.45)', borderWidth: 1,
    ...({
      backdropFilter: 'blur(12px)',
      cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.55)',
      transitionDuration: '160ms',
    } as any),
  },
  logoutText: { color: '#FCA5A5', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.3 },
  fallback: { flex: 1, backgroundColor: '#071412', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#14B8A6', fontFamily: 'DMSans_700Bold', fontSize: 22 },
  fallbackText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 10 },
});
