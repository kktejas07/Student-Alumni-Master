import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <Text style={s.effective}>Effective: May 16, 2026</Text>

      <Text style={s.h2}>1. Acceptance of Terms</Text>
      <Text style={s.p}>
        By accessing or using Student Alumni ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
      </Text>

      <Text style={s.h2}>2. Account Registration</Text>
      <Text style={s.p}>
        You must register for an account using accurate and complete information. You are responsible for maintaining the confidentiality of your credentials. You must be at least 16 years old to use the Platform.
      </Text>

      <Text style={s.h2}>3. User Conduct</Text>
      <Text style={s.p}>
        You agree not to: impersonate any person or entity; provide false information; harass, abuse, or harm other users; upload malicious content; attempt to access restricted areas; use the Platform for illegal activities; violate any applicable laws.
      </Text>

      <Text style={s.h2}>4. Intellectual Property</Text>
      <Text style={s.p}>
        The Platform and its original content, features, and functionality are owned by Student Alumni and are protected by copyright, trademark, and other intellectual property laws.
      </Text>

      <Text style={s.h2}>5. User Content</Text>
      <Text style={s.p}>
        By posting content on the Platform, you grant us a non-exclusive, royalty-free license to display and distribute your content within the Platform. You retain ownership of your content.
      </Text>

      <Text style={s.h2}>6. Mentor & Student Relationships</Text>
      <Text style={s.p}>
        The Platform facilitates connections between students, alumni, and mentors. We are not responsible for the quality of mentorship or outcomes of mentor-mentee relationships. Users engage at their own discretion.
      </Text>

      <Text style={s.h2}>7. Payments & Refunds</Text>
      <Text style={s.p}>
        Certain features may require payment. All payments are processed securely through third-party payment processors. Refund policies are outlined in our Refund Policy. We reserve the right to change pricing with notice.
      </Text>

      <Text style={s.h2}>8. Limitation of Liability</Text>
      <Text style={s.p}>
        Student Alumni shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability is limited to the amount paid by you in the past 12 months.
      </Text>

      <Text style={s.h2}>9. Termination</Text>
      <Text style={s.p}>
        We may suspend or terminate your account for violation of these terms, illegal activity, or at our discretion with notice. You may delete your account at any time from your profile settings.
      </Text>

      <Text style={s.h2}>10. Governing Law</Text>
      <Text style={s.p}>
        These Terms are governed by the laws of India. Any disputes shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996.
      </Text>

      <Text style={s.h2}>11. Changes to Terms</Text>
      <Text style={s.p}>
        We reserve the right to modify these terms. Material changes will be communicated via email or platform notification. Continued use constitutes acceptance of modified terms.
      </Text>

      <Text style={s.h2}>12. Contact</Text>
      <Text style={s.p}>
        For questions about these Terms, contact us at legal@studentalumni.ai.
      </Text>
    </LegalShell>
  );
}

const s = StyleSheet.create({
  effective: { color: '#64748b', fontFamily: FONTS.med, fontSize: 13, marginBottom: 24, fontStyle: 'italic' },
  h2: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 24, marginBottom: 8 },
  p: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
