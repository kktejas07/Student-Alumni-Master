import React from 'react';
import { View, ScrollView } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react-native';

export default function PrivacyPolicyPage() {
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
            <Lock size={14} color="#A855F7" />
            <span>Privacy & Data Protection</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#9AA0B4] mb-12">
            Last Updated: August 2026 · Effective across all StudentAlumni web, mobile, and institutional applications.
          </p>

          <div className="space-y-10 text-sm text-[#D5D8E4] leading-relaxed">
            <div className="p-6 rounded-2xl bg-[#0C0E1B] border border-[#1B1E33]">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Eye size={18} color="#A855F7" />
                <span>Our Student-First Privacy Commitment</span>
              </h2>
              <p className="text-[#9AA0B4]">
                Your student profile, academic records, and career aspirations remain strictly confidential. We never sell your personal information or resume to third-party data brokers or advertisers.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">1. Information We Collect</h3>
              <p className="mb-3 text-[#9AA0B4]">
                We collect only information essential to power your AI career copilot and verified connections:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#9AA0B4]">
                <li><strong className="text-white">Account Information:</strong> Name, student/institutional email address, graduation year, and degree program.</li>
                <li><strong className="text-white">Career Profile:</strong> Resumes uploaded for AI scoring, technical skills, target roles, and roadmap milestones.</li>
                <li><strong className="text-white">Mentorship & Communications:</strong> Structured session agendas, feedback ratings, and community forum interactions.</li>
                <li><strong className="text-white">Cryptographic Certificate Hashes:</strong> SHA-256 integrity digests of issued degrees, diplomas, and course completion badges.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">2. How We Use Your Data</h3>
              <p className="mb-3 text-[#9AA0B4]">Your information is used strictly to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[#9AA0B4]">
                <li>Deliver contextual guidance and personalized mock interviews via Agent K.</li>
                <li>Match you with verified alumni mentors from your university or industry of interest.</li>
                <li>Authenticate and verify digital certificates on the public verification portal.</li>
                <li>Provide aggregated, non-personally identifiable placement statistics to partner universities.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">3. Data Security & Cryptographic Storage</h3>
              <p className="text-[#9AA0B4]">
                All data is encrypted in transit via TLS 1.3 and at rest via AES-256 encryption. Digital certificates utilize cryptographic SHA-256 hashes that allow public verification of authenticity without exposing confidential student contact details.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">4. Your Rights and Choices</h3>
              <p className="text-[#9AA0B4]">
                You retain full control over your data. You may export your complete profile, make your resume private, or request permanent deletion of your account and associated files at any time via your Account Settings or by emailing <span className="text-[#A855F7] font-semibold">privacy@studentalumni.com</span>.
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
