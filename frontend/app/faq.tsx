import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const FAKE_DATA = [
  {
    q: 'What is Student Alumni?',
    a: 'Student Alumni is a platform that connects students with alumni, mentors, colleges, and employers. It provides tools for career development, networking, events, mentorship, and professional growth.',
  },
  {
    q: 'Who can join Student Alumni?',
    a: 'Students, alumni, mentors, and college administrators can join. Students must be enrolled in a partner institution. Alumni must have graduated from a partner institution.',
  },
  {
    q: 'Is the platform free?',
    a: 'Basic features are free for all users. Premium features such as AI career coaching, advanced analytics, and priority mentorship may require a subscription or one-time payment.',
  },
  {
    q: 'How do I reset my password?',
    a: 'Go to the login page and click "Forgot Password". Enter your registered email and we will send you a password reset link. The link expires in 1 hour.',
  },
  {
    q: 'How does mentorship work?',
    a: 'Students can browse mentors by industry, expertise, or institution. They can request sessions based on mentor availability. Sessions can be online or in-person. Mentors set their own schedules.',
  },
  {
    q: 'How do I earn SA Credits?',
    a: 'SA Credits are earned through platform activities: completing your profile, attending events, participating in mentorship sessions, referring friends, and engaging with content.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Go to Profile Settings → Account → Delete Account. This will permanently remove your data from our platform. Some data may be retained for legal compliance.',
  },
  {
    q: 'How is my data protected?',
    a: 'We use encryption, access controls, and regular security audits to protect your data. We never sell your personal information. See our Privacy Policy for details.',
  },
  {
    q: 'How do I become a mentor?',
    a: 'Register as a mentor during sign-up or change your role in settings. Complete your mentor profile with expertise, experience, and availability. Admin approval may be required.',
  },
  {
    q: 'How do colleges use the platform?',
    a: 'Colleges can manage student rosters, track placements, publish events and announcements, and view analytics about student engagement and outcomes.',
  },
];

export default function FAQPage() {
  return (
    <LegalShell title="Frequently Asked Questions">
      {FAKE_DATA.map((item, i) => (
        <View key={i} style={s.item}>
          <Text style={s.q}>{item.q}</Text>
          <Text style={s.a}>{item.a}</Text>
        </View>
      ))}
    </LegalShell>
  );
}

const s = StyleSheet.create({
  item: { marginBottom: 20, padding: 16, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  q: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15, marginBottom: 6 },
  a: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 21 },
});
