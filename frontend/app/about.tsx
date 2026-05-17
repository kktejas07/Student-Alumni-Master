import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function AboutPage() {
  return (
    <LegalShell title="About Student Alumni">
      <Text style={s.h2}>Our Mission</Text>
      <Text style={s.p}>
        Student Alumni bridges the gap between academic life and professional success. We empower students, alumni, mentors, and institutions to connect, collaborate, and grow together.
      </Text>

      <Text style={s.h2}>Who We Are</Text>
      <Text style={s.p}>
        We are a team of educators, technologists, and industry professionals passionate about transforming how students transition from campus to career. Our platform serves thousands of users across 74+ partner institutions.
      </Text>

      <Text style={s.h2}>What We Offer</Text>
      <Text style={s.p}>
        • AI-powered career guidance and mentorship matching{'\n'}
        • Professional networking with alumni and industry experts{'\n'}
        • Course and skill development recommendations{'\n'}
        • Internship and job opportunity marketplace{'\n'}
        • Event management and workshop hosting{'\n'}
        • College administration and placement tracking{'\n'}
        • Digital ID cards and credential verification
      </Text>

      <Text style={s.h2}>Our Values</Text>
      <Text style={s.p}>
        <Text style={s.bold}>Community:</Text> We believe in the power of connections.{'\n'}
        <Text style={s.bold}>Innovation:</Text> We leverage AI to personalise career growth.{'\n'}
        <Text style={s.bold}>Integrity:</Text> We prioritise data privacy and security.{'\n'}
        <Text style={s.bold}>Impact:</Text> Every feature is designed to create real outcomes.
      </Text>

      <Text style={s.h2}>Contact</Text>
      <Text style={s.p}>
        Email: hello@studentalumni.ai{'\n'}
        Platform: studentalumni.ai
      </Text>
    </LegalShell>
  );
}

const s = StyleSheet.create({
  h2: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 24, marginBottom: 8 },
  p: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  bold: { fontFamily: FONTS.xbold, color: '#cbd5e1' },
});
