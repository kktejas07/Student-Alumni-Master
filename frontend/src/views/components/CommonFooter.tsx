/**
 * CommonFooter — Standard Global Footer for all StudentAlumni web pages
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeContext';
import Svg, {
  Path,
  Circle,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

const DARK_T = {
  bg: '#08080F',
  bg2: '#08080F',
  panel: '#101019',
  card2: '#14141F',
  line: '#1F1F30',
  lineHi: '#262638',
  text: '#F4F4FA',
  text2: '#9095A8',
  muted2: '#9095A8',
  dim: '#7E7E92',
  surface: 'rgba(0,0,0,0.25)',
  ind: '#5B4FE9',
  indLt: '#A78BFA',
};
const LIGHT_T = {
  bg: '#F4F5FA',
  bg2: '#F4F5FA',
  panel: '#FFFFFF',
  card2: '#F3F4FA',
  line: '#E4E6F0',
  lineHi: '#D9DCEA',
  text: '#141726',
  text2: '#565B70',
  muted2: '#565B70',
  dim: '#6B7080',
  surface: 'rgba(0,0,0,0.06)',
  ind: '#5B4FE9',
  indLt: '#5B4FE9',
};

interface CommonFooterProps {
  onTabChange?: (tab: 'home' | 'echo' | 'verify' | 'contact') => void;
  maxWidth?: number;
}

export default function CommonFooter({ onTabChange, maxWidth = 1360 }: CommonFooterProps) {
  const router = useRouter();
  const { isDark } = useTheme();
  const T = isDark ? DARK_T : LIGHT_T;
  const S = themedStyles(T);
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const containerPadding = isMobile ? 20 : 44;

  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const navigateTabOrRoute = (tab: 'home' | 'echo' | 'verify' | 'contact', route?: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={S.footerSection}>
      <View style={[styles.footerInner, { maxWidth, paddingHorizontal: containerPadding }]}>
        {/* Brand Column */}
        <View style={[styles.footerBrandCol, isMobile && { minWidth: "100%", flexBasis: "100%" }]}>
          <Pressable onPress={() => navigateTabOrRoute('home', '/')} style={styles.brandLogoRow}>
            <Svg width="26" height="30" viewBox="0 0 300 350">
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="#5B4FE9" />
              <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">
                SA
              </SvgText>
            </Svg>
            <Text style={S.brandTitle}>StudentAlumni</Text>
          </Pressable>
          <Text style={S.brandTagline}>Verified student &amp; alumni network across Indian campuses.</Text>

          {/* Social & Community Icons */}
          <View style={styles.socialRow}>
            <Pressable
              onPress={() => {
                if (typeof window !== 'undefined') window.open('https://linkedin.com/company/student-alumni', '_blank');
              }}
              style={S.socialBtn}
              accessibilityLabel="LinkedIn"
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <Path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" fill="#D5D8E4" />
                <Rect x="2" y="9" width="4" height="12" fill="#D5D8E4" />
                <Circle cx="4" cy="4" r="2" fill="#D5D8E4" />
              </Svg>
            </Pressable>

            <Pressable
              onPress={() => {
                if (typeof window !== 'undefined') window.open('https://www.instagram.com/studentalumni.ai/', '_blank');
              }}
              style={S.socialBtn}
              accessibilityLabel="Instagram"
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <Rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#D5D8E4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="12" cy="12" r="4.2" stroke="#D5D8E4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="17.6" cy="6.4" r="1.2" fill="#D5D8E4" />
              </Svg>
            </Pressable>

            <Pressable
              onPress={() => {
                if (typeof window !== 'undefined') window.open('https://chat.whatsapp.com/G2kc2u0gzh68DKSjlOyCxu', '_blank');
              }}
              style={[S.socialBtn, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}
              accessibilityLabel="WhatsApp Community"
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#34D399" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {/* Resources Column */}
        <View style={[styles.footerLinksCol, isMobile && { flexBasis: '45%', maxWidth: '45%' as any }]}>
          <Text style={S.footerColHeader}>RESOURCES</Text>
          <Pressable onPress={() => navigateTabOrRoute('echo', '/echo')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>ECHO Events</Text>
          </Pressable>
          <Pressable onPress={() => navigateTabOrRoute('verify', '/verify')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>Verify Certificate</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/blog')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>Blog</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/help-center')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>Help center</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/community')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>Community</Text>
          </Pressable>
        </View>

        {/* Legal Column */}
        <View style={[styles.footerLinksCol, isMobile && { flexBasis: '45%', maxWidth: '45%' as any }]}>
          <Text style={S.footerColHeader}>LEGAL</Text>
          <Pressable onPress={() => router.push('/policy/privacy')} style={styles.linkItem}>
            <Text style={S.footerLinkText}>Privacy &amp; Terms</Text>
          </Pressable>
          <View style={[styles.linkItem, { opacity: 0.5, cursor: 'default' } as any]}>
            <Text style={[S.footerLinkText, { color: T.dim }]}>Security &amp; Cookies</Text>
          </View>
        </View>

        {/* Our Entities Column */}
        <View style={[styles.footerLinksCol, isMobile && { flexBasis: '45%', maxWidth: '45%' as any }]}>
          <Text style={S.footerColHeader}>OUR ENTITIES</Text>
          <Pressable onPress={() => { if (typeof window !== 'undefined') window.open('https://codespectra.ai', '_blank'); }} style={styles.linkItem}>
            <Text style={S.footerLinkText}>CodeSpectra</Text>
          </Pressable>
          <Pressable onPress={() => { if (typeof window !== 'undefined') window.open('https://visionaryx.ai', '_blank'); }} style={styles.linkItem}>
            <Text style={S.footerLinkText}>VisionaryX</Text>
          </Pressable>
          <Pressable onPress={() => { if (typeof window !== 'undefined') window.open('https://wehive.co.in', '_blank'); }} style={styles.linkItem}>
            <Text style={S.footerLinkText}>WeHive</Text>
          </Pressable>
        </View>

        {/* Compliance Column */}
        <View style={[styles.footerLinksCol, isMobile && { flexBasis: '100%', maxWidth: '100%' as any }]}>
          <Text style={S.footerColHeader}>COMPLIANCE</Text>
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={S.footerComplianceText}>DPDP Act 2023</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim, marginTop: 3, paddingLeft: 22 }}>India · data principal rights</Text>
          </View>
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={S.footerComplianceText}>GDPR</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim, marginTop: 3, paddingLeft: 22 }}>EU · lawful basis and DPAs</Text>
          </View>
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <Path d="M5 12.5l4 4 10-10.5" stroke="#34D399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={S.footerComplianceText}>SOC 2 Type II</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim, marginTop: 3, paddingLeft: 22 }}>Audited controls, annual</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.5, cursor: 'default' } as any}>
            <Svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <Path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z" stroke="#8B84FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
            <Text style={{ fontSize: 14, color: T.indLt, fontWeight: '600' }}>Responsible disclosure</Text>
          </View>
        </View>
      </View>

      {/* Newsletter Box */}
      <View style={[S.newsletterRow, { flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', maxWidth, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: isMobile ? 16 : 28, paddingVertical: isMobile ? 20 : 28 }]}>
        <View style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Text style={[S.newsletterTitle, isMobile && { fontSize: 17 }]}>One email a month. Nothing else.</Text>
          <Text style={[S.newsletterSub, isMobile && { fontSize: 13 }]}>New openings, mentor drops and campus events — no noise.</Text>
        </View>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
          <TextInput
            placeholder="you@college.edu"
            placeholderTextColor={T.dim}
            style={[S.newsletterInput, isMobile && { minWidth: 0, flex: undefined, width: '100%' as any }]}
            value={emailInput}
            onChangeText={setEmailInput}
          />
          <Pressable
            onPress={() => {
              if (emailInput.trim()) {
                setSubscribed(true);
                setTimeout(() => setSubscribed(false), 2400);
              }
            }}
            style={[S.subscribeBtn, isMobile && { width: '100%' as any, alignItems: 'center' as any} ]}
          >
            <Text style={{ fontSize: 14.5, fontWeight: '700' as const, color: '#FFFFFF' }}>{subscribed ? 'Subscribed' : 'Subscribe'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Legal & Heart Line */}
      <View style={[styles.footerBottomBar, { maxWidth, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: containerPadding }]}>
        <View style={isMobile ? { width: '100%' as any } : undefined}>
          <Text style={[S.footerBrandGrad, isMobile && { fontSize: 26, lineHeight: 30 }]}>#studentalumni</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' as any }}>
            <Text style={[S.footerCopyright, isMobile && { fontSize: 13 }]}>Built with love for students</Text>
            <Svg width="12" height="12" viewBox="0 0 24 24">
              <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#8B84FF" />
            </Svg>
            <Text style={[S.footerCopyright, isMobile && { fontSize: 13 }]}>across all campuses</Text>
          </View>
        </View>
        <Text style={[S.footerCopyrightSmall, isMobile && { fontSize: 12, marginTop: 8 }]}>All rights reserved @ Student Alumni 2026</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerInner: {
    width: '100%',
    marginHorizontal: 'auto' as any,
    flexDirection: 'row' as any,
    justifyContent: 'space-between' as any,
    flexWrap: 'wrap' as any,
    gap: 36,
    marginBottom: 60,
  },
  footerBrandCol: {
    flex: 1.5,
    minWidth: 200,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLinksCol: {
    flex: 1,
    minWidth: 120,
    gap: 14,
  },
  linkItem: {
    paddingVertical: 2,
  },
  newsletterControl: {
    flexDirection: 'row' as any,
    flex: 1,
    minWidth: 200,
    flexWrap: 'wrap' as any,
    gap: 10,
  },
  footerBottomBar: {
    width: '100%',
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 32,
  },
});

function themedStyles(T: typeof DARK_T) {
  return {
    footerSection: {
      width: '100%' as const,
      borderTopWidth: 1,
      borderTopColor: T.line,
      backgroundColor: T.bg2,
      paddingTop: 70,
      paddingBottom: 80,
      marginTop: 100,
      alignItems: 'center' as const,
    },
    brandTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: T.text,
      letterSpacing: -0.4,
    },
    brandTagline: {
      fontSize: 14.5,
      lineHeight: 22,
      color: T.muted2,
      maxWidth: 320,
      marginBottom: 20,
    },
    socialBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: T.card2,
      borderWidth: 1,
      borderColor: T.line,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    footerColHeader: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: T.dim,
      letterSpacing: 1.6,
      marginBottom: 16,
    },
    footerLinkText: {
      fontSize: 15,
      color: T.text2,
    },
    footerComplianceText: {
      fontSize: 14.5,
      color: T.text2,
    },
    newsletterRow: {
      width: '100%' as const,
      borderWidth: 1,
      borderColor: T.lineHi,
      borderRadius: 18,
      backgroundColor: T.card2,
      padding: 24,
      flexDirection: 'column' as any,
      justifyContent: 'space-between' as any,
      alignItems: 'stretch' as any,
      flexWrap: 'wrap' as any,
      gap: 18,
      marginBottom: 40,
    },
    newsletterTitle: {
      fontSize: 19,
      fontWeight: '700' as const,
      color: T.text,
      letterSpacing: -0.4,
    },
    newsletterSub: {
      fontSize: 14.5,
      color: T.muted2,
      marginTop: 5,
    },
    newsletterInput: {
      flex: 1,
      minWidth: 0,
      borderWidth: 1,
      borderColor: T.line,
      borderRadius: 11,
      backgroundColor: T.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14.5,
      color: T.dim,
    },
    subscribeBtn: {
      backgroundColor: T.ind,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 11,
      alignItems: 'center' as const,
    },
    footerBrandGrad: {
      fontSize: 34,
      fontWeight: '700' as const,
      letterSpacing: -1.4,
      lineHeight: 38,
      color: '#C08BFF',
    },
    footerCopyright: {
      fontSize: 15,
      color: T.muted2,
    },
    footerCopyrightSmall: {
      fontSize: 14,
      color: T.muted2,
    },
  };
}
