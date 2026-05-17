import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const LINKS = [
  { label: 'Privacy Policy', route: '/policy/privacy' },
  { label: 'Terms of Service', route: '/policy/terms' },
  { label: 'Cookie Policy', route: '/policy/cookies' },
  { label: 'FAQ', route: '/faq' },
  { label: 'About', route: '/about' },
  { label: 'Contact', route: '/contact' },
];

export default function AppFooter() {
  return (
    <View style={s.wrapper}>
      <View style={s.divider} />
      <View style={s.container}>
        <View style={s.links}>
          {LINKS.map((link, i) => (
            <React.Fragment key={link.route}>
              <Pressable onPress={() => router.push(link.route as any)} style={s.link}>
                <Text style={s.linkText}>{link.label}</Text>
              </Pressable>
              {i < LINKS.length - 1 && <Text style={s.sep}>•</Text>}
            </React.Fragment>
          ))}
        </View>
        <Text style={s.copy}>
          © {new Date().getFullYear()} Student Alumni. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { marginTop: 40 },
  divider: { height: 1, backgroundColor: '#1e293b', marginBottom: 24 },
  container: { paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center' as any },
  links: { flexDirection: 'row' as any, flexWrap: 'wrap' as any, justifyContent: 'center' as any, gap: 8, marginBottom: 16 },
  link: { ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  linkText: { color: '#64748b', fontFamily: FONTS.med, fontSize: 13 },
  sep: { color: '#334155', fontSize: 12 },
  copy: { color: '#475569', fontFamily: FONTS.med, fontSize: 12 },
});
