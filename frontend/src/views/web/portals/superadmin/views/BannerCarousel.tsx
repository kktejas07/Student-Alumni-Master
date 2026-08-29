// @ts-nocheck
/**
 * Banner Carousel — matches sa-dashboard-export.html reference exactly.
 * 3 promo slides with visual elements (photo grid, chart) + dynamic ad slides.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { useSAC, FONTS, SAC, resolveColors } from '../tokens';
import { resolveImageUrl } from '@/src/models/services/api';

type Props = {
  ads: any[];
  onNavigate?: (id: string) => void;
};

/* ─── SVG Chart for Career AI slide (web only) ──────────────────────── */
function TrendChart() {
  if (Platform.OS !== 'web') return null;
  return (
    <svg viewBox="0 0 260 180" style={{ width: 260, height: 180 }}>
      <path
        d="M10 160 C 60 150 80 110 120 96 C 165 80 190 40 250 18"
        fill="none" stroke="#F8C7E4" strokeWidth="2.5" strokeLinecap="round"
      />
      <circle cx="120" cy="96" r="5" fill="#FFFFFF" />
      <circle cx="250" cy="18" r="6" fill="#FFFFFF" />
    </svg>
  );
}

/* ─── Photo grid for ECHO slide ──────────────────────────────────────── */
function PhotoGrid() {
  const gridColors = [
    'linear-gradient(140deg, #1E6E63, #14514C)',
    'linear-gradient(140deg, #24796B, #175A52)',
    'linear-gradient(140deg, #1A5F5C, #123F44)',
    'linear-gradient(140deg, #24796B, #175A52)',
    'linear-gradient(140deg, #1A5F5C, #123F44)',
    'linear-gradient(140deg, #1E6E63, #14514C)',
  ];
  if (Platform.OS !== 'web') return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 84px)', gap: 8, flex: 'none' as any }}>
      {gridColors.map((bg, i) => (
        <div key={i} style={{
          height: 84, borderRadius: 8, backgroundColor: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...(i === 5 ? { fontSize: 15, fontWeight: 700, color: '#fff' } : {}),
        }}>
          {i === 5 ? '+26' : ''}
        </div>
      ))}
    </div>
  );
}

export function BannerCarousel({ ads, onNavigate }: Props) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));

  const [heroSlide, setHeroSlide] = useState(0);

  const PROMO_SLIDES = [
    {
      tag: 'COLLAB EXCLUSIVE', title: 'HackWave 3.0 — 2026',
      sub: 'SEP 04—05 · Sreenidhi Institute of Science and Technology',
      cta: 'Register on Unstop', bg: '#5A2DBE',
      tagColor: '#E9DDFF', ctaStyle: 'filled' as const,
      visual: null,
    },
    {
      tag: 'VOICE OF GENERATIONS · VNRVJIT',
      title: 'Alumni took the stage, students took notes.',
      sub: '26 photos, 3 workshops and 5 testimonials from the last showcase.',
      cta: 'Open ECHO Showcase', bg: '#14324D',
      tagColor: '#34D399', ctaStyle: 'ghost' as const,
      visual: <PhotoGrid />,
    },
    {
      tag: 'CAREER AI · NEW',
      title: 'Your readiness is up 8% this week.',
      sub: 'Agent K rebuilt your roadmap. Next milestone: build your professional resume.',
      cta: 'Continue now', bg: '#3A2352',
      tagColor: '#F1B8D9', ctaStyle: 'ghost' as const,
      visual: <TrendChart />,
    },
  ];

  const adSlides = ads.map((ad) => ({
    tag: 'ADVERTISEMENT', title: ad.label || 'Promotion',
    sub: ad.description || '', cta: ad.cta_text || 'Learn more',
    bg: ad.bg_color || '#5A2DBE', tagColor: '#E9DDFF',
    ctaStyle: 'filled' as const, image_url: ad.image_url,
    redirect_url: ad.redirect_url, isAd: true, visual: null,
  }));

  const allSlides = [...PROMO_SLIDES, ...adSlides];
  const totalSlides = allSlides.length;

  useEffect(() => {
    const t = setInterval(() => setHeroSlide((p) => (p + 1) % totalSlides), 6000);
    return () => clearInterval(t);
  }, [totalSlides]);

  const slide = allSlides[heroSlide % totalSlides];

  const handleCtaPress = () => {
    if (slide.isAd && slide.redirect_url) {
      Platform.OS === 'web' ? window.open(slide.redirect_url, '_blank') : null;
    } else {
      const idx = heroSlide % PROMO_SLIDES.length;
      if (idx === 0 || idx === 1) onNavigate?.('echo-showcase');
      else onNavigate?.('ai-insights');
    }
  };

  return (
    <View style={s.outer}>
      <View style={[s.slide, { backgroundColor: slide.bg }]}>
        <View style={s.slideContent}>
          {/* Left: text */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.tag, { color: slide.tagColor }]}>{slide.tag}</Text>
            <Text style={s.title}>{slide.title}</Text>
            {slide.sub ? <Text style={s.sub}>{slide.sub}</Text> : null}
            {slide.isAd && slide.image_url ? (
              <Image source={{ uri: resolveImageUrl(slide.image_url) }} style={s.adImage} resizeMode="cover" />
            ) : null}
            <View style={{ marginTop: 20 }}>
              <Pressable
                onPress={handleCtaPress}
                style={slide.ctaStyle === 'ghost' ? s.ctaGhost : s.ctaFilled}
              >
                <Text style={slide.ctaStyle === 'ghost' ? s.ctaGhostText : s.ctaFilledText}>
                  {slide.cta} →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Right: visual element */}
          {slide.visual ? (
            <View style={s.visualWrap}>
              {slide.visual}
            </View>
          ) : null}
        </View>

        {/* Dots */}
        <View style={s.dots}>
          {allSlides.map((_, i) => (
            <Pressable key={i} onPress={() => setHeroSlide(i)}
              style={[s.dot, heroSlide % totalSlides === i && s.dotActive]}
            />
          ))}
        </View>

        {/* Ad badge */}
        {slide.isAd && (
          <View style={s.adBadge}>
            <Megaphone size={10} color="#fff" />
            <Text style={s.adBadgeText}>AD</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#3B2B7A' },
  slide: { minHeight: 300 },
  slideContent: { flexDirection: 'row', padding: 34, flex: 1, justifyContent: 'space-between', gap: 24 },
  tag: { fontFamily: FONTS.semi, fontSize: 12, letterSpacing: 3, marginBottom: 12 },
  title: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 38, letterSpacing: -1.6, lineHeight: 44, marginBottom: 12 },
  sub: { color: '#DCCEF7', fontFamily: FONTS.med, fontSize: 15, lineHeight: 22, maxWidth: 520 },
  adImage: { width: 160, height: 100, borderRadius: 12, marginTop: 16 },
  ctaGhost: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 20, paddingVertical: 11, ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all .2s ease' } : {}) },
  ctaGhostText: { color: '#FFFFFF', fontFamily: FONTS.semi, fontSize: 14 },
  ctaFilled: { alignSelf: 'flex-start', borderRadius: 10, backgroundColor: '#7C5CFC', paddingHorizontal: 20, paddingVertical: 12, ...(Platform.OS === 'web' ? { cursor: 'pointer', boxShadow: '0 8px 22px rgba(124,92,252,.28)', transition: 'all .2s ease' } : {}) },
  ctaFilledText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14.5 },
  visualWrap: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16 },
  dot: { width: 8, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', cursor: 'pointer' },
  dotActive: { width: 26, backgroundColor: '#FFFFFF' },
  adBadge: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  adBadgeText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
});
