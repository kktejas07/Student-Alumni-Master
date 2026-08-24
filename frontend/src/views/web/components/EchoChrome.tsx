/**
 * EchoChrome — shared public header + footer for the /echo pages.
 *
 * Reuses the exact same Navbar + Footer from the marketing landing page
 * (nexus-glow-landing) so the /echo pages have the identical menu and footer
 * as /welcome. The Navbar is fixed at the top; pages must clear it with top
 * padding (ECHO_TOP_PADDING). The footer renders in normal flow at the END of
 * the page content (not pinned to the viewport).
 */
// @ts-nocheck
import React, { useState } from 'react';
import { StyleSheet, View, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import '../../../nexus-glow-styles.css';

/** Height to clear the fixed marketing navbar (matches Hero's pt-36/pt-48). */
export const ECHO_TOP_PADDING = 132;

export function EchoHeader() {
  return <Navbar />;
}

export function EchoFooter() {
  return <Footer />;
}

/** Wrapper for the scrollable body — reserves room for the fixed navbar. */
export function EchoPageBody({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

/**
 * EchoImg — Image wrapper with a gradient fallback when the source URL
 * returns a 404 or network error.  Keeps the layout space occupied so
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

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: ECHO_TOP_PADDING,
  },
});
