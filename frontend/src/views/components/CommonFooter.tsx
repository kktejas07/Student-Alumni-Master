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
import Svg, {
  Path,
  Circle,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

const T = {
  bg2: '#05060D',
  surface: '#0A0C18',
  card2: '#0E1020',
  line: '#1B1E33',
  lineHi: '#2A2A55',
  text: '#F4F5FB',
  text2: '#D5D8E4',
  muted2: '#B6BACB',
  dim: '#5C6273',
  ind: '#5B4FE9',
  indLt: '#8B84FF',
};

interface CommonFooterProps {
  onTabChange?: (tab: 'home' | 'events' | 'verify' | 'contact') => void;
  maxWidth?: number;
}

export default function CommonFooter({ onTabChange, maxWidth = 1360 }: CommonFooterProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const containerPadding = isMobile ? 20 : 44;

  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const navigateTabOrRoute = (tab: 'home' | 'events' | 'verify' | 'contact', route?: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.footerSection}>
      <View style={[styles.footerInner, { maxWidth, paddingHorizontal: containerPadding }]}>
        {/* Brand Column */}
        <View style={styles.footerBrandCol}>
          <Pressable
            onPress={() => navigateTabOrRoute('home', '/')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}
          >
            <Svg width="24" height="28" viewBox="0 0 300 350">
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
              <SvgText x="150" y="214" textAnchor="middle" fill="#FFFFFF" fontSize="118" fontWeight="800">
                SA
              </SvgText>
            </Svg>
            <Text style={styles.footerBrandTitle}>StudentAlumni</Text>
          </Pressable>
          <Text style={styles.footerBrandSub}>
            The intelligent career companion built for the{' '}
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>next generation</Text> of students.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* LinkedIn */}
            <Pressable style={styles.socialBox}>
              <Svg width="18" height="18" viewBox="0 0 24 24">
                <Rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                <Path d="M7.6 10.4v6.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                <Circle cx="7.6" cy="7.4" r="0.9" fill="#B6BACB" />
                <Path d="M11.6 16.6v-3.4a2.6 2.6 0 015.2 0v3.4M11.6 16.6v-6.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
              </Svg>
            </Pressable>
            {/* Instagram */}
            <Pressable style={styles.socialBox}>
              <Svg width="18" height="18" viewBox="0 0 24 24">
                <Rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                <Circle cx="12" cy="12" r="4.1" stroke="#B6BACB" strokeWidth="1.9" fill="none" />
                <Circle cx="16.9" cy="7.1" r="1.05" fill="#B6BACB" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {/* Resources Column */}
        <View style={styles.footerLinksCol}>
          <Text style={styles.footerColHeader}>RESOURCES</Text>
          <Pressable onPress={() => navigateTabOrRoute('verify', '/verify')} style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Verify Certificate</Text>
          </Pressable>
          <Pressable onPress={() => navigateTabOrRoute('events', '/events')} style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Blog</Text>
          </Pressable>
          <Pressable onPress={() => navigateTabOrRoute('contact', '/help-center')} style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Help center</Text>
          </Pressable>
          <Pressable onPress={() => navigateTabOrRoute('home', '/')} style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Community</Text>
          </Pressable>
        </View>

        {/* Legal Column */}
        <View style={styles.footerLinksCol}>
          <Text style={styles.footerColHeader}>LEGAL</Text>
          <Pressable style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Privacy &amp; Terms</Text>
          </Pressable>
          <Pressable style={styles.linkItem}>
            <Text style={styles.footerLinkText}>Security &amp; Cookies</Text>
          </Pressable>
        </View>

        {/* Compliance Column */}
        <View style={styles.footerLinksCol}>
          <Text style={styles.footerColHeader}>COMPLIANCE</Text>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24">
                <Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" />
                <Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" />
              </Svg>
              <Text style={styles.footerComplianceText}>DPDP Act 2023</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim }}>India · data principal rights</Text>
          </View>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24">
                <Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" />
                <Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" />
              </Svg>
              <Text style={styles.footerComplianceText}>GDPR</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim }}>EU · lawful basis and DPAs</Text>
          </View>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Svg width="14" height="14" viewBox="0 0 24 24">
                <Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#34D399" strokeWidth="2" fill="none" />
                <Path d="M9 12l2 2 4-4" stroke="#34D399" strokeWidth="2" fill="none" />
              </Svg>
              <Text style={styles.footerComplianceText}>SOC 2 Type II</Text>
            </View>
            <Text style={{ fontSize: 12, color: T.dim }}>Audited controls, annual</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" stroke="#8B84FF" strokeWidth="2" fill="none" />
            </Svg>
            <Text style={{ fontSize: 13.5, color: T.indLt, fontWeight: '600' }}>Responsible disclosure</Text>
          </View>
        </View>
      </View>

      {/* Newsletter Box */}
      <View style={[styles.newsletterRow, { maxWidth, marginHorizontal: 'auto' as any, width: '100%' }]}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.newsletterTitle}>One email a month. Nothing else.</Text>
          <Text style={styles.newsletterSub}>New openings, mentor drops and campus events — no noise.</Text>
        </View>
        <View style={styles.newsletterControl}>
          <TextInput
            placeholder="you@college.edu"
            placeholderTextColor={T.dim}
            style={styles.newsletterInput}
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
            style={styles.subscribeBtn}
          >
            <Text style={styles.subscribeBtnText}>{subscribed ? 'Subscribed ✓' : 'Subscribe'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Legal & Heart Line */}
      <View style={[styles.footerBottomBar, { maxWidth, marginHorizontal: 'auto' as any, width: '100%', paddingHorizontal: containerPadding }]}>
        <View>
          <Text style={styles.footerBrandGrad}>#studentalumni</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Text style={styles.footerCopyright}>Built with love for students</Text>
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#8B84FF" />
            </Svg>
            <Text style={styles.footerCopyright}>across all campus's</Text>
          </View>
        </View>
        <Text style={styles.footerCopyrightSmall}>All rights reserved @ Student Alumni 2026</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: T.line,
    backgroundColor: T.bg2,
    paddingTop: 70,
    paddingBottom: 80,
    marginTop: 100,
    alignItems: 'center',
  },
  footerInner: {
    width: '100%',
    marginHorizontal: 'auto' as any,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 36,
    marginBottom: 60,
  },
  footerBrandCol: {
    flex: 1.5,
    minWidth: 260,
  },
  footerBrandTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: T.text,
  },
  footerBrandSub: {
    fontSize: 15,
    lineHeight: 24,
    color: T.muted2,
    maxWidth: 340,
    marginBottom: 24,
  },
  socialBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: T.card2,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLinksCol: {
    flex: 1,
    minWidth: 160,
    gap: 14,
  },
  footerColHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: T.dim,
    letterSpacing: 1.6,
    marginBottom: 16,
  },
  linkItem: {
    paddingVertical: 2,
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
    width: '100%',
    borderWidth: 1,
    borderColor: T.lineHi,
    borderRadius: 18,
    backgroundColor: T.card2,
    padding: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 22,
    marginBottom: 56,
  },
  newsletterTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.4,
  },
  newsletterSub: {
    fontSize: 14.5,
    color: T.muted2,
    marginTop: 5,
  },
  newsletterControl: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 340,
    flexWrap: 'wrap',
    gap: 10,
  },
  newsletterInput: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 11,
    backgroundColor: T.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14.5,
    color: T.text,
  },
  subscribeBtn: {
    backgroundColor: T.ind,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 11,
  },
  subscribeBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
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
  footerBrandGrad: {
    fontSize: 34,
    fontWeight: '700',
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
});
