import React from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { MessageSquare, Users, Share2 } from 'lucide-react-native';

export default function CommunityPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 860;

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', sans-serif !important; }
          .comm-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.18), transparent 68%);
            filter: blur(70px);
          }
          .comm-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(47,184,198,.14), transparent 70%);
            filter: blur(80px);
          }
          @keyframes rs-dot-blink {
            0%, 100% { opacity: .4; }
            50% { opacity: 1; }
          }
          .pulse-dot {
            animation: rs-dot-blink 2s ease-in-out infinite;
          }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="comm-glow-left" />
        <View className="comm-glow-right" />
      </View>

      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <section className="pt-32 pb-16 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Header */}
          <div className="max-w-[720px] mb-12">
            <span className="inline-flex items-center gap-2 font-semibold text-xs tracking-widest text-[#34D399] bg-[#10B981]/10 border border-[#17503E] rounded-full px-4 py-1.5 uppercase">
              <Users size={13} color="#34D399" />
              COMMUNITY
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
              42 campuses, one room
            </h1>
            <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed">
              Students, alumni and placement teams comparing notes in the open. Free to join with a verified college email.
            </p>
          </div>

          {/* Featured Hero: Meet in Person */}
          <div className="bg-[#11111C] border border-[#1F1F30] rounded-3xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xl mb-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-8 font-bold text-[10.5px] tracking-wider text-[#2E2091] bg-[#7C5CFC]/12 border border-[#2C2A52] rounded-lg px-3 py-1.5 uppercase mb-6">
                ON THE GROUND
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
                The network is not a feed. It meets in person.
              </h2>
              <p className="text-[#8A8A9E] text-base leading-relaxed mb-8 max-w-[520px]">
                Every term the community runs build sprints, alumni panels and resume clinics on campus. The chat is where it continues afterwards.
              </p>
              
              <div className="grid grid-cols-3 gap-6 mb-8 max-w-[420px]">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#8B84FF] tracking-tight">86</div>
                  <div className="text-xs text-[#8A8A9E] mt-1">events run this year</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#6FA8F5] tracking-tight">31</div>
                  <div className="text-xs text-[#8A8A9E] mt-1">cities represented</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#34D399] tracking-tight">4.8</div>
                  <div className="text-xs text-[#8A8A9E] mt-1">average event rating</div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => router.push('/events')}
                  className="bg-[#5B4FE9] hover:bg-[#4F43D6] text-white text-sm font-bold px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Find an event near you
                </button>
                <button
                  onClick={() => router.push('/contact')}
                  className="border border-[#292940] hover:border-[#7C5CFC] text-white text-sm font-bold px-6 py-3.5 rounded-xl bg-transparent transition-all cursor-pointer"
                >
                  Host on your campus
                </button>
              </div>
            </div>

            {/* Collage Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 grid-rows-3 gap-3 h-[300px]">
              <div className="row-span-2 rounded-2xl bg-[#E7E9F2] overflow-hidden">
                <div className="w-full h-full bg-[#1F1F30] flex items-center justify-center text-xs text-[#6A6A7E] text-center p-3">Event Photo</div>
              </div>
              <div className="rounded-2xl bg-[#E7E9F2] overflow-hidden">
                <div className="w-full h-full bg-[#1F1F30] flex items-center justify-center text-xs text-[#6A6A7E] text-center p-3">Workshop</div>
              </div>
              <div className="rounded-2xl bg-[#E7E9F2] overflow-hidden">
                <div className="w-full h-full bg-[#1F1F30] flex items-center justify-center text-xs text-[#6A6A7E] text-center p-3">Panel</div>
              </div>
              <div className="rounded-2xl bg-[#E7E9F2] overflow-hidden">
                <div className="w-full h-full bg-[#1F1F30] flex items-center justify-center text-xs text-[#6A6A7E] text-center p-3">Team Build</div>
              </div>
              <div className="rounded-2xl bg-[#E7E9F2] overflow-hidden">
                <div className="w-full h-full bg-[#1F1F30] flex items-center justify-center text-xs text-[#6A6A7E] text-center p-3">Meetup</div>
              </div>
            </div>
          </div>

          {/* Social Platforms Row */}
          <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} mb-12`}>
            {/* Discord */}
            <div 
              onClick={() => handleLinkPress('https://discord.gg')}
              className="border border-[#1F1F30] hover:border-[#2C2A52] rounded-2xl bg-[#11111C] p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-[#5865F2]/10 flex items-center justify-center">
                    <MessageSquare size={19} color="#7C8BF5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399]">
                    <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#34D399]"><span /></span>
                    1,240 online
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Discord</h3>
                <p className="text-sm text-[#8A8A9E] leading-relaxed mb-6">
                  Daily chat by branch and by goal. Weekly office hours with a mentor on call.
                </p>
              </div>
              <span className="text-sm font-semibold text-[#A78BFA] group-hover:text-white">Join server →</span>
            </div>

            {/* WhatsApp */}
            <div 
              onClick={() => handleLinkPress('https://whatsapp.com')}
              className="border border-[#1F1F30] hover:border-[#2C2A52] rounded-2xl bg-[#11111C] p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                    <Users size={19} color="#34D399" />
                  </span>
                  <span className="text-xs font-semibold text-[#8A8A9E]">Per-campus</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">WhatsApp groups</h3>
                <p className="text-sm text-[#8A8A9E] leading-relaxed mb-6">
                  One group per college, run with your placement office. Event alerts and referral drops.
                </p>
              </div>
              <span className="text-sm font-semibold text-[#A78BFA]">Find your campus →</span>
            </div>

            {/* LinkedIn */}
            <div 
              onClick={() => handleLinkPress('https://linkedin.com')}
              className="border border-[#1F1F30] hover:border-[#2C2A52] rounded-2xl bg-[#11111C] p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center">
                    <Share2 size={19} color="#6FA8F5" />
                  </span>
                  <span className="text-xs font-semibold text-[#8A8A9E]">8.2k followers</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">LinkedIn</h3>
                <p className="text-sm text-[#8A8A9E] leading-relaxed mb-6">
                  Alumni introductions, placement results and the monthly hiring digest.
                </p>
              </div>
              <span className="text-sm font-semibold text-[#A78BFA]">Follow →</span>
            </div>
          </div>

          {/* Code of Conduct */}
          <div className={`grid gap-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'} border border-[#1F1F30] rounded-2xl bg-[#11111C] p-8`}>
            <div className="md:col-span-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Code of conduct</h3>
              <p className="text-sm text-[#8A8A9E] mt-2">Four rules. They are enforced, and enforcement is logged.</p>
            </div>
            
            <div className="md:col-span-8 space-y-6">
              <div className="grid grid-cols-[28px_1fr] gap-4">
                <span className="w-7 h-7 rounded-lg bg-[#7C5CFC]/12 border border-[#2C2A52] flex items-center justify-center text-sm font-bold text-[#A78BFA]">1</span>
                <div>
                  <div className="text-base font-semibold text-white mb-1.5">Be useful before you be right</div>
                  <div className="text-sm text-[#8A8A9E] leading-relaxed">Answer the question that was asked. Corrections are welcome; point-scoring is not.</div>
                </div>
              </div>

              <div className="grid grid-cols-[28px_1fr] gap-4">
                <span className="w-7 h-7 rounded-lg bg-[#7C5CFC]/12 border border-[#2C2A52] flex items-center justify-center text-sm font-bold text-[#A78BFA]">2</span>
                <div>
                  <div className="text-base font-semibold text-white mb-1.5">No selling, no scraping, no spam</div>
                  <div className="text-sm text-[#8A8A9E] leading-relaxed">Paid courses, referral-for-fee offers and bulk DMs get a permanent ban on first offence.</div>
                </div>
              </div>

              <div className="grid grid-cols-[28px_1fr] gap-4">
                <span className="w-7 h-7 rounded-lg bg-[#7C5CFC]/12 border border-[#2C2A52] flex items-center justify-center text-sm font-bold text-[#A78BFA]">3</span>
                <div>
                  <div className="text-base font-semibold text-white mb-1.5">Someone else's data is not yours to share</div>
                  <div className="text-sm text-[#8A8A9E] leading-relaxed">No screenshots of private messages, resumes, offer letters or salary details without consent.</div>
                </div>
              </div>

              <div className="grid grid-cols-[28px_1fr] gap-4">
                <span className="w-7 h-7 rounded-lg bg-[#7C5CFC]/12 border border-[#2C2A52] flex items-center justify-center text-sm font-bold text-[#A78BFA]">4</span>
                <div>
                  <div className="text-base font-semibold text-white mb-1.5">Harassment ends the conversation</div>
                  <div className="text-sm text-[#8A8A9E] leading-relaxed">Report it and we act within four hours. Reports are confidential from the person reported.</div>
                </div>
              </div>
            </div>
          </div>

        </section>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#0A0A14',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
