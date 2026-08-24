import React from 'react';
import { View, ScrollView } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { Cookie, ShieldCheck } from 'lucide-react-native';

export default function CookiePolicyPage() {
  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #05060F !important; font-family: 'Manrope', sans-serif !important; }
        `
      }} />

      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <section className="pt-32 pb-16 px-6 max-w-[860px] mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[#A855F7] text-xs font-bold tracking-wider uppercase mb-6">
            <Cookie size={14} color="#A855F7" />
            <span>Cookie Preferences</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
            Cookie Policy
          </h1>
          <p className="text-sm text-[#9AA0B4] mb-12">
            Last Updated: August 2026 · Transparency on how we use essential cookies and local storage tokens.
          </p>

          <div className="space-y-10 text-sm text-[#D5D8E4] leading-relaxed">
            <div>
              <h3 className="text-xl font-bold text-white mb-3">1. What are Cookies?</h3>
              <p className="text-[#9AA0B4]">
                Cookies and local storage tokens are small text files placed on your device to ensure secure authentication, preserve your session across page reloads, and remember your interface preferences (such as dark mode and active dashboard tabs).
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">2. Types of Cookies We Use</h3>
              <ul className="list-disc pl-5 space-y-2 text-[#9AA0B4]">
                <li><strong className="text-white">Strictly Necessary Cookies:</strong> Essential for authenticating your login token, maintaining CSRF protection, and securely loading your personalized roadmap.</li>
                <li><strong className="text-white">Functional & Preference Tokens:</strong> Store your theme settings, search history on the certificate verification portal, and active Agent K chat session context.</li>
                <li><strong className="text-white">Performance & Analytics:</strong> Measure page load speeds and API latency to maintain high performance across 200+ partner universities without tracking your cross-site browsing.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">3. Managing Your Cookie Settings</h3>
              <p className="text-[#9AA0B4]">
                You can manage or disable cookies directly through your browser settings at any time. Note that disabling essential session cookies will prevent login and access to the student and mentor portals.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = {
  outerWrap: {
    flex: 1,
    backgroundColor: '#05060F',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
};
