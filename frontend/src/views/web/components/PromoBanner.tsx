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
  ab_experiment?: {
    variant_a: {
      title: string; body: string;
      cta_label: string | null; cta_url: string | null;
      badge: string | null; tone: PromoTone;
    };
    variant_b: {
      title: string; body: string;
      cta_label: string | null; cta_url: string | null;
      badge: string | null; tone: PromoTone;
    };
    winner: 'a' | 'b' | null;
    settled_at: string | null;
  } | null;
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

function promoBeacon(promoId: string, event: 'impression' | 'click', variant: 'a' | 'b' | null): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.fetch('/api/promotion-event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promo_id: promoId, event, variant: variant ?? undefined }),
    }).catch(() => {});
  } catch {}
}

export function PromoBanner({ portal }: { portal: 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' }) {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => readDismissed());
  const user = useAuthStore((s) => s.user);
  // PM3 — the A/B variant this session was assigned (cookie-sticky server-side)
  const [abVariant, setAbVariant] = useState<'a' | 'b' | null>(null);

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

  const ab = promo?.ab_experiment || null;
  const abOpen = !!ab && !ab.winner && !ab.settled_at;

  // PM3 — ask the server which variant this session should see (open
  // experiments only; settled ones keep the winner's copy locally).
  useEffect(() => {
    setAbVariant(null);
    const p = promo;
    if (!p || !abOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;
    let cancelled = false;
    window.fetch(`/api/promotions/ab/variant/${p.id}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: any) => {
        if (cancelled) return;
        if (j?.variant === 'a' || j?.variant === 'b') setAbVariant(j.variant);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [promo?.id, abOpen]);

  // PM3 — the copy actually rendered: base fields, or the assigned /
  // winning variant's fields.
  const effective = useMemo(() => {
    if (!promo || !ab) return promo;
    let v: 'a' | 'b' | null = null;
    if (ab.winner && ab.settled_at) v = ab.winner;
    else if (abOpen) v = abVariant;
    if (!v) return promo;
    const side = v === 'b' ? ab.variant_b : ab.variant_a;
    return {
      ...promo,
      title: side.title || promo.title,
      body: side.body || promo.body,
      cta_label: side.cta_label ?? promo.cta_label,
      cta_url: side.cta_url ?? promo.cta_url,
      badge: side.badge ?? promo.badge,
      tone: side.tone || promo.tone,
    };
  }, [promo, ab, abOpen, abVariant]);

  // PM2 — impression beacon, once per promo per session
  useEffect(() => {
    if (!effective || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const key = `imp:${effective.id}`;
    try { if (window.sessionStorage.getItem(key)) return; } catch {}
    try { window.sessionStorage.setItem(key, String(Date.now())); } catch {}
    const variant = ab.winner && ab.settled_at ? ab.winner : (abOpen ? abVariant : null);
    promoBeacon(effective.id, 'impression', variant);
  }, [effective?.id, abVariant]);

  const onDismiss = useCallback(() => {
    if (!promo) return;
    const next = { ...dismissed, [promo.id]: Date.now() };
    setDismissed(next);
    writeDismissed(next);
  }, [promo, dismissed]);

  const onCta = useCallback(() => {
    if (!effective?.cta_url) return;
    // PM2 — click beacon attributed to the shown variant
    const variant = ab?.winner && ab.settled_at ? ab.winner : (abOpen ? abVariant : null);
    promoBeacon(effective.id, 'click', variant);
    if (Platform.OS === 'web') {
      // Internal route or external URL — both supported
      if (/^https?:\/\//.test(effective.cta_url)) {
        window.open(effective.cta_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(effective.cta_url);
      }
    } else {
      Linking.openURL(effective.cta_url).catch(() => {});
    }
  }, [effective, ab, abOpen, abVariant]);

  if (!effective) return null;

  const grad = TONE_GRAD[effective.tone] || TONE_GRAD.violet;
  const tint = TONE_TINT[effective.tone] || TONE_TINT.violet;

  return (
    <View style={s.wrap}>
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
            {effective.badge ? (
              <View style={[s.badge, { backgroundColor: tint, borderColor: tint.replace('0.22', '0.55') as any }]}>
                <Text style={[s.badgeText, { color: grad[0] }]}>{effective.badge}</Text>
              </View>
            ) : null}
            <Text style={s.title} numberOfLines={1}>{effective.title}</Text>
          </View>
          {!!effective.body && (
            <Text style={s.body} numberOfLines={2}>{effective.body}</Text>
          )}
        </View>

        {/* CTA */}
        {effective.cta_label && effective.cta_url ? (
          <Pressable onPress={onCta}>
            <LinearGradient
              colors={grad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.cta}
            >
              <Text style={s.ctaText}>{effective.cta_label}</Text>
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
    </View>
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
