// @ts-nocheck
/**
 * Super Admin Portal — sticky top bar.
 * Design: SA New Theme reference (DESIGN-HANDOFF §5 — chrome bar).
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, Bell, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from './tokens';
import { Av } from './atoms';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { useToast } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayInitials, displayName } from '@/src/lib/portalHome';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const NOTIFICATIONS = [
  { id: '1', kind: 'success', text: '12 mentors approved', time: '2m ago' },
  { id: '2', kind: 'warn', text: '7 pending approvals need review', time: '15m ago' },
  { id: '3', kind: 'info', text: 'Weekly report ready to view', time: '1h ago' },
];

export function TopBar({ title = 'Overview' }: { title?: string }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifOpen, setNotifOpen] = React.useState(false);
  const userName = displayName(user);

  const notifIcon = (kind: string) => {
    switch (kind) {
      case 'success': return <CheckCircle2 size={13} color={T.ok} />;
      case 'warn': return <AlertTriangle size={13} color={T.amber} />;
      default: return <Info size={13} color={T.sky} />;
    }
  };

  return (
    <View style={s.bar}>
      {/* Toggle button — visible on narrow viewports */}
      <Pressable style={s.navToggle} onPress={() => {}}>
        <View style={{ gap: 3 }}>
          <View style={[s.hamburgerLine, { width: 16 }]} />
          <View style={[s.hamburgerLine, { width: 16 }]} />
          <View style={[s.hamburgerLine, { width: 16 }]} />
        </View>
      </Pressable>

      {/* Greeting */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={s.greeting}>{greeting()}, {userName}</Text>
        <Text numberOfLines={1} style={s.greetingSub}>Here's your personalised dashboard for today</Text>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Search size={15} color={T.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => {
            if (searchQuery.trim()) {
              toast.info('Search unavailable', `Global search is not wired yet for "${searchQuery.trim()}".`);
            }
          }}
          placeholder="Search anything..."
          placeholderTextColor={T.dim}
          style={s.searchInput}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
            <X size={13} color={T.muted} />
          </Pressable>
        )}
      </View>

      {/* Bell */}
      <Pressable
        onPress={() => setNotifOpen(!notifOpen)}
        style={({ hovered }: any) => [s.bell, hovered && { backgroundColor: T.panel2 }]}
      >
        <Bell size={16} color={T.muted} />
        <View style={s.bellDot} />
        {notifOpen && (
          <View style={s.notifPanel}>
            <Text style={s.notifTitle}>Notifications</Text>
            {NOTIFICATIONS.map((n) => (
              <View key={n.id} style={s.notifRow}>
                {notifIcon(n.kind)}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.notifText} numberOfLines={1}>{n.text}</Text>
                  <Text style={s.notifTime}>{n.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      {/* Help */}
      <HelpMenu portal="super_admin" />

      {/* Avatar */}
      <Av initials={displayInitials(user)} size={38} color={T.violet} />
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  bar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: SAC.line,
    backgroundColor: SAC.chrome,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)' } as any) : {}),
  },

  /* Hamburger toggle */
  navToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SAC.line2,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'none',
    marginRight: 6,
  },
  hamburgerLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: SAC.muted,
  },

  /* Greeting */
  greeting: {
    color: SAC.text,
    fontFamily: FONTS.bold,
    fontSize: 19,
    letterSpacing: -0.3,
  },
  greetingSub: {
    color: SAC.muted,
    fontFamily: FONTS.med,
    fontSize: 13,
    marginTop: 2,
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    width: 300,
    maxWidth: 300,
    minWidth: 0,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SAC.line2,
    backgroundColor: SAC.panel2,
  },
  searchInput: {
    flex: 1,
    color: SAC.text,
    fontFamily: FONTS.med,
    fontSize: 13.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  /* Bell */
  bell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SAC.line2,
    backgroundColor: SAC.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SAC.danger,
  },

  /* Notification panel */
  notifPanel: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 280,
    zIndex: 100,
    backgroundColor: SAC.panel,
    borderColor: SAC.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    ...(Platform.OS === 'web' ? ({ boxShadow: SAC.shadow } as any) : {}),
  },
  notifTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, marginBottom: 4 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifText: { color: SAC.text, fontFamily: FONTS.semi, fontSize: 11.5 },
  notifTime: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },
});
