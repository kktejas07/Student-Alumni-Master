/**
 * AdBanner — Fetches all advertisements and renders them as an auto-rotating
 * clickable carousel above the AI Daily Brief section on user dashboards.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Image, Pressable, StyleSheet, Platform, Linking, Dimensions } from 'react-native';
import { fetchPortal } from '@/src/lib/portalApi';
import { resolveImageUrl } from '@/src/models/services/api';

type AdItem = {
  label: string;
  image_url: string;
  redirect_url: string;
};

export function AdBanner() {
  const [ads, setAds] = useState<AdItem[]>([]);
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
