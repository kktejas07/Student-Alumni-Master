/**
 * <ConsentBanner /> — bottom sticky cookie / privacy banner with Customize modal.
 *
 * Mounted globally in app/_layout.tsx. Shows only on web, only when
 * shouldShowBanner() returns true (no record, version drift, or 13-month gap).
 *
 * Theme: FinTax360 dark glass. Independent of portal accent (it sits at the
 * platform layer, not inside a portal), so we use a neutral violet/teal pair.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Cookie, Shield, BarChart3, Megaphone, Settings2, Check, X } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import {
  saveConsent, shouldShowBanner, readLocal,
  fetchServerConsent, mirrorConsent, needsBanner,
} from './consentStore';

export function ConsentBanner() {
  // Web-only. (Native apps don't render the cookie banner.)
  if (Platform.OS !== 'web') return null;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthed = !!user;
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [prefs, setPrefs] = useState({
    analytics: false, functional: false, marketing: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isAuthed) {
        // Authenticated: server is source of truth; fall back to localStorage
        const server = await fetchServerConsent();
        if (!cancelled) {
          if (server) {
            mirrorConsent(server);
            const show = needsBanner(server);
            if (!show) {
              setPrefs({ analytics: server.analytics, functional: server.functional, marketing: server.marketing });
              return;
            }
          }
          const local = readLocal();
          const show = needsBanner(local);
          if (show) {
            const t = setTimeout(() => setOpen(true), 700);
            return () => clearTimeout(t);
          } else if (local) {
            setPrefs({ analytics: local.analytics, functional: local.functional, marketing: local.marketing });
          }
        }
      } else {
        // Anonymous: localStorage only
        const show = shouldShowBanner();
        if (!cancelled) {
          if (show) {
            const t = setTimeout(() => setOpen(true), 700);
            return () => clearTimeout(t);
          } else {
            const p = readLocal();
            if (p) setPrefs({ analytics: p.analytics, functional: p.functional, marketing: p.marketing });
          }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthed]);

  const finalize = async (mode: 'all' | 'essential' | 'custom') => {
    setSubmitting(true);
    try {
      if (mode === 'all') {
        await saveConsent({ accepted_all: true }, isAuthed);
      } else if (mode === 'essential') {
        await saveConsent({ analytics: false, functional: false, marketing: false }, isAuthed);
      } else {
        await saveConsent({ ...prefs }, isAuthed);
      }
    } finally {
      setSubmitting(false);
      setOpen(false);
      setCustomizing(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Compact bottom banner */}
      {!customizing && (
        <Animated.View entering={FadeInUp.duration(260).delay(50)} exiting={FadeOut.duration(160)} style={s.banner}>
          <View style={s.bannerInner}>
            <View style={s.bannerIcon}>
              <Cookie size={18} color="#A78BFA" />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={s.bannerTitle}>We use cookies to make this better</Text>
              <Text style={s.bannerCopy} numberOfLines={3}>
                Essential cookies keep StudentAlumni running. With your consent we also use analytics,
                functional and marketing cookies to personalise content. Read more in our{' '}
                <Text style={s.link} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>
                {' '}and{' '}
                <Text style={s.link} onPress={() => router.push('/legal/cookies')}>Cookie Policy</Text>.
              </Text>
            </View>
            <View style={s.bannerBtns}>
              <Pressable onPress={() => { setCustomizing(true); setOpen(true); }} style={s.ghostBtn}>
                <Settings2 size={12} color="rgba(255,255,255,0.78)" />
                <Text style={s.ghostBtnText}>Customize</Text>
              </Pressable>
              <Pressable onPress={() => finalize('essential')} style={s.outlineBtn}>
                <Text style={s.outlineBtnText}>Reject optional</Text>
              </Pressable>
              <Pressable onPress={() => finalize('all')} disabled={submitting}>
                <LinearGradient colors={[ '#A78BFA', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  <Check size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Accept all</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Customize modal */}
      <Modal visible={customizing} transparent animationType="fade" onRequestClose={() => setCustomizing(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeIn.duration(220)} style={s.modalCard}>
            <View style={s.modalHead}>
              <View style={[s.bannerIcon, { width: 44, height: 44, borderRadius: 12 }]}>
                <Shield size={20} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.modalTitle}>Privacy & Cookie preferences</Text>
                <Text style={s.modalSub}>Toggle the categories you're comfortable with. Essential cookies are always on — they keep the platform secure.</Text>
              </View>
              <Pressable onPress={() => setCustomizing(false)}><X size={16} color="rgba(255,255,255,0.6)" /></Pressable>
            </View>

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
              <CategoryRow
                Icon={Shield}
                title="Essential"
                desc="Required for login, security, and core platform functions. Cannot be disabled."
                value={true}
                locked
              />
              <CategoryRow
                Icon={BarChart3}
                title="Analytics"
                desc="Helps us understand how the platform is used so we can improve features (PostHog / Firebase)."
                value={prefs.analytics}
                onChange={(v) => setPrefs({ ...prefs, analytics: v })}
              />
              <CategoryRow
                Icon={Settings2}
                title="Functional"
                desc="Remembers your preferences (theme, last-viewed portal, language) across sessions."
                value={prefs.functional}
                onChange={(v) => setPrefs({ ...prefs, functional: v })}
              />
              <CategoryRow
                Icon={Megaphone}
                title="Marketing"
                desc="Lets us share contextual updates about new features, courses, and partner offers."
                value={prefs.marketing}
                onChange={(v) => setPrefs({ ...prefs, marketing: v })}
              />
            </ScrollView>

            <View style={s.modalFoot}>
              <Pressable onPress={() => finalize('essential')} style={s.outlineBtn}>
                <Text style={s.outlineBtnText}>Reject optional</Text>
              </Pressable>
              <Pressable onPress={() => finalize('custom')} disabled={submitting}>
                <LinearGradient colors={[ '#A78BFA', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
                  <Check size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Save preferences</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function CategoryRow({
  Icon, title, desc, value, onChange, locked,
}: {
  Icon: any; title: string; desc: string;
  value: boolean; onChange?: (v: boolean) => void; locked?: boolean;
}) {
  return (
    <View style={s.catRow}>
      <View style={s.catIcon}>
        <Icon size={15} color="#A78BFA" />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={s.catTitle}>{title}{locked ? '  ·  always on' : ''}</Text>
        <Text style={s.catDesc}>{desc}</Text>
      </View>
      <Pressable
        disabled={locked}
        onPress={() => onChange?.(!value)}
        style={[s.toggle, value && s.toggleOn, locked && { opacity: 0.7 }]}
      >
        <View style={[s.toggleKnob, value && s.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12,
    zIndex: 9999,
    ...(Platform.OS === 'web' ? ({ position: 'fixed' as any } as any) : {}),
  },
  bannerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' as any,
    backgroundColor: 'rgba(15,20,38,0.92)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    maxWidth: 1280, alignSelf: 'center', width: '100%',
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(20px) saturate(160%)',
      boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset',
    } as any) : {}),
  },
  bannerIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  bannerCopy:  { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 12.5, lineHeight: 18, maxWidth: 720 },
  link: { color: '#C4B5FD', textDecorationLine: 'underline' as any },
  bannerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  outlineBtn: {
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  outlineBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  primaryBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },

  /* modal */
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 620, maxHeight: '92%',
    backgroundColor: '#0f1426',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 26px 64px rgba(0,0,0,0.65)' } as any) : {}),
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16, letterSpacing: -0.3 },
  modalSub: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 3, lineHeight: 17 },
  modalFoot: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },

  /* category row */
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  catIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  catDesc:  { color: 'rgba(255,255,255,0.60)', fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 16 },
  toggle: {
    width: 38, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    padding: 2, justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  toggleOn: { backgroundColor: 'rgba(167,139,250,0.65)' },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleKnobOn: { alignSelf: 'flex-end' },
});
