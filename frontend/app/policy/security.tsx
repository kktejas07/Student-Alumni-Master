import React from 'react';
import { View, ScrollView } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { ShieldCheck, Lock, Key, Server, CheckCircle2 } from 'lucide-react-native';

export default function SecurityPage() {
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
            <ShieldCheck size={14} color="#A855F7" />
            <span>Infrastructure & Cryptography</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mb-4">
            Security & Trust Architecture
          </h1>
          <p className="text-sm text-[#9AA0B4] mb-12">
            How StudentAlumni protects student records, AI workflows, and cryptographic credential integrity.
          </p>

          <div className="space-y-10 text-sm text-[#D5D8E4] leading-relaxed">
            <div className="p-6 rounded-2xl bg-[#0C0E1B] border border-[#1B1E33]">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Key size={18} color="#A855F7" />
                <span>Cryptographic SHA-256 Signature Engine</span>
              </h2>
              <p className="text-[#9AA0B4]">
                Every degree certificate, skill badge, and ambassador credential is mathematically sealed with a SHA-256 cryptographic hash generated from the issuer ID, recipient identity, issuance timestamp, and verification salt. Any alteration to the certificate payload immediately invalidates the hash.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">Enterprise Data Protection</h3>
              <ul className="list-disc pl-5 space-y-2 text-[#9AA0B4]">
                <li><strong className="text-white">End-to-End Encryption:</strong> All client-to-server traffic is encrypted using TLS 1.3 with strict HTTPS transport security.</li>
                <li><strong className="text-white">Database Encryption:</strong> Stored documents, resumes, and telemetry are encrypted at rest with AES-256 keys managed in secure hardware vaults.</li>
                <li><strong className="text-white">Zero-Knowledge Verification:</strong> Third-party recruiters can verify credentials without accessing private student contact details or phone numbers.</li>
                <li><strong className="text-white">Automated Vulnerability Scanning:</strong> Continuous automated audits and SAIF compliance protocols across cloud workloads.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">Responsible AI Guardrails</h3>
              <p className="text-[#9AA0B4]">
                Agent K operates under strict safety filters. Student resume data and proprietary academic inquiries are never used to train public open LLMs without explicit institutional consent.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-3">Reporting Security Vulnerabilities</h3>
              <p className="text-[#9AA0B4]">
                We welcome responsible security research. If you discover a vulnerability or security issue, please contact our security engineering team directly at <span className="text-[#A855F7] font-semibold">security@studentalumni.com</span>.
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
