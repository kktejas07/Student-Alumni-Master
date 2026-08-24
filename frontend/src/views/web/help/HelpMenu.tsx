/**
 * <HelpMenu /> — small dropdown for portal topbars.
 *
 * Renders a circular "?" button. Clicking it opens a small menu with:
 *   • Take a tour / Replay tour    (→ useTour().replay(portal))
 *   • Privacy Policy / Terms / Cookies    (→ /policy/*)
 *
 * Accepts a portal key so it can drive the correct tour. Accent color is
 * picked from the per-portal tour config so the active state matches.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  HelpCircle, PlayCircle, Shield, FileText, Cookie, ExternalLink,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTour } from '@/src/views/web/tour/TourProvider';
import { TOURS, TourKey } from '@/src/views/web/tour/tours.config';
import { NX } from '@/src/theme/nexus';
import { track, trackClick, logger as analyticsLogger } from '@/src/analytics';

export function HelpMenu({ portal }: { portal: TourKey }) {
  const router = useRouter();
  const { replay, status } = useTour();
  const [open, setOpen] = useState(false);
  const ref = useRef<View>(null);
  const cfg = TOURS[portal];
  const accent = cfg?.accent || '#A78BFA';
  const seen = !!status[portal]?.completed_at;

  // Close on outside click (web only)
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onDoc = (e: any) => {
      const n = ref.current as any;
      if (n && !n.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <View ref={ref} style={s.wrap}>
      <Pressable
        onPress={() => {
          trackClick('help_menu_toggle', { portal });
          analyticsLogger.debug('[HelpMenu DEBUG] Toggle help menu', { portal });
          setOpen(!open);
        }}
        nativeID="help-menu"
        testID="help-menu-toggle-btn"
        accessibilityLabel="Help menu"
        accessibilityHint="Opens help options, guided tour, and privacy policy links"
        accessibilityRole="button"
        style={({ hovered }: any) => [
          s.btn,
          open && { borderColor: accent + '88', backgroundColor: accent + '15' },
          hovered && Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.20)', borderColor: 'rgba(255,255,255,0.35)' },
        ]}
      >
        <HelpCircle size={16} color={open ? accent : 'rgba(255,255,255,0.90)'} />
      </Pressable>

      {open && (
        <View style={s.menu} testID="help-menu-dropdown">
          <Text style={s.menuLbl}>HELP</Text>

          <Pressable
            onPress={() => {
              trackClick('help_menu_replay_tour', { portal });
              analyticsLogger.debug('[HelpMenu DEBUG] Replay tour clicked', { portal });
              setOpen(false);
              replay(portal);
            }}
            accessibilityLabel={seen ? 'Replay guided tour' : 'Take guided tour'}
            testID="help-menu-tour-btn"
            accessibilityRole="button"
            style={({ hovered }: any) => [s.item, hovered && Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.04)' }]}
          >
            <View style={[s.itemIcon, { backgroundColor: accent + '15', borderColor: accent + '40' }]}>
              <PlayCircle size={13} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{seen ? 'Replay tour' : 'Take a tour'}</Text>
              <Text style={s.itemSub}>{cfg.label}</Text>
            </View>
          </Pressable>

          <View style={s.divider} />
          <Text style={s.menuLbl}>LEGAL</Text>

          <Pressable
            onPress={() => { setOpen(false); router.push('/policy/privacy'); }}
            style={({ hovered }: any) => [s.item, hovered && Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.04)' }]}
          >
            <View style={s.itemIcon}><Shield size={13} color="rgba(255,255,255,0.72)" /></View>
            <Text style={s.itemTitle}>Privacy Policy</Text>
            <ExternalLink size={11} color="rgba(255,255,255,0.40)" />
          </Pressable>
          <Pressable
            onPress={() => { setOpen(false); router.push('/policy/terms'); }}
            style={({ hovered }: any) => [s.item, hovered && Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.04)' }]}
          >
            <View style={s.itemIcon}><FileText size={13} color="rgba(255,255,255,0.72)" /></View>
            <Text style={s.itemTitle}>Terms of Service</Text>
            <ExternalLink size={11} color="rgba(255,255,255,0.40)" />
          </Pressable>
          <Pressable
            onPress={() => { setOpen(false); router.push('/policy/cookies'); }}
            style={({ hovered }: any) => [s.item, hovered && Platform.OS === 'web' && { backgroundColor: 'rgba(255,255,255,0.04)' }]}
          >
            <View style={s.itemIcon}><Cookie size={13} color="rgba(255,255,255,0.72)" /></View>
            <Text style={s.itemTitle}>Cookie Policy</Text>
            <ExternalLink size={11} color="rgba(255,255,255,0.40)" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = {
  wrap: { position: 'relative', zIndex: 50 },
  btn: {
    width: 34, height: 34, borderRadius: 99,
    backgroundColor: NX.surface2,
    borderColor: NX.border, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  menu: {
    position: 'absolute' as any,
    right: 0,
    top: 42,
    width: 260,
    backgroundColor: 'rgba(9, 13, 22, 0.80)',
    borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    zIndex: 100,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 40px rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    } as any) : {}),
  },
  menuLbl: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10, letterSpacing: 1.4,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  itemIcon: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5, flex: 1 },
  itemSub:   { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 1 },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 6, marginHorizontal: 8 },
};
