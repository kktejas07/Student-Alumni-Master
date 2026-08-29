// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const TITLE = "Student Alumni — AI Career Platform for Students";
const DESCRIPTION =
  "Student Alumni is an AI career platform for students, alumni, mentors, and colleges. Find mentors, campus events, internships, and a personalised career roadmap.";
const URL = "https://studentalumni.ai";
const OG_IMAGE = `${URL}/apple-touch-icon.png`;

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Student Alumni",
      url: URL,
      logo: `${URL}/favicon.png`,
      sameAs: [URL],
    },
    {
      "@type": "WebSite",
      name: "Student Alumni",
      url: URL,
      description: DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${URL}/welcome`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
});

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="application-name" content="Student Alumni" />
        <meta name="apple-mobile-web-app-title" content="Student Alumni" />
        <link rel="canonical" href={URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Student Alumni" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
        {/* ========================================== */}
        {/* 1. GOOGLE ANALYTICS (GA4)                   */}
        {/* ========================================== */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-GTPG1F884T"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-GTPG1F884T');
            `,
          }}
        />

        {/* ========================================== */}
        {/* 2. POSTHOG ANALYTICS (AUTOCAPTURE & REPLAY) */}
        {/* ========================================== */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var w=e;for(void 0!==a?w=e[a]=[]:a="posthog",w.people=w.people||[],w.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},w.people.toString=function(){return w.toString(1)+".people (stub)"},p="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group identify_group setGroupProperties setGroupPropertiesOnce unregister_group set_config".split(" "),r=0;r<p.length;r++)g(w,p[r]);e._i.push([i,s,a])},e.__SV=1.0,(o=t.createElement("script")).type="text/javascript",o.async=!0,o.src="https://us-assets.i.posthog.com/static/array.js",(n=t.getElementsByTagName("script")[0]).parentNode.insertBefore(o,n))}(document,window.posthog||[]);
              posthog.init('phc_ubQxwhfxGuzrEu5trKWiMgtADhR2RYKgZxT3SceDdWJG', {
                api_host: 'https://us.i.posthog.com',
                person_profiles: 'identified_only',
                autocapture: true,
                capture_pageview: true
              });
            `,
          }}
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
              ::-webkit-scrollbar { width: 6px; height: 6px; }
              ::-webkit-scrollbar-track { background: transparent; }
              ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
              * { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.15) transparent; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#08080F",
          color: "#F4F4FA",
        }}
      >
        <noscript>
          <h1>Student Alumni</h1>
          <p>{DESCRIPTION}</p>
          <p>
            <a href="https://studentalumni.ai/get-started">Get started</a>
            {" · "}
            <a href="https://studentalumni.ai/about">About</a>
            {" · "}
            <a href="https://studentalumni.ai/contact">Contact</a>
          </p>
        </noscript>
        {children}
      </body>
    </html>
  );
}
