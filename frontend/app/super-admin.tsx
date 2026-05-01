/**
 * /super-admin — True React Native port of the Super Admin Dashboard.
 *
 * Renders <SuperAdminPortalRN /> by default. ?legacy=1 → original HTML iframe.
 */
import React from 'react';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { SuperAdminPortalRN } from '@/src/views/web/portals/superadmin/SuperAdminPortalRN';

export default function SuperAdminRoute() {
  const { legacy } = useLocalSearchParams<{ legacy?: string }>();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  if (Platform.OS !== 'web') {
    return <SuperAdminPortalRN />;
  }

  if (legacy === '1') {
    return (
      <View style={s.shell}>
        {React.createElement('iframe', {
          src: '/super-admin.html',
          title: 'Super Admin Dashboard (HTML spec)',
          style: {
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none', backgroundColor: '#0F0A05',
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

  return <SuperAdminPortalRN />;
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0F0A05', position: 'relative' as any },
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
});
