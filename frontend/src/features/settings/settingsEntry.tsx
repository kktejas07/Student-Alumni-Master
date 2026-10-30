// SettingsView entry component + TopTabBar (the one place `s` is mutated via Object.assign(resolveColors(...))) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, useSAC, resolveColors } from '@/src/views/web/portals/superadmin/tokens';
import { Toast } from '@/src/views/web/portals/superadmin/applekit';
import { GRAD_FROM, GRAD_TO, TabId, TABS } from './settingsTokens';
import { s } from './settingsStyles';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

/* ─────────────────────────────────────────────────────────────────
 * Main view
 * ───────────────────────────────────────────────────────────────── */
export function SettingsView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const [tab, setTab] = useSubTab<TabId>(
    ['profile', 'platform', 'integrations', 'roles', 'notifications', 'security', 'digital-id', 'pages', 'templates', 'echo-hero', 'branding'],
    'profile',
    { sub, onSub },
  );
  const [toast, setToast] = useState({ visible: false, text: 'Saved', kind: 'success' as 'success' | 'error' | 'warning' | 'info' | 'pending' });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideToast = () => setToast((t) => ({ ...t, visible: false }));
  const flashToast = (text = 'Saved', kind?: 'success' | 'error' | 'warning' | 'info' | 'pending') => {
    const t = (text || '').toLowerCase();
    const resolved = kind || (
      /(fail|error|invalid|required|denied|unable)/.test(t) ? 'error'
        : /(warn|caution)/.test(t) ? 'warning'
          : /(pending|loading|sending|processing)/.test(t) ? 'pending'
            : /(info|note|editing)/.test(t) ? 'info'
              : 'success'
    );
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, kind: resolved });
    toastTimer.current = setTimeout(hideToast, 5000);
  };

  return (
    <View style={{ gap: 16 }}>
      <TopTabBar active={tab} onChange={setTab} />
      <View style={{ minHeight: 480 }}>
        {tab === 'profile'       && <ProfileTab onSaved={flashToast} />}
        {tab === 'platform'      && <PlatformTab onSaved={flashToast} />}
        {tab === 'integrations'  && <IntegrationsTab onSaved={flashToast} />}
        {tab === 'roles'         && <RolesTab onSaved={flashToast} />}
        {tab === 'notifications' && <NotificationsTab onSaved={flashToast} />}
        {tab === 'security'      && <SecurityTab onSaved={flashToast} />}
        {tab === 'digital-id'    && <DigitalIdTab onSaved={flashToast} />}
        {tab === 'pages'         && <PagesTab onSaved={flashToast} />}
        {tab === 'templates'     && <TemplatesTab onSaved={flashToast} />}
        {tab === 'echo-hero'     && <EchoLandingHeroTab onSaved={flashToast} />}
        {tab === 'branding'      && <BrandingTab onSaved={flashToast} />}
      </View>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hideToast} />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Top horizontal tab bar
 * ───────────────────────────────────────────────────────────────── */
function TopTabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <View style={s.tabBarOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, padding: 6 }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          if (isActive) {
            return (
              <Pressable key={t.id} onPress={() => onChange(t.id)}>
                <LinearGradient
                  colors={[GRAD_FROM, GRAD_TO]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.tabActive}
                >
                  <Icon size={14} color="#fff" />
                  <Text style={s.tabActiveText}>{t.label}</Text>
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              style={({ hovered }: any) => [
                s.tabInactive,
                hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null,
              ]}
            >
              <Icon size={13} color={SAC.muted} />
              <Text style={s.tabInactiveText}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
