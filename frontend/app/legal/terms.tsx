/**
 * /legal/terms — Terms of Service.
 */
import React from 'react';
import { LegalPage } from '@/src/views/web/legal/LegalPage';

export default function TermsRoute() {
  return <LegalPage doc={{
    slug: 'terms',
    title: 'Terms of Service',
    subtitle: 'The rules of the road for using StudentAlumni. By creating an account you agree to these terms.',
    effective: '15 June 2026',
    icon: 'file',
    sections: [
      { heading: '1. Acceptance',
        body: 'By accessing or using the StudentAlumni platform you agree to be bound by these Terms. If you do not agree, do not use the service. We may update these Terms from time to time; continued use after an update constitutes acceptance.' },
      { heading: '2. Eligibility',
        body: 'You must be at least 16 years old. If you are using the platform on behalf of an organisation (e.g. a college or company), you represent that you have authority to bind that organisation.' },
      { heading: '3. Your account',
        body: 'You are responsible for the accuracy of the information on your profile and for safeguarding your password. Notify us immediately of any unauthorised use. We may suspend or terminate accounts that violate these Terms or applicable law.' },
      { heading: '4. Your content',
        body: 'You retain ownership of the content you upload (resumes, photos, project work). By uploading, you grant us a non-exclusive, worldwide, royalty-free licence to host, display and process that content as needed to operate the service.' },
      { heading: '5. Acceptable use',
        body: 'Do not use the platform to: post unlawful, hateful, harassing or sexually explicit content; impersonate others; scrape or reverse-engineer the service; transmit malware; interfere with security or rate-limiting; or use Agent K to generate content that violates our or our AI providers\u2019 policies.' },
      { heading: '6. AI features (\u201cAgent K\u201d)',
        body: 'Agent K is a Bring-Your-Own-AI feature. You provide your own OpenAI, Anthropic or Gemini API key, and the resulting usage and billing is governed by your agreement with that provider. We do not warrant the accuracy of AI-generated content; treat it as a starting point and verify before relying on it for important decisions.' },
      { heading: '7. Payments',
        body: 'Some features (e.g. mentor bookings, premium events) require payment. Prices are shown before checkout. Refunds are handled per our refund policy, which is available in your wallet settings.' },
      { heading: '8. Third-party services',
        body: 'The platform integrates with third-party services (payments, email, AI providers, calendar). Your use of those services is governed by their respective terms. We are not responsible for third-party outages.' },
      { heading: '9. Disclaimers',
        body: 'The service is provided \u201cas is\u201d without warranties of any kind. We do not guarantee uninterrupted availability, that the service will meet your specific requirements, or that AI output will be accurate, complete or fit for a particular purpose. [REPLACE WITH LEGAL COPY \u2014 add jurisdiction-specific disclaimers.]' },
      { heading: '10. Limitation of liability',
        body: 'To the maximum extent permitted by law, our liability for any claim arising from your use of the service is limited to the amount you paid us in the 12 months preceding the claim. We are not liable for indirect or consequential damages. [REPLACE WITH LEGAL COPY.]' },
      { heading: '11. Termination',
        body: 'You may close your account at any time from Settings. We may suspend or terminate your account for breach of these Terms, fraud, or extended inactivity. On termination, sections related to ownership, disclaimers, limitations and governing law survive.' },
      { heading: '12. Governing law',
        body: '[REPLACE WITH LEGAL COPY \u2014 specify jurisdiction and venue.] Disputes will be resolved in the courts of the agreed jurisdiction, except where mandatory consumer-protection law provides otherwise.' },
      { heading: '13. Contact',
        body: 'For any questions about these Terms, contact us at legal@studentalumni.ai.' },
    ],
  }} />;
}
