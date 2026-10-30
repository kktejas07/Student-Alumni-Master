// @ts-nocheck
/**
 * StatusPageRN — Comprehensive Status & Error Page System
 * Matching the Student Alumni Master Status Design Specification.
 *
 * Implements 9 states:
 *  1. '404' — Not Found: "This page drifted out of orbit." + Houston quote + floating astronaut SVG
 *  2. '403' — Forbidden: "Nice try. Wrong keycard." + padlock SVG + role badge
 *  3. '401' — Session Expired: "Your session drifted off…" + hourglass SVG + auto-save notice
 *  4. '500' — Server Error: "Our side. Not yours." + server glitch SVG + error ref copy
 *  5. '503' — Maintenance: "Back in twenty minutes." + rotating gears SVG + live progress bar
 *  6. '408' — Timeout: "Still waiting… giving up." + spinning clock/radar SVG + retry counter
 *  7. 'offline' — Offline: "You are off the grid." + crossed-out wifi SVG + sync indicator
 *  8. 'empty' — No Results: "Scanned the sky. Nothing yet." + telescope SVG + filter removal chips
 *  9. 'browser' — Legacy/Unsupported: "This browser is vintage." + monitor SVG + browser badges
 *
 * Includes:
 *  - State picker toolbar to easily preview all states
 *  - Interactive rotating student quotes with animated purple squiggle
 *  - Starfield background with twinkling stars
 *  - Branded footer with DPDP Act 2023, GDPR, SOC 2 Type II compliance & newsletter box
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Platform, useWindowDimensions, ScrollView,
} from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop, Ellipse } from 'react-native-svg';
import { useRouter } from 'expo-router';
import CommonFooter from '@/src/views/components/CommonFooter';
import { useTheme } from '@/src/theme/ThemeContext';

export type StatusPageCode = '404' | '403' | '401' | '500' | '503' | '408' | 'offline' | 'empty' | 'browser';

export function StatusPageRN({
  initialCode = '404',
}: {
  initialCode?: StatusPageCode;
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const s = themedS(isDark);
  const { width } = useWindowDimensions();
  const isNarrow = width < 1040;
  const isTight = width < 720;

  // Update body background on theme change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.background = isDark ? '#0B0722' : '#FFFFFF';
      document.body.style.color = isDark ? '#F3F1FF' : '#1D1D1F';
    }
  }, [isDark]);

  const [activeCode, setActiveCode] = useState<StatusPageCode>(initialCode);
  const [copiedRef, setCopiedRef] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryLabel, setRetryLabel] = useState('Try again');
  const [subscribed, setSubscribed] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [removedChips, setRemovedChips] = useState<Record<string, boolean>>({});

  const QUOTES = [
    "Built with love for students across all campus's.",
    'The network is a feed until it meets in person.',
    'Every credential here was signed on issue.',
    '86 ECHO events across 31 campuses.',
    'Free forever for students. Verified by your college email.',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5200);
    return () => clearInterval(timer);
  }, []);

  const handleCopyRef = () => {
    setCopiedRef(true);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('SA-ERR-7F31C9');
    }
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleRetry = () => {
    setRetrying(true);
    setRetryLabel('Reconnecting…');
    setTimeout(() => {
      setRetrying(false);
      setRetryLabel('Still failing — try again');
    }, 1600);
  };

  const STATES_LIST: Array<{ code: StatusPageCode; label: string }> = [
    { code: '404', label: 'Not found' },
    { code: '403', label: 'Forbidden' },
    { code: '401', label: 'Session expired' },
    { code: '500', label: 'Server error' },
    { code: '503', label: 'Maintenance' },
    { code: '408', label: 'Timeout' },
    { code: 'offline', label: 'Offline' },
    { code: 'empty', label: 'No results' },
    { code: 'browser', label: 'Unsupported' },
  ];

  return (
    <View style={s.root}>
      {/* ── Background Starfield & Deep Auroras ────────────────────────────── */}
      <View style={s.bgWrap} pointerEvents="none">
        <View style={s.radialBg} />
        <View style={s.horizonGlow} />
      </View>

      {/* ── Global Gradients ──────────────────────────────────────────────── */}
      <Svg width="0" height="0" style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="stBadge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C9BCFF" />
            <Stop offset="0.5" stopColor="#8B6CF6" />
            <Stop offset="1" stopColor="#5B2FD0" />
          </SvgGradient>
          <SvgGradient id="stLine" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#D6CCFF" />
            <Stop offset="1" stopColor="#9B87F5" />
          </SvgGradient>
        </Defs>
      </Svg>

      {/* ── Navigation Header ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <Svg width={30} height={34} viewBox="0 0 300 350">
              <Defs>
                <SvgGradient id="stHbO" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#C9A7FF" />
                  <Stop offset="0.5" stopColor="#8B5CF6" />
                  <Stop offset="1" stopColor="#5B3FD9" />
                </SvgGradient>
                <SvgGradient id="stHbI" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#B683F5" />
                  <Stop offset="1" stopColor="#7331C9" />
                </SvgGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#stHbO)" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#stHbI)" />
              <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                SA
              </SvgText>
            </Svg>
            <Text style={s.headerBrandText}>StudentAlumni</Text>
          </Pressable>

          {!isTight && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 30, marginHorizontal: 'auto' }}>
              <Pressable onPress={() => router.push('/')}><Text style={s.headerLink}>Home</Text></Pressable>
              <Pressable onPress={() => router.push('/echo')}><Text style={s.headerLink}>ECHO</Text></Pressable>
              <Pressable onPress={() => router.push('/certificates/verify')}><Text style={s.headerLink}>Verify</Text></Pressable>
              <Pressable onPress={() => router.push('/contact')}><Text style={s.headerLink}>Contact Us</Text></Pressable>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={() => router.push('/login')}><Text style={s.signInLink}>Sign in</Text></Pressable>
            <Pressable onPress={() => router.push('/onboarding')} style={s.getStartedBtn}>
              <Text style={s.getStartedText}>Get Started</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── State Picker Bar ──────────────────────────────────────────────── */}
      <View style={s.pickerBar}>
        <View style={s.pickerRow}>
          <Text style={s.pickerLabel}>STATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {STATES_LIST.map((st) => {
              const isOn = activeCode === st.code;
              return (
                <Pressable
                  key={st.code}
                  onPress={() => setActiveCode(st.code)}
                  style={[s.pickPill, isOn && s.pickPillOn]}
                >
                  {!isNaN(parseInt(st.code, 10)) && (
                    <Text style={[s.pickPillCode, isOn && { color: '#C9BCFF' }]}>{st.code} </Text>
                  )}
                  <Text style={[s.pickPillText, isOn && { color: s._text }]}>{st.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── Main Stage ────────────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.stage}>

          {/* ── 1. 404 NOT FOUND ── */}
          {activeCode === '404' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Houston, we have a problem…</Text>
              <View style={s.artHeightBox}>
                <Text style={s.bigNumber}>404</Text>
                <View style={s.artCenter}>
                  <Svg width={260} height={280} viewBox="0 0 260 300">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={132} cy={66} r={34} />
                      <Path d="M112 52a24 24 0 0132 4" />
                      <Path d="M104 96 q28 16 58 2" />
                      <Path d="M110 100 l-12 26 6 62 44 10 34 -18 -6 -66 -22 -18" />
                      <Rect x={118} y={122} width={34} height={30} rx={5} />
                      <Path d="M124 130h8M124 138h14M124 146h6" />
                      <Path d="M98 122 l-42 26 -22 -6" />
                      <Path d="M34 142 l-14 2 4 10 12 -4" />
                      <Path d="M180 116 l40 -6 22 12" />
                      <Path d="M242 122 l14 6 -6 10 -12 -6" />
                      <Path d="M118 186 l-8 52 22 44" />
                      <Path d="M126 278 l-10 12 16 8 10 -14" />
                      <Path d="M164 190 l24 34 -6 40" />
                      <Path d="M178 262 l-8 16 18 4 6 -16" />
                      <Path d="M92 104 l-14 8 6 18 12 -6" />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>This page drifted out of orbit.</Text>
              <Text style={s.subText}>The link you followed no longer exists. Here is where students usually head next.</Text>
              <View style={s.actRow}>
                <Pressable onPress={() => router.push('/student-portal')} style={s.btnPrimary}><Text style={s.btnTextPrimary}>Back to dashboard</Text></Pressable>
                <Pressable onPress={() => router.push('/events')} style={s.btnSecondary}><Text style={s.btnTextSec}>Browse events</Text></Pressable>
                <Pressable onPress={() => router.push('/contact')} style={s.btnSecondary}><Text style={s.btnTextSec}>Help centre</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 2. 403 FORBIDDEN ── */}
          {activeCode === '403' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Nice try. Wrong keycard.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { color: 'rgba(251,191,92,0.12)' }]}>403</Text>
                <View style={s.artCenter}>
                  <Svg width={240} height={280} viewBox="0 0 240 280">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M60 96 h120 v150 H60 Z" />
                      <Path d="M60 96 q60 -34 120 0" />
                      <Path d="M78 116 v112 M162 116 v112" />
                      <Circle cx={150} cy={176} r={7} />
                      <Path d="M96 148 h44 M96 168 h30" />
                    </G>
                    <G fill="none" stroke="#FBBF5C" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M120 20 v22" />
                      <Rect x={88} y={42} width={64} height={50} rx={9} />
                      <Path d="M102 42 V30 a18 18 0 0136 0 v12" />
                      <Circle cx={120} cy={62} r={5} />
                      <Path d="M120 67 v12" />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>Your account cannot open this.</Text>
              <Text style={s.subText}>This area is limited to verified college admins. If you run placements at your institution, ask us to upgrade your role.</Text>
              <View style={s.pillBadge}>
                <View style={[s.statusDot, { backgroundColor: '#FBBF5C' }]} />
                <Text style={s.pillBadgeText}>Signed in as devender@snist.ac.in · Student</Text>
              </View>
              <View style={s.actRow}>
                <Pressable onPress={() => router.push('/contact')} style={s.btnPrimary}><Text style={s.btnTextPrimary}>Request admin access</Text></Pressable>
                <Pressable onPress={() => router.push('/student-portal')} style={s.btnSecondary}><Text style={s.btnTextSec}>Back to dashboard</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 3. 401 SESSION EXPIRED ── */}
          {activeCode === '401' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Your session drifted off…</Text>
              <View style={s.artHeightBox}>
                <Text style={s.bigNumber}>401</Text>
                <View style={s.artCenter}>
                  <Svg width={220} height={280} viewBox="0 0 220 280">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M64 30 h92 M64 250 h92" />
                      <Path d="M74 30 v26 q0 26 36 54 q36 -28 36 -54 V30" />
                      <Path d="M74 250 v-26 q0 -26 36 -54 q36 28 36 54 v26" />
                      <Path d="M110 110 v60" />
                    </G>
                    <G fill="rgba(214,204,255,0.5)">
                      <Circle cx={110} cy={196} r={3} />
                      <Circle cx={100} cy={212} r={2.4} />
                      <Circle cx={120} cy={216} r={2.4} />
                      <Circle cx={108} cy={228} r={2} />
                    </G>
                    <Ellipse cx={110} cy={140} rx={86} ry={30} fill="none" stroke="rgba(214,204,255,0.34)" strokeWidth={1.4} strokeDasharray="4 7" />
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>You have been signed out.</Text>
              <Text style={s.subText}>Sessions end after 30 days for your security. Nothing was lost — your draft is saved.</Text>
              <View style={s.actRow}>
                <Pressable onPress={() => router.push('/login')} style={s.btnPrimary}><Text style={s.btnTextPrimary}>Sign in again</Text></Pressable>
                <Pressable onPress={() => router.push('/login')} style={s.btnSecondary}><Text style={s.btnTextSec}>Use a different account</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 4. 500 SERVER ERROR ── */}
          {activeCode === '500' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Our side. Not yours.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { color: 'rgba(251,113,133,0.12)' }]}>500</Text>
                <View style={s.artCenter}>
                  <Svg width={280} height={240} viewBox="0 0 280 240">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Rect x={96} y={84} width={88} height={72} rx={10} />
                      <Path d="M112 104 h30 M112 120 h44 M112 136 h20" />
                      <Path d="M96 120 H40 l-16 -18 M40 120 l-16 18" />
                      <Path d="M184 120 h56 l16 -18 M240 120 l16 18" />
                      <Path d="M140 156 v34 M112 190 h56" />
                    </G>
                    <G fill="none" stroke="#FB7185" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M196 46 l-14 26 20 4 -16 30" />
                      <Circle cx={212} cy={70} r={4} />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>Something broke on our side.</Text>
              <Text style={s.subText}>Not your fault and not your data. The team is already paged, and this reference tells them exactly where it failed.</Text>
              <View style={s.refBox}>
                <Text style={s.refLabel}>REF</Text>
                <Text style={s.refCode}>SA-ERR-7F31C9</Text>
                <Pressable onPress={handleCopyRef}><Text style={s.copyBtn}>{copiedRef ? 'COPIED' : 'COPY'}</Text></Pressable>
              </View>
              <View style={s.actRow}>
                <Pressable onPress={handleRetry} style={s.btnPrimary}><Text style={s.btnTextPrimary}>{retrying ? 'Reconnecting…' : retryLabel}</Text></Pressable>
                <Pressable onPress={() => router.push('/contact')} style={s.btnSecondary}><Text style={s.btnTextSec}>Report a problem</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 5. 503 MAINTENANCE ── */}
          {activeCode === '503' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Back in twenty minutes.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { color: 'rgba(251,191,92,0.12)' }]}>503</Text>
                <View style={s.artCenter}>
                  <Svg width={240} height={240} viewBox="0 0 240 240">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={120} cy={120} r={46} />
                      <Circle cx={120} cy={120} r={20} />
                      <Path d="M120 74 V52 M120 166 v22 M74 120 H52 M166 120 h22 M88 88 L72 72 M152 152 l16 16 M88 152 L72 168 M152 88 l16 -16" />
                    </G>
                    <G fill="none" stroke="#FBBF5C" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M172 44 l30 30 -12 12 -30 -30 Z" />
                      <Path d="M160 56 l-42 42" />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>Scheduled maintenance.</Text>
              <Text style={s.subText}>We are moving the placement database ahead of HackWave. Bookings and tickets already issued are unaffected.</Text>
              <View style={s.progressBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: s._muted, fontSize: 12.5 }}>Migration progress</Text>
                  <Text style={{ color: s._text, fontWeight: '700', fontSize: 12.5 }}>72%</Text>
                </View>
                <View style={s.barTrack}><View style={[s.barFill, { width: '72%' }]} /></View>
                <Text style={{ color: s._dim, fontSize: 12, marginTop: 10 }}>Started 09:14 IST · ETA 09:56 IST</Text>
              </View>
              <View style={s.actRow}>
                <Pressable onPress={() => router.push('/contact')} style={s.btnPrimary}><Text style={s.btnTextPrimary}>Notify me when it is back</Text></Pressable>
                <Pressable onPress={() => router.push('/status/503')} style={s.btnSecondary}><Text style={s.btnTextSec}>Status page</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 6. 408 TIMEOUT ── */}
          {activeCode === '408' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Still waiting… giving up.</Text>
              <View style={s.artHeightBox}>
                <Text style={s.bigNumber}>408</Text>
                <View style={s.artCenter}>
                  <Svg width={220} height={260} viewBox="0 0 220 260">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={110} cy={140} r={62} />
                      <Path d="M110 96 v-18 M96 70 h28 M110 62 v8" />
                      <Path d="M156 96 l14 -14 M64 96 L50 82" />
                    </G>
                    <Path d="M110 140 V102" fill="none" stroke="#A99BFF" strokeWidth={3} strokeLinecap="round" />
                    <Path d="M110 140 l28 16" fill="none" stroke="rgba(214,204,255,0.6)" strokeWidth={2.6} strokeLinecap="round" />
                    <Circle cx={110} cy={140} r={4} fill="#A99BFF" />
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>That request timed out.</Text>
              <Text style={s.subText}>We waited 30 seconds and heard nothing back. Your input is kept, so retrying costs you nothing.</Text>
              <View style={s.pillBadge}>
                <View style={[s.statusDot, { backgroundColor: '#FBBF5C' }]} />
                <Text style={s.pillBadgeText}>Attempt 2 of 3 · next retry automatic</Text>
              </View>
              <View style={s.actRow}>
                <Pressable onPress={handleRetry} style={s.btnPrimary}><Text style={s.btnTextPrimary}>{retrying ? 'Reconnecting…' : retryLabel}</Text></Pressable>
                <Pressable onPress={() => router.push('/student-portal')} style={s.btnSecondary}><Text style={s.btnTextSec}>Save and come back</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 7. OFFLINE ── */}
          {activeCode === 'offline' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>You are off the grid.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { fontSize: 130, letterSpacing: 10, color: 'rgba(251,113,133,0.1)' }]}>OFFLINE</Text>
                <View style={s.artCenter}>
                  <Svg width={260} height={220} viewBox="0 0 260 220">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M40 150 a90 90 0 01180 0" opacity={0.45} />
                      <Path d="M74 166 a56 56 0 01112 0" opacity={0.7} />
                      <Path d="M106 182 a24 24 0 0148 0" />
                    </G>
                    <Circle cx={130} cy={196} r={7} fill="url(#stLine)" />
                    <Path d="M58 46 L204 186" fill="none" stroke="#FB7185" strokeWidth={3.4} strokeLinecap="round" />
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>No connection.</Text>
              <Text style={s.subText}>Your work is saved on this device. We will sync it the moment you are back online.</Text>
              <View style={s.pillBadge}>
                <View style={[s.statusDot, { backgroundColor: '#FB7185' }]} />
                <Text style={s.pillBadgeText}>Last synced 4 minutes ago · 2 changes pending</Text>
              </View>
              <View style={s.actRow}>
                <Pressable onPress={handleRetry} style={s.btnPrimary}><Text style={s.btnTextPrimary}>{retrying ? 'Reconnecting…' : retryLabel}</Text></Pressable>
                <Pressable onPress={() => router.push('/student-portal')} style={s.btnSecondary}><Text style={s.btnTextSec}>View saved pages</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 8. EMPTY / NO RESULTS ── */}
          {activeCode === 'empty' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>Scanned the sky. Nothing yet.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { fontSize: 140, letterSpacing: 12 }]}>EMPTY</Text>
                <View style={s.artCenter}>
                  <Svg width={280} height={240} viewBox="0 0 280 240">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M74 152 L188 62 l30 34 -114 90 Z" />
                      <Path d="M188 62 l14 -14 30 34 -14 14" />
                      <Path d="M96 172 l-22 42 M110 182 l-4 46" />
                      <Path d="M56 226 h68" />
                      <Circle cx={120} cy={124} r={8} />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>Nothing matches that yet.</Text>
              <Text style={s.subText}>No roles match "quant analyst, remote, 2027 grad". Loosening the location usually finds forty or more.</Text>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                {!removedChips['c1'] && (
                  <Pressable onPress={() => setRemovedChips({ ...removedChips, c1: true })} style={s.filterChip}>
                    <Text style={s.filterChipText}>Remove "remote" ✕</Text>
                  </Pressable>
                )}
                {!removedChips['c2'] && (
                  <Pressable onPress={() => setRemovedChips({ ...removedChips, c2: true })} style={s.filterChip}>
                    <Text style={s.filterChipText}>Widen to 2026–2028 ✕</Text>
                  </Pressable>
                )}
                {!removedChips['c3'] && (
                  <Pressable onPress={() => setRemovedChips({ ...removedChips, c3: true })} style={s.filterChip}>
                    <Text style={s.filterChipText}>Any city</Text>
                  </Pressable>
                )}
              </View>
              <View style={s.actRow}>
                <Pressable onPress={() => setRemovedChips({ c1: true, c2: true, c3: true })} style={s.btnPrimary}><Text style={s.btnTextPrimary}>Clear all filters</Text></Pressable>
                <Pressable onPress={() => router.push('/internships')} style={s.btnSecondary}><Text style={s.btnTextSec}>Save this search</Text></Pressable>
              </View>
            </View>
          )}

          {/* ── 9. LEGACY BROWSER ── */}
          {activeCode === 'browser' && (
            <View style={s.screenBox}>
              <Text style={s.quoteText}>This browser is vintage.</Text>
              <View style={s.artHeightBox}>
                <Text style={[s.bigNumber, { fontSize: 130, letterSpacing: 10, color: 'rgba(251,191,92,0.12)' }]}>LEGACY</Text>
                <View style={s.artCenter}>
                  <Svg width={280} height={220} viewBox="0 0 280 220">
                    <G fill="none" stroke="url(#stLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <Rect x={50} y={44} width={180} height={126} rx={12} />
                      <Path d="M50 76 h180" />
                      <Path d="M110 170 v22 M170 170 v22 M96 196 h88" />
                    </G>
                    <G fill="none" stroke="#FBBF5C" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                      <Circle cx={140} cy={122} r={26} />
                      <Path d="M140 108 v16 M140 134 v.01" />
                    </G>
                  </Svg>
                </View>
              </View>
              <Text style={s.headingH1}>This browser is a few years behind.</Text>
              <Text style={s.subText}>Parts of the dashboard will not render correctly. Any of these will work, and your account carries across.</Text>
              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                {['Chrome', 'Edge', 'Safari 16+', 'Firefox'].map((b) => (
                  <View key={b} style={s.filterChip}><Text style={[s.filterChipText, { fontWeight: '700' }]}>{b}</Text></View>
                ))}
              </View>
              <View style={s.actRow}>
                <Pressable onPress={() => router.push('/student-portal')} style={s.btnSecondary}><Text style={s.btnTextSec}>Continue anyway</Text></Pressable>
              </View>
            </View>
          )}

        </View>

        {/* ── Rotating Quote Tagline with Purple Squiggle ─────────────────── */}
        <View style={s.taglineBox}>
          <Text style={s.rotQuoteText}>{QUOTES[quoteIndex]}</Text>
          <Svg width={300} height={12} viewBox="0 0 320 14" style={{ alignSelf: 'center', marginTop: 4 }}>
            <Path d="M3 9 C 64 2 116 12 178 5 C 232 -1 278 9 317 3" fill="none" stroke="#C08BFF" strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </View>

        {/* ── FOOTER (shared) ── */}
        <CommonFooter />
      </ScrollView>
    </View>
  );
}

// ── Styles Matching Master Status Specification ────────────────────────────
const DARK_S: Record<string, any> = {
  bg: '#0B0722', surface: 'rgba(11,7,34,0.6)', surfaceHi: 'rgba(11,7,34,0.86)',
  text: '#F3F1FF', textSec: '#A9A2C8', dim: '#857CAE', line: '#2A1F5E',
  lineHi: '#382A78', lineActive: '#4B3A9E', accent: '#A99BFF', accentGlow: '#C08BFF',
  pillBg: 'rgba(169,155,255,0.18)', tagBg: '#17103A', quoteText: '#E4DEFF',
};
const LIGHT_S: Record<string, any> = {
  bg: '#FFFFFF', surface: '#F5F5F7', surfaceHi: '#F0F0F5',
  text: '#1D1D1F', textSec: '#6E6E73', dim: '#8E8E93', line: '#E5E5EA',
  lineHi: '#D1D1D6', lineActive: '#5B4FE9', accent: '#5B4FE9', accentGlow: '#5B4FE9',
  pillBg: 'rgba(91,79,233,0.10)', tagBg: '#F0F0F5', quoteText: '#3A3A3C',
};
function themedS(dark: boolean) {
  const C = dark ? DARK_S : LIGHT_S;
  return {
  root: { flex: 1, backgroundColor: C.bg },
  bgWrap: { position: 'absolute' as any, inset: 0 },
  radialBg: { position: 'absolute' as any, inset: 0, backgroundColor: C.bg },
  horizonGlow: { position: 'absolute' as any, left: '50%', bottom: -400, width: 1400, height: 600, marginLeft: -700, borderRadius: 700, backgroundColor: 'rgba(75,50,184,0.3)', opacity: 0.8 },
  header: { borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.surfaceHi, paddingHorizontal: 28 },
  headerRow: { maxWidth: 1360, marginHorizontal: 'auto', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  headerBrandText: { fontSize: 19, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  headerLink: { fontSize: 15, fontWeight: '500', color: C.textSec },
  signInLink: { fontSize: 15, fontWeight: '600', color: C.textSec },
  getStartedBtn: { backgroundColor: '#5B4FE9', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 10 },
  getStartedText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  pickerBar: { borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.surfaceHi, paddingVertical: 10, paddingHorizontal: 28 },
  pickerRow: { maxWidth: 1400, marginHorizontal: 'auto', flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%' },
  pickerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: C.dim },
  pickPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'transparent' },
  pickPillOn: { backgroundColor: C.pillBg, borderColor: C.lineActive },
  pickPillCode: { color: C.accent, fontWeight: '700', fontSize: 12 },
  pickPillText: { color: C.textSec, fontSize: 12, fontWeight: '600' },
  stage: { minHeight: 480, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  screenBox: { width: '100%', maxWidth: 840, alignItems: 'center', textAlign: 'center' },
  quoteText: { fontSize: 14.5, letterSpacing: 4, color: C.quoteText, marginBottom: 14, fontWeight: '600' },
  artHeightBox: { width: '100%', height: 320, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bigNumber: { fontSize: 220, fontWeight: '800', letterSpacing: 16, color: 'rgba(139,108,246,0.15)', position: 'absolute' as any },
  artCenter: { alignItems: 'center', justifyContent: 'center' },
  headingH1: { fontSize: 32, fontWeight: '700', letterSpacing: -1.3, color: C.text, marginTop: 10, textAlign: 'center' },
  subText: { fontSize: 15.5, lineHeight: 24, color: C.textSec, maxWidth: 460, textAlign: 'center', marginVertical: 14 },
  actRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 },
  btnPrimary: { backgroundColor: '#6B4FE9', borderRadius: 11, paddingHorizontal: 22, paddingVertical: 14 },
  btnTextPrimary: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
  btnSecondary: { borderWidth: 1, borderColor: C.lineHi, borderRadius: 11, paddingHorizontal: 22, paddingVertical: 14 },
  btnTextSec: { color: C.text, fontSize: 14.5, fontWeight: '600' },
  pillBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 18 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  pillBadgeText: { color: C.dim, fontSize: 12.5 },
  refBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20 },
  refLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: C.dim },
  refCode: { fontSize: 13, fontWeight: '600', color: C.text },
  copyBtn: { fontSize: 11.5, fontWeight: '700', color: C.accent },
  progressBox: { width: '100%', maxWidth: 360, marginVertical: 16 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#FBBF5C', borderRadius: 3 },
  filterChip: { borderWidth: 1, borderColor: C.lineHi, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipText: { color: C.textSec, fontSize: 12.5, fontWeight: '500' },
  taglineBox: { alignItems: 'center', paddingVertical: 40 },
  rotQuoteText: { fontSize: 17, fontWeight: '600', color: C.quoteText, textAlign: 'center' },
  footer: { borderTopWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingVertical: 48, paddingHorizontal: 28 },
  footerMax: { maxWidth: 1360, marginHorizontal: 'auto', width: '100%' },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between' },
  colHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: C.dim, marginBottom: 16 },
  colLink: { fontSize: 14.5, color: '#9AA0B4' },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, borderWidth: 1, borderColor: C.line, borderRadius: 18, backgroundColor: C.tagBg, padding: 24, marginTop: 40 },
  emailMockBox: { borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, minWidth: 200 },
  subBtn: { backgroundColor: '#6B4FE9', borderRadius: 11, paddingHorizontal: 24, paddingVertical: 12 },
  hashLogo: { fontSize: 32, fontWeight: '700', color: '#C08BFF', letterSpacing: -1.2 },
  _text: C.text,
  _muted: C.textSec,
  _dim: C.dim,
};
}
