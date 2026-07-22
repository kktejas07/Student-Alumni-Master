/**
 * AdBanner — Fetches the active advertisement and renders it as a clickable
 * image banner above the AI Daily Brief section on user dashboards.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { fetchPortal } from '@/src/lib/portalApi';

export function AdBanner() {
  const [ad, setAd] = useState<{ image_url?: string; redirect_url?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPortal<{ ad: any }>('/ad/image')
      .then((res) => { if (!cancelled) setAd(res.ad); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!ad || !ad.image_url) return null;

  return (
    <Pressable onPress={() => ad.redirect_url && Linking.openURL(ad.redirect_url)} style={s.wrap}>
      <Image source={{ uri: ad.image_url }} style={s.img} resizeMode="contain" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    ...Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {},
  },
  img: { width: '100%', height: 280 },
});
