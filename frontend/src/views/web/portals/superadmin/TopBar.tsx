/**
 * Super Admin Portal — top bar with title + date + search + bell + avatar.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, Bell, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { SAC, FONTS } from './tokens';
import { ADMIN } from './data';
import { Av } from './atoms';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const NOTIFICATIONS = [
  { id: '1', kind: 'success', text: '12 mentors approved', time: '2m ago' },
  { id: '2', kind: 'warn', text: '7 pending approvals need review', time: '15m ago' },
  { id: '3', kind: 'info', text: 'Weekly report ready to view', time: '1h ago' },
];

export function TopBar({ title = 'Overview' }: { title?: string }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifOpen, setNotifOpen] = React.useState(false);

  const notifIcon = (kind: string) => {
    switch (kind) {
      case 'success': return <CheckCircle2 size={12} color="#86EFAC" />;
      case 'warn': return <AlertTriangle size={12} color="#FBBF24" />;
      default: return <Info size={12} color="#93C5FD" />;
    }
  };

  return (
    <View style={s.bar}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.date}>{today()}</Text>
      </View>

      <View style={s.searchBox}>
        <Search size={14} color={SAC.dim} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => {
            if (searchQuery.trim()) {
              alert(`Search not yet wired to a global search endpoint. Query: "${searchQuery.trim()}"`);
            }
          }}
          placeholder="Search anything…"
          placeholderTextColor={SAC.dim}
          style={s.searchInput}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
            <X size={12} color={SAC.muted} />
          </Pressable>
        )}
      </View>

      <View style={{ position: 'relative' }}>
        <Pressable
          onPress={() => setNotifOpen(!notifOpen)}
          style={({ hovered }: any) => [s.bell, hovered && { backgroundColor: SAC.cardH }]}
        >
          <Bell size={16} color={SAC.muted} />
          <View style={s.bellDot} />
        </Pressable>

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
      </View>

      <HelpMenu portal="super_admin" />

      <Av initials={ADMIN.initials} size={36} color={SAC.primaryD} />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 22, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
    backgroundColor: SAC.bg2,
  },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4 },
  date:  { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 240, height: 34, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
  },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  bell: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: SAC.card,
    borderColor: SAC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  bellDot: {
    position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4,
    backgroundColor: SAC.red, borderWidth: 1.5, borderColor: SAC.bg2,
  },
  notifPanel: {
    position: 'absolute', top: 42, right: 0, width: 280, zIndex: 100,
    backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 12, padding: 14, gap: 10,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' } as any) : {}),
  },
  notifTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13, marginBottom: 4 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11.5 },
  notifTime: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },
});
