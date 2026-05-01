/**
 * /mentor-portal — Pixel-exact rendering of the Mentor Portal HTML spec
 * inside a full-viewport iframe, with a floating Logout button at the
 * bottom-left that stays anchored to the viewport.
 */
import React from 'react';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function MentorPortalRoute() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={s.fallback}>
        <Text style={s.fallbackTitle}>Mentor Portal</Text>
        <Text style={s.fallbackText}>Open this URL on the web to see the full portal.</Text>
      </View>
    );
  }

  const src = '/mentor-portal.html';

  return (
    <View style={s.shell}>
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

      {/* Floating Logout button — wrapped in a raw DOM <div> with
          `position: fixed` so it stays anchored to the viewport regardless
          of how React Native Web renders the outer layout. */}
      {React.createElement(
        'div',
        {
          style: {
            position: 'fixed',
            bottom: 16,
            left: 16,
            zIndex: 1000,
          },
        },
        <Pressable
          onPress={onLogout}
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
      )}
    </View>
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
