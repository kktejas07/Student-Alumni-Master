/**
 * /super-admin — Pixel-exact rendering of the Super Admin Dashboard v3
 * HTML spec inside a full-viewport iframe, with a floating Log Out button.
 *
 * Same pattern as the other portals. Platform-level admins (role: 'admin')
 * land here; college admins (role: 'college') stay on /college-portal.
 */
import React from 'react';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function SuperAdminRoute() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={s.fallback}>
        <Text style={s.fallbackTitle}>Super Admin Dashboard</Text>
        <Text style={s.fallbackText}>Open this URL on the web to see the full portal.</Text>
      </View>
    );
  }

  return (
    <View style={s.shell}>
      {React.createElement('iframe', {
        src: '/super-admin.html',
        title: 'Super Admin Dashboard',
        style: {
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          border: 'none', backgroundColor: '#0A0A0F',
        },
      })}

      {React.createElement(
        'div',
        { style: { position: 'fixed', bottom: 16, left: 16, zIndex: 1000 } },
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
  shell: { flex: 1, backgroundColor: '#0A0A0F', position: 'relative' as any },
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
  fallback: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#F59E0B', fontFamily: 'DMSans_700Bold', fontSize: 22 },
  fallbackText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 10 },
});
