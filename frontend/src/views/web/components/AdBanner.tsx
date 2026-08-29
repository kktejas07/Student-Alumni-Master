import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking, Image } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { fetchPortal } from '@/src/lib/portalApi';
import { resolveImageUrl } from '@/src/models/services/api';
import { TrendChart, PhotoGrid } from './BannerVisuals';

type AdItem = {
  key?: string;
  type?: 'image' | 'rich';
  label?: string;
  image_url?: string;
  redirect_url?: string;
  title?: string;
  sub?: string;
  tag?: string;
  tagColor?: string;
  bg?: string;
  cta?: string;
  ctaStyle?: 'filled' | 'ghost';
  visual?: 'none' | 'photo_grid' | 'trend_chart' | 'hackwave_logos';
};

const DEFAULT_PROMO_SLIDES: AdItem[] = [
  { key: 'p1', type: 'rich', tag: 'COLLAB EXCLUSIVE', title: 'HackWave 3.0 — 2026', sub: 'SEP 04—05 · Sreenidhi Institute of Science and Technology', cta: 'Register on Unstop', redirect_url: 'http://localhost:8081/echo/snist/register', bg: '#5A2DBE', tagColor: '#E9DDFF', ctaStyle: 'filled', visual: 'none' },
  { key: 'p2', type: 'rich', tag: 'VOICE OF GENERATIONS · VNRVJIT', title: 'Alumni took the stage, students took notes.', sub: '26 photos, 3 workshops and 5 testimonials from the last showcase.', cta: 'Open ECHO Showcase', redirect_url: 'http://localhost:8081/echo/vnrvjit/register', bg: '#14324D', tagColor: '#34D399', ctaStyle: 'ghost', visual: 'photo_grid' },
  { key: 'p3', type: 'rich', tag: 'CAREER AI · NEW', title: 'Your readiness is up 8% this week.', sub: 'Agent K rebuilt your roadmap. Next milestone: build your professional resume.', cta: 'Continue now', redirect_url: '/agent-k', bg: '#3A2352', tagColor: '#F1B8D9', ctaStyle: 'ghost', visual: 'trend_chart' },
];

export function AdBanner() {
  const [ads, setAds] = useState<AdItem[]>(DEFAULT_PROMO_SLIDES);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortal<{ ads: AdItem[] }>('/ad/image')
      .then((res) => { 
        if (!cancelled && res.ads?.length) {
           setAds([...DEFAULT_PROMO_SLIDES, ...res.ads]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % ads.length);
    }, 6000);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length > 1) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length, startTimer]);

  if (!ads.length) return null;

  const ad = ads[current];
  const totalSlides = ads.length;
  const goTo = (i: number) => { setCurrent(i); startTimer(); };

  const handleCtaPress = () => {
    if (ad.redirect_url) {
      Platform.OS === 'web' ? window.open(ad.redirect_url, '_blank') : Linking.openURL(ad.redirect_url);
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
    <View style={s.richOuter}>
      <View style={[s.richSlide, { backgroundColor: ad.bg || '#3A2352' }]}>
        <View style={s.richSlideContent}>
          {/* Left: text */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {ad.tag ? <Text style={[s.richTag, { color: ad.tagColor || '#F1B8D9' }]}>{ad.tag}</Text> : null}
            <Text style={s.richTitle}>{ad.title}</Text>
            {ad.sub ? <Text style={s.richSub}>{ad.sub}</Text> : null}
            <View style={{ marginTop: 24 }}>
              <Pressable
                onPress={handleCtaPress}
                style={ad.ctaStyle === 'ghost' ? s.richCtaGhost : s.richCtaFilled}
              >
                <Text style={ad.ctaStyle === 'ghost' ? s.richCtaGhostText : s.richCtaFilledText}>
                  {ad.cta || 'Learn More'} →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Right: visual element */}
          {visualElement ? (
            <View style={s.richVisualWrap}>
              {visualElement}
            </View>
          ) : null}
        </View>

        {/* Dots */}
        {totalSlides > 1 && (
          <View style={s.richDots}>
            {ads.map((_, i) => (
              <Pressable key={i} onPress={() => goTo(i)}
                style={[s.richDot, current === i && s.richDotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const FONTS = { bold: 'Outfit, sans-serif', semi: 'Outfit, sans-serif', med: 'Outfit, sans-serif' };

const s = StyleSheet.create({
  // Image Ad styles
  imageRoot: { gap: 8, marginBottom: 16 },
  imageWrap: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  imageImg: { width: '100%', maxHeight: 320, aspectRatio: 16 / 9 },
  imageDots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  imageDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '200ms' } as any : {}),
  },
  imageDotActive: {
    backgroundColor: '#fff', width: 24, borderRadius: 4,
  },

  // Rich Ad styles
  richOuter: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#3B2B7A', marginBottom: 16 },
  richSlide: { minHeight: 300, transition: 'background 0.7s ease' as any },
  richSlideContent: { flexDirection: 'row', padding: 34, flex: 1, justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' },
  richTag: { fontFamily: FONTS.semi, fontWeight: '600', fontSize: 12, letterSpacing: 3, marginBottom: 12 },
  richTitle: { color: '#FFFFFF', fontFamily: FONTS.bold, fontWeight: '700', fontSize: 38, letterSpacing: -1.6, lineHeight: 44, marginBottom: 12 },
  richSub: { color: '#DCCEF7', fontFamily: FONTS.med, fontWeight: '500', fontSize: 15, lineHeight: 22, maxWidth: 520 },
  richCtaGhost: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, paddingVertical: 11, ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all .2s ease' } : {}) },
  richCtaGhostText: { color: '#FFFFFF', fontFamily: FONTS.semi, fontWeight: '600', fontSize: 14 },
  richCtaFilled: { alignSelf: 'flex-start', borderRadius: 10, backgroundColor: '#7C5CFC', paddingHorizontal: 20, paddingVertical: 12, ...(Platform.OS === 'web' ? { cursor: 'pointer', boxShadow: '0 8px 22px rgba(124,92,252,.28)', transition: 'all .2s ease' } : {}) },
  richCtaFilledText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontWeight: '700', fontSize: 14.5 },
  richVisualWrap: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  richDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16, marginTop: 10 },
  richDot: { width: 8, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all .3s ease' } as any : {}) },
  richDotActive: { width: 26, backgroundColor: '#FFFFFF' },
});
