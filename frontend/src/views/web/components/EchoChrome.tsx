/**
 * EchoChrome — shared public header + footer for the /echo and /verify pages.
 *
 * Reuses the exact same Navbar + Footer from the marketing landing page
 * (nexus-glow-landing) with the luxury glowing SA Watermark.
 */
// @ts-nocheck
import React, { useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import '@/src/nexus-glow-styles.css';

/** Height to clear the fixed marketing navbar (matches Hero's pt-36/pt-48). */
export const ECHO_TOP_PADDING = 120;

export function EchoHeader() {
  return <Navbar />;
}

export function EchoFooter() {
  return <Footer />;
}

export function EchoWatermark({ top = 100, right = 24, size = 720, opacity = 0.11, rotation = '0deg' }: any) {
  return <SAWatermark top={top} right={right} size={size} opacity={opacity} rotation={rotation} />;
}

/** Wrapper for the scrollable body — reserves room for the fixed navbar and includes background watermark. */
export function EchoPageBody({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.body, style]}>
      <SAWatermark top={100} right={10} size={720} opacity={0.11} rotation="0deg" />
      {children}
    </View>
  );
}

/**
 * EchoImg — Image wrapper with a gradient fallback when the source URL
 * returns a 404 or network error. Keeps the layout space occupied so
 * the page doesn't jump when the error placeholder swaps in.
 */
export function EchoImg({ source, fallbackGradient, fallbackLabel, style, resizeMode = 'cover', ...rest }: any) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const uri = source?.uri;
  if (failed) {
    return (
      <LinearGradient
        colors={fallbackGradient || ['rgba(123,61,191,0.35)', 'rgba(95,37,159,0.55)', 'rgba(30,10,80,0.85)']}
        style={[style, { alignItems: 'center', justifyContent: 'center' }]}
      >
        {fallbackLabel ? (
          <View style={{ padding: 12, alignItems: 'center' }}>
            <Image source={require('../../../assets/images/sa-icon.png')} style={{ width: 40, height: 40, opacity: 0.5, marginBottom: 6 }} resizeMode="contain" />
            <View style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>{fallbackLabel}</View>
          </View>
        ) : null}
      </LinearGradient>
    );
  }
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onLoad={() => setLoading(false)}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

const styles = {
  body: {
    flex: 1,
    paddingTop: ECHO_TOP_PADDING,
    position: 'relative',
  },
} as const;
