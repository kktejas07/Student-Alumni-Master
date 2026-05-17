import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy">
      <Text style={s.effective}>Effective: May 16, 2026</Text>

      <Text style={s.h2}>1. What Are Cookies</Text>
      <Text style={s.p}>
        Cookies are small text files stored on your device by your web browser. They help us remember your preferences, authenticate your session, and improve your experience on our platform.
      </Text>

      <Text style={s.h2}>2. Types of Cookies We Use</Text>
      <Text style={s.h3}>Essential Cookies</Text>
      <Text style={s.p}>
        Required for the platform to function. They enable secure login, session management, and access to protected areas. These cannot be disabled.
      </Text>
      <Text style={s.h3}>Analytics Cookies</Text>
      <Text style={s.p}>
        Help us understand how users interact with the platform, which features are popular, and where improvements are needed. We use PostHog for analytics.
      </Text>
      <Text style={s.h3}>Preference Cookies</Text>
      <Text style={s.p}>
        Remember your settings, theme preferences, and language choices for a personalised experience.
      </Text>

      <Text style={s.h2}>3. Third-Party Cookies</Text>
      <Text style={s.p}>
        We may use third-party services (Google Analytics, PostHog, Sentry) that set their own cookies. These services have their own cookie policies.
      </Text>

      <Text style={s.h2}>4. Managing Cookies</Text>
      <Text style={s.p}>
        Most browsers allow you to control cookies through settings. Blocking essential cookies may impact platform functionality. You can delete existing cookies through your browser preferences.
      </Text>

      <Text style={s.h2}>5. Data Collected via Cookies</Text>
      <Text style={s.p}>
        Cookies collect information such as page views, session duration, click patterns, and referral URLs. This data is anonymised where possible.
      </Text>

      <Text style={s.h2}>6. Updates</Text>
      <Text style={s.p}>
        We may update this Cookie Policy. Changes will be posted here with an updated effective date.
      </Text>

      <Text style={s.h2}>7. Contact</Text>
      <Text style={s.p}>
        For questions about our use of cookies, contact privacy@studentalumni.ai.
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
