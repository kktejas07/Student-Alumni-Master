/**
 * /legal/cookies — Cookies Policy.
 */
import React from 'react';
import { LegalPage } from '@/src/views/web/legal/LegalPage';

export default function CookiesRoute() {
  return <LegalPage doc={{
    slug: 'cookies',
    title: 'Cookies Policy',
    subtitle: 'How and why StudentAlumni uses cookies and similar storage technologies.',
    effective: '15 June 2026',
    icon: 'cookie',
    sections: [
      { heading: '1. What are cookies?',
        body: 'Cookies are small text files stored on your device by your browser when you visit a website. Similar technologies (local storage, IndexedDB, web beacons) serve comparable purposes. Together we refer to all of these as \u201ccookies\u201d in this policy.' },
      { heading: '2. Strictly necessary',
        body: 'These cookies keep you signed in, remember your portal selection, store your dark/light theme preference, and enable critical security features (CSRF tokens, session integrity). The service cannot function without them \u2014 they cannot be switched off.' },
      { heading: '3. Functional',
        body: 'These cookies remember your settings (e.g. dismissed banners, language, last viewed dashboard) so you don\u2019t have to reconfigure on every visit. They do not track you across other websites.' },
      { heading: '4. Analytics',
        body: 'We use privacy-respecting analytics (PostHog) to understand product usage, identify bugs, and prioritise features. IPs are anonymised and we do not sell analytics data. You can disable analytics from your account settings.' },
      { heading: '5. Marketing',
        body: 'We do not currently use advertising cookies. If we ever do, we will surface a fresh consent prompt and update this policy. [REPLACE WITH LEGAL COPY when launching marketing campaigns.]' },
      { heading: '6. Third-party storage',
        body: 'When you visit pages embedding third-party content (YouTube player for mentor session replays, payment provider iframes, AI provider auth flows), those parties may set their own cookies. Their use is governed by their respective policies.' },
      { heading: '7. Managing cookies',
        body: 'You can clear or block cookies via your browser settings. Blocking strictly-necessary cookies may break sign-in. For functional and analytics cookies, you can opt-out from Settings \u2192 Privacy at any time.' },
      { heading: '8. Consent withdrawal',
        body: 'You can withdraw consent for analytics or marketing cookies at any time from Settings \u2192 Privacy. Withdrawal does not affect the lawfulness of processing before withdrawal.' },
    ],
  }} />;
}
