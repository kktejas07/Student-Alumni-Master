import React from 'react';
import { View, ScrollView } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { FileText, ShieldCheck } from 'lucide-react-native';

export default function TermsOfServicePage() {
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
            <FileText size={14} color="#A855F7" />
            <span>Legal Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-[#9AA0B4] mb-12">
            Last Updated: August 2026 · Please read these terms carefully before accessing StudentAlumni services.
          </p>

          <div className="space-y-10 text-sm text-[#D5D8E4] leading-relaxed">
            <div>
              <h3 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h3>
              <p className="text-[#9AA0B4]">
                By registering an account, accessing Agent K, booking mentorship sessions, or verifying credentials on StudentAlumni, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">2. User Eligibility & Student Accounts</h3>
              <p className="text-[#9AA0B4]">
                Student accounts are intended for enrolled students (Class 11+ onwards, undergraduate, graduate) and verified alumni of recognized institutions. You agree to provide accurate information regarding your academic enrollment and graduation credentials.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">3. Code of Conduct & Mentorship Etiquette</h3>
              <p className="text-[#9AA0B4]">
                StudentAlumni fosters a supportive and professional community. Unsolicited commercial outreach, harassment, fraudulent representation of academic records, or abusive conduct during mentorship sessions will result in immediate permanent account termination.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">4. Certificate Verification & Authenticity</h3>
              <p className="text-[#9AA0B4]">
                Digital certificates and badges issued via the platform are cryptographically sealed with SHA-256 hashes. Any attempt to forge, modify, or misrepresent certificate records is strictly prohibited and may result in legal referral to the issuing institution.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">5. Limitation of Liability</h3>
              <p className="text-[#9AA0B4]">
                StudentAlumni provides AI recommendations and mentorship matching tools to assist student careers. We do not guarantee employment, internship placements, or specific hiring outcomes from third-party partner companies.
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
