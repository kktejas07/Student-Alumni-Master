/**
 * <PromoBanner /> — cross-portal promotional banner.
 *
 * Loads /api/promotions/active and renders the first (highest priority,
 * lowest display_order) promotion that the user hasn't dismissed.
 *
 * Mounted at the top of each portal's scrollable content. Uses the per-promo
 * `tone` to colour itself; falls back to the portal accent if none is set.
 *
 * Dismissed promos are remembered in localStorage so they don't reappear
 * within the same browser; the same promo IS shown to a new device/session
 * (intentionally — admin can rotate creative without forcing a re-dismiss).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Image, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X, ArrowRight, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request, resolveImageUrl } from '@/src/models/services/api';

export type PromoTone =
  | 'violet' | 'blue' | 'indigo' | 'teal' | 'amber' | 'rose' | 'emerald';

export type Promotion = {
  id: string;
  title: string;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
  badge?: string | null;
  tone: PromoTone;
  audience: string[];
  placement: 'dashboard' | 'inline' | 'modal';
  dismissible: boolean;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  display_order: number;
  image_url?: string | null;
};

const TONE_GRAD: Record<PromoTone, [string, string]> = {
  violet:  ['#60A5FA', '#2563EB'],
  blue:    ['#60A5FA', '#2563EB'],
  indigo:  ['#818CF8', '#4F46E5'],
  teal:    ['#5EEAD4', '#0D9488'],
  amber:   ['#FDE68A', '#D97706'],
  rose:    ['#FDA4AF', '#E11D48'],
  emerald: ['#6EE7B7', '#059669'],
};

const TONE_TINT: Record<PromoTone, string> = {
  violet:  'rgba(37,99,235,0.22)',
  blue:    'rgba(96,165,250,0.22)',
  indigo:  'rgba(129,140,248,0.22)',
  teal:    'rgba(94,234,212,0.22)',
  amber:   'rgba(253,230,138,0.22)',
  rose:    'rgba(253,164,175,0.22)',
  emerald: 'rgba(110,231,183,0.22)',
};

const DISMISSED_KEY = 'sa.promos.dismissed.v1';

function readDismissed(): Record<string, number> {
  if (Platform.OS !== 'web') return {};
  try { return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || '{}') || {}; }
  catch { return {}; }
}
function writeDismissed(map: Record<string, number>) {
  if (Platform.OS !== 'web') return;
  try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(map)); } catch {}
}

export function PromoBanner({ portal }: { portal: 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' }) {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => readDismissed());
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) { setItems([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await request<{ items: Promotion[] }>('/promotions/active');
        if (!cancelled) setItems(r.items || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
    // Reload when portal changes (different role context)
  }, [portal, user]);

  const promo = useMemo(() => {
    const visible = (items || []).filter((p) => !dismissed[p.id]);
    return visible[0] || null;
  }, [items, dismissed]);

  const onDismiss = useCallback(() => {
    if (!promo) return;
    const next = { ...dismissed, [promo.id]: Date.now() };
    setDismissed(next);
    writeDismissed(next);
  }, [promo, dismissed]);

  const onCta = useCallback(() => {
    if (!promo?.cta_url) return;
    if (Platform.OS === 'web') {
      // Internal route or external URL — both supported
      if (/^https?:\/\//.test(promo.cta_url)) {
        window.open(promo.cta_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(promo.cta_url);
      }
    } else {
      Linking.openURL(promo.cta_url).catch(() => {});
    }
  }, [promo]);

  if (!promo) return null;

  const grad = TONE_GRAD[promo.tone] || TONE_GRAD.violet;
  const tint = TONE_TINT[promo.tone] || TONE_TINT.violet;

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={s.wrap}>
      <View style={[s.shell, { borderColor: tint.replace('0.22', '0.45') as any }]}>
        {/* Tone gradient stripe down the left edge */}
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={s.stripe}
        />

        {/* Optional image */}
        {promo.image_url ? (
          <View style={s.imgBox}>
            <Image source={{ uri: resolveImageUrl(promo.image_url) }} style={s.img} resizeMode="cover" />
          </View>
        ) : (
          <View style={[s.iconBox, { backgroundColor: tint, borderColor: tint.replace('0.22', '0.45') as any }]}>
            <Sparkles size={16} color={grad[0]} />
          </View>
        )}

        {/* Text */}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={s.titleRow}>
            {promo.badge ? (
              <View style={[s.badge, { backgroundColor: tint, borderColor: tint.replace('0.22', '0.55') as any }]}>
                <Text style={[s.badgeText, { color: grad[0] }]}>{promo.badge}</Text>
              </View>
            ) : null}
            <Text style={s.title} numberOfLines={1}>{promo.title}</Text>
          </View>
          {!!promo.body && (
            <Text style={s.body} numberOfLines={2}>{promo.body}</Text>
          )}
        </View>

        {/* CTA */}
        {promo.cta_label && promo.cta_url ? (
          <Pressable onPress={onCta}>
            <LinearGradient
              colors={grad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.cta}
            >
              <Text style={s.ctaText}>{promo.cta_label}</Text>
              <ArrowRight size={12} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Dismiss */}
        {promo.dismissible && (
          <Pressable onPress={onDismiss} style={s.dismiss}>
            <X size={14} color="rgba(255,255,255,0.55)" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  shell: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 16, paddingLeft: 18,
    borderRadius: 14, borderWidth: 1,
    backgroundColor: 'rgba(15,20,38,0.78)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(20px) saturate(160%)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset',
    } as any) : {}),
  },
  stripe: {
    position: 'absolute' as any, left: 0, top: 0, bottom: 0, width: 4,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  imgBox: {
    width: 38, height: 38, borderRadius: 11, overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  img: { width: '100%', height: '100%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 0.6 },
  title: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5, flexShrink: 1 },
  body:  { color: 'rgba(255,255,255,0.72)', fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ctaText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  dismiss: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
});
