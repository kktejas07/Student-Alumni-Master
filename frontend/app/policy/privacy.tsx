import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <Text style={s.effective}>Effective: May 16, 2026</Text>

      <Text style={s.h2}>1. Introduction</Text>
      <Text style={s.p}>
        Student Alumni ("we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform at studentalumni.ai.
      </Text>

      <Text style={s.h2}>2. Information We Collect</Text>
      <Text style={s.h3}>Personal Data</Text>
      <Text style={s.p}>
        We may collect personally identifiable information such as your name, email address, phone number, educational background, professional history, and profile photo when you register or update your profile.
      </Text>
      <Text style={s.h3}>Usage Data</Text>
      <Text style={s.p}>
        We automatically collect information about how you interact with our platform, including pages visited, features used, time spent, and click patterns.
      </Text>
      <Text style={s.h3}>Device Data</Text>
      <Text style={s.p}>
        We collect device information such as browser type, operating system, IP address, and device identifiers for analytics and security purposes.
      </Text>

      <Text style={s.h2}>3. How We Use Your Information</Text>
      <Text style={s.p}>
        We use the collected data to: provide and maintain our platform; personalise your experience; connect you with mentors, alumni, and opportunities; send notifications and updates; improve our services; detect and prevent fraud; comply with legal obligations.
      </Text>

      <Text style={s.h2}>4. Data Sharing & Disclosure</Text>
      <Text style={s.p}>
        We do not sell your personal information. We may share data with: other users within the platform (as part of your profile); service providers who assist in platform operations; law enforcement when required by law; third parties with your explicit consent.
      </Text>

      <Text style={s.h2}>5. Data Security</Text>
      <Text style={s.p}>
        We implement industry-standard security measures including encryption at rest and in transit, regular security audits, access controls, and secure data storage. However, no method of transmission over the Internet is 100% secure.
      </Text>

      <Text style={s.h2}>6. Your Rights</Text>
      <Text style={s.p}>
        You have the right to: access your personal data; correct inaccurate data; delete your account and associated data; restrict processing; data portability; withdraw consent at any time. To exercise these rights, contact us at support@studentalumni.ai.
      </Text>

      <Text style={s.h2}>7. Cookies</Text>
      <Text style={s.p}>
        We use essential cookies for authentication and security. Analytics cookies help us improve the platform. You can control cookie preferences through your browser settings. See our Cookie Policy for details.
      </Text>

      <Text style={s.h2}>8. Third-Party Services</Text>
      <Text style={s.p}>
        Our platform integrates with third-party services including Google, LinkedIn, and payment processors. These services have their own privacy policies governing data handling.
      </Text>

      <Text style={s.h2}>9. Children's Privacy</Text>
      <Text style={s.p}>
        Our platform is not intended for users under 16 years of age. We do not knowingly collect data from minors. If you believe a minor has provided us with data, contact us immediately.
      </Text>

      <Text style={s.h2}>10. Changes to This Policy</Text>
      <Text style={s.p}>
        We may update this Privacy Policy periodically. Material changes will be notified via email or platform notification. Continued use after changes constitutes acceptance.
      </Text>

      <Text style={s.h2}>11. Contact</Text>
      <Text style={s.p}>
        For privacy-related inquiries, contact us at: privacy@studentalumni.ai or write to our registered address.
      </Text>
    </LegalShell>
  );
}

const s = StyleSheet.create({
  effective: { color: '#64748b', fontFamily: FONTS.med, fontSize: 13, marginBottom: 24, fontStyle: 'italic' },
  h2: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 24, marginBottom: 8 },
  h3: { color: '#cbd5e1', fontFamily: FONTS.bold, fontSize: 15, marginTop: 16, marginBottom: 6 },
  p: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
