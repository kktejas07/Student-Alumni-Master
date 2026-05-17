/**
 * /legal/privacy — Privacy Policy.
 *
 * Globally applicable boilerplate. Counsel must review the marked sections
 * before going live. Markers: [REPLACE WITH LEGAL COPY]
 */
import React from 'react';
import { LegalPage } from '@/src/views/web/legal/LegalPage';

export default function PrivacyRoute() {
  return <LegalPage doc={{
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, store and share your personal data when you use StudentAlumni.',
    effective: '15 June 2026',
    icon: 'shield',
    sections: [
      { heading: '1. Who we are',
        body: 'StudentAlumni (\u201cwe\u201d, \u201cus\u201d, \u201cour\u201d) operates the platform available at studentalumni.ai and its associated mobile applications. We act as the data controller for the personal data we collect about you. [REPLACE WITH LEGAL COPY \u2014 add registered company name, address, DPO contact.]' },
      { heading: '2. What we collect',
        body: 'Account data (name, email, role, college, year, profile photo); authentication tokens; usage logs and device metadata; content you upload (resumes, project descriptions, mentor session notes); communications you send through the platform; payment and billing information when applicable; and any third-party AI credentials you choose to provide (encrypted at rest, never logged).' },
      { heading: '3. Why we collect it',
        body: 'To provide and improve the service, to authenticate you and prevent fraud, to deliver mentor sessions and career-related features, to send transactional and (with consent) marketing messages, to comply with legal obligations, and to operate Agent K when you supply your own AI key. We do not sell your personal data.' },
      { heading: '4. Legal bases',
        body: 'We process your data on the bases of contract performance (to deliver the service you signed up for), legitimate interest (security, abuse prevention, product analytics), consent (marketing communications, optional cookies, AI key linkage), and legal obligation (tax, regulatory, court orders). [REPLACE WITH LEGAL COPY \u2014 add per-jurisdiction details.]' },
      { heading: '5. Sharing',
        body: 'We share data with service providers strictly necessary to operate the platform (hosting, email, payments, analytics) under written data-processing agreements. We do not share your data with advertisers. We may disclose data when required by law or to protect the rights and safety of users.' },
      { heading: '6. International transfers',
        body: 'Data may be processed outside your country of residence by our infrastructure providers. Where required (e.g. GDPR), we rely on standard contractual clauses and other approved transfer mechanisms. [REPLACE WITH LEGAL COPY \u2014 list specific providers and regions.]' },
      { heading: '7. Retention',
        body: 'Account data is retained for as long as your account is active, plus a reasonable period (typically 24 months) for legal and accounting requirements. You can request deletion at any time \u2014 see Section 9.' },
      { heading: '8. Security',
        body: 'We apply industry-standard safeguards including TLS in transit, encryption at rest, access controls, and routine audits. No system is perfectly secure; we encourage strong, unique passwords and 2FA.' },
      { heading: '9. Your rights',
        body: 'Depending on your jurisdiction you may have the right to access, correct, delete, port, or object to processing of your personal data, and to withdraw consent. To exercise these rights, contact legal@studentalumni.ai. We will respond within statutory timeframes.' },
      { heading: '10. Children',
        body: 'The platform is intended for users aged 16 and above. We do not knowingly collect personal data from children under 16. If you believe a child has signed up, contact us and we will delete the data.' },
      { heading: '11. Changes',
        body: 'We will surface material changes to this policy inside the app on your next sign-in and require fresh consent for material changes. The Effective date at the top of this page tracks the latest revision.' },
    ],
  }} />;
}
