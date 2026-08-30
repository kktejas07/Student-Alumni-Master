/**
 * AdBanner — Fetches all advertisements and renders them as an auto-rotating
 * clickable carousel above the AI Daily Brief section on user dashboards.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { fetchPortal } from '@/src/lib/portalApi';
import { resolveImageUrl } from '@/src/models/services/api';

type AdItem = {
  label: string;
  image_url: string;
  redirect_url: string;
};

const DEFAULT_PROMO_SLIDES: AdItem[] = [
  { key: 'p1', type: 'rich', tag: 'COLLAB EXCLUSIVE', title: 'HackWave 3.0 — 2026', sub: 'SEP 04—05 · Sreenidhi Institute of Science and Technology', cta: 'Register on Unstop', redirect_url: '/echo/snist/register', bg: '#5A2DBE', tagColor: '#E9DDFF', ctaStyle: 'filled', visual: 'none' },
  { key: 'p2', type: 'rich', tag: 'VOICE OF GENERATIONS · VNRVJIT', title: 'Alumni took the stage, students took notes.', sub: '26 photos, 3 workshops and 5 testimonials from the last showcase.', cta: 'Open ECHO Showcase', redirect_url: '/echo/vnrvjit/register', bg: '#14324D', tagColor: '#34D399', ctaStyle: 'ghost', visual: 'photo_grid' },
  { key: 'p3', type: 'rich', tag: 'CAREER AI · NEW', title: 'Your readiness is up 8% this week.', sub: 'Agent K rebuilt your roadmap. Next milestone: build your professional resume.', cta: 'Continue now', redirect_url: '/agent-k', bg: '#3A2352', tagColor: '#F1B8D9', ctaStyle: 'ghost', visual: 'trend_chart' },
];

export function AdBanner() {
  const router = useRouter();
  const [ads, setAds] = useState<AdItem[]>(DEFAULT_PROMO_SLIDES);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortal<{ ads: AdItem[] }>('/ad/image')
      .then((res) => { if (!cancelled && res.ads?.length) setAds(res.ads); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % ads.length);
    }, 4000);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length, startTimer]);

  if (!ads.length) return null;

  const ad = ads[current];
  const goTo = (i: number) => { setCurrent(i); startTimer(); };

  const handleCtaPress = () => {
    if (!ad.redirect_url) return;
    let url = ad.redirect_url;
    // Strip hardcoded localhost origins to preserve host domain
    if (url.includes('localhost:8081') || url.includes('localhost:8000') || url.includes('127.0.0.1')) {
      try {
        const parsed = new URL(url);
        url = parsed.pathname + parsed.search + parsed.hash;
      } catch {
        url = url.replace(/^https?:\/\/[^\/]+/, '');
      }
    }

    if (url.startsWith('/')) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        router.push(url as any);
      }
    } else {
      Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url);
    }
  };

  // If it's an old image ad (or explicitly marked as image)
  if (ad.type !== 'rich' && !ad.title) {
    return (
      <View style={s.imageRoot}>
        <Pressable onPress={handleCtaPress} style={s.imageWrap}>
          <Image source={{ uri: resolveImageUrl(ad.image_url || '') }} style={s.imageImg} resizeMode="cover" />
        </Pressable>
        {ads.length > 1 && (
          <View style={s.imageDots}>
            {ads.map((_, i) => (
              <Pressable key={i} onPress={() => goTo(i)} style={[s.imageDot, i === current && s.imageDotActive]} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // Render Rich Promo Banner
  const visualElement = ad.visual === 'photo_grid' ? <PhotoGrid /> : ad.visual === 'trend_chart' ? <TrendChart /> : null;

  return (
    <View style={s.root}>
      <Pressable onPress={() => ad.redirect_url && Linking.openURL(ad.redirect_url)} style={s.wrap}>
        <Image source={{ uri: resolveImageUrl(ad.image_url) }} style={s.img} resizeMode="cover" />
      </Pressable>
      {ads.length > 1 && (
        <View style={s.dots}>
          {ads.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} style={[s.dot, i === current && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 8 },
  wrap: {
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    ...Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
  },
  img: { width: '100%', maxHeight: 320, aspectRatio: 16 / 9 },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    ...Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '200ms' } as any) : {},
  },
  dotActive: {
    backgroundColor: '#fff', width: 24, borderRadius: 4,
  },
});
