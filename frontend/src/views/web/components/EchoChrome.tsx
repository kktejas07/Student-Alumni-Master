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
import React from 'react';
import { StyleSheet, View } from 'react-native';
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

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: ECHO_TOP_PADDING,
  },
});
