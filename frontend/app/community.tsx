import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { MessageSquare, Users, Share2, Calendar, MapPin, X, Search, CheckCircle2, ArrowRight, Image as ImageIcon } from 'lucide-react-native';

const CAMPUSES = [
  { id: 'snist', name: 'Sreenidhi Institute of Science & Technology (SNIST)', location: 'Hyderabad', members: '1,420 students' },
  { id: 'vnr', name: 'VNR Vignana Jyothi Institute of Engineering & Technology', location: 'Hyderabad', members: '1,180 students' },
  { id: 'kits', name: 'KITS Khammam', location: 'Khammam', members: '940 students' },
  { id: 'cbit', name: 'Chaitanya Bharathi Institute of Technology (CBIT)', location: 'Hyderabad', members: '1,310 students' },
  { id: 'mrit', name: 'Malla Reddy Institute of Technology (MRIT)', location: 'Secunderabad', members: '880 students' },
  { id: 'jntuh', name: 'JNTU College of Engineering', location: 'Hyderabad', members: '1,650 students' },
  { id: 'ou', name: 'Osmania University College of Engineering', location: 'Hyderabad', members: '1,500 students' },
  { id: 'vasavi', name: 'Vasavi College of Engineering', location: 'Hyderabad', members: '1,050 students' },
];

const DISCORD_CHANNELS = [
  { name: '#placements-2026', desc: 'Daily referral links & off-campus hiring updates' },
  { name: '#resume-roast', desc: 'Get 1:1 feedback on your resume from senior alumni' },
  { name: '#interview-prep', desc: 'DSA, System Design, and HR mock interviews' },
  { name: '#hackathons-and-bounties', desc: 'Teammate matching & prize announcements' },
];

const UPCOMING_EVENTS = [
  { id: '1', date: 'SEP 04', title: 'HackWave 3.0', location: 'Sreenidhi, Hyderabad', tagColor: '#A78BFA' },
  { id: '2', date: 'SEP 12', title: 'Voice of Generations', location: 'VNR VJIET', tagColor: '#34D399' },
  { id: '3', date: 'SEP 18', title: 'Alumni AMA · Product', location: 'Online', tagColor: '#6FD6FF' },
];

export default function CommunityPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [showCampusModal, setShowCampusModal] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [campusSearch, setCampusSearch] = useState('');
  const [copiedCampus, setCopiedCampus] = useState<string | null>(null);

  const isTablet = width < 1150;
  const isMobile = width < 860;

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  const filteredCampuses = CAMPUSES.filter((c) =>
    c.name.toLowerCase().includes(campusSearch.toLowerCase()) ||
    c.location.toLowerCase().includes(campusSearch.toLowerCase())
  );

  const handleJoinCampusGroup = (campusName: string) => {
    setCopiedCampus(campusName);
    setTimeout(() => {
      setCopiedCampus(null);
      handleLinkPress('https://chat.whatsapp.com');
    }, 1200);
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', -apple-system, sans-serif !important; }
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
          .rs-card-hover:hover {
            transform: translateY(-3px);
            border-color: #7C5CFC !important;
          }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="comm-glow-left" />
        <View className="comm-glow-right" />
      </View>

      <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />
      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '34px 28px 90px', width: '100%' }}>
          
          {/* Header */}
          <div style={{ maxWidth: 720, marginBottom: 26 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: '700', letterSpacing: '1.4px', color: '#34D399', background: 'rgba(16,185,129,.13)', borderRadius: 100, padding: '7px 14px' }}>
              <Users size={13} color="#34D399" />
              COMMUNITY
            </span>
            <div style={{ fontSize: 40, fontWeight: '700', letterSpacing: '-1.6px', margin: '20px 0 12px', color: '#FFFFFF' }}>
              42 campuses, one room
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.65, color: '#8A8A9E' }}>
              Students, alumni and placement teams comparing notes in the open. Free to join with a verified college email.
            </div>
          </div>

          {/* Light Hero Banner: Meet in Person */}
          <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#F6F7FB', marginTop: 26, marginBottom: 28, border: '1px solid #E7E9F2', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ position: 'absolute', left: '-8%', top: '-30%', width: '44%', paddingBottom: '44%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,.16), transparent 68%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: '-6%', bottom: '-34%', width: '40%', paddingBottom: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,184,198,.14), transparent 70%)', pointerEvents: 'none' }} />
            
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1fr) minmax(0, 1.05fr)', gap: isTablet ? 32 : 44, alignItems: 'center', padding: isMobile ? '30px 24px' : '48px 46px' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: '700', letterSpacing: '1.5px', color: '#2E2091', background: 'rgba(124,92,252,.12)', border: '1px solid rgba(124,92,252,.24)', borderRadius: 100, padding: '7px 14px' }}>
                  ON THE GROUND
                </span>
                <div style={{ fontSize: 38, fontWeight: '700', letterSpacing: '-1.5px', lineHeight: 1.14, color: '#14161D', margin: '22px 0 16px' }}>
                  The network is not a feed.<br />It meets in person.
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.7, color: '#4A5163', marginBottom: 30, maxWidth: 460 }}>
                  Every term the community runs build sprints, alumni panels and resume clinics on campus. The chat is where it continues afterwards.
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 22, marginBottom: 32, maxWidth: 420 }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#4B3FA8' }}>86</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>events run this year</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#0E6E8C' }}>31</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>cities represented</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#047857' }}>4.8</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>average event rating</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push('/events')}
                    style={{ fontSize: 14, fontWeight: '600', background: '#5B4FE9', color: '#FFFFFF', borderRadius: 11, padding: '13px 22px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    Find an event near you
                  </button>
                  <button
                    onClick={() => router.push('/contact')}
                    style={{ fontSize: 14, fontWeight: '600', color: '#14161D', border: '1px solid #D3D7E4', borderRadius: 11, padding: '13px 22px', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    Host on your campus
                  </button>
                </div>
              </div>

              {/* Photo Collage Grid matching SA Community.html */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(3, 96px)', gap: 12, minWidth: 0 }}>
                {/* Slot 1: On-Campus Sprint */}
                <div style={{ position: 'relative', gridRow: 'span 2', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                  <div style={{ width: '100%', height: '100%', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(124,92,252,.35), rgba(20,16,45,.88))' }}>
                    <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.2px', color: '#A78BFA' }}>ON-CAMPUS SPRINT</div>
                    <div style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>HackWave Floor</div>
                  </div>
                </div>

                {/* Slot 2: Workshop */}
                <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                  <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(111,214,255,.35), rgba(15,30,60,.88))' }}>
                    <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#6FD6FF' }}>WORKSHOP</div>
                  </div>
                </div>

                {/* Slot 3: Alumni Panel */}
                <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                  <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(52,211,153,.35), rgba(10,40,30,.88))' }}>
                    <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#34D399' }}>ALUMNI PANEL</div>
                  </div>
                </div>

                {/* Slot 4: Team Build */}
                <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                  <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(245,179,66,.35), rgba(40,30,10,.88))' }}>
                    <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#F5B342' }}>TEAM BUILD</div>
                  </div>
                </div>

                {/* Slot 5: Meetup */}
                <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                  <div style={{ width: '100%', height: '100%', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(167,139,250,.35), rgba(30,20,70,.88))' }}>
                    <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#A78BFA' }}>MEETUP</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Hosts Bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, borderTop: '1px solid #E2E5EF', background: 'rgba(255,255,255,.7)', padding: '20px 46px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.5px', color: '#6B7280', flex: 'none' }}>RECENT HOSTS</span>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658' }}>SREENIDHI</span>
                <span style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658' }}>VNR VJIET</span>
                <span style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658' }}>KITS KHAMMAM</span>
                <span style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658' }}>CBIT</span>
                <span style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658' }}>MRIT</span>
              </div>
            </div>
          </div>

          {/* Stats Counter Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 14, marginTop: 28, marginBottom: 24 }}>
            <div style={{ border: '1px solid #1F1F30', borderRadius: 16, background: '#11111C', padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 30, fontWeight: '700', letterSpacing: '-1.1px', color: '#A78BFA' }}>12,400</div>
              <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 6 }}>Verified students</div>
            </div>
            <div style={{ border: '1px solid #1F1F30', borderRadius: 16, background: '#11111C', padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 30, fontWeight: '700', letterSpacing: '-1.1px', color: '#34D399' }}>860</div>
              <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 6 }}>Active mentors</div>
            </div>
            <div style={{ border: '1px solid #1F1F30', borderRadius: 16, background: '#11111C', padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 30, fontWeight: '700', letterSpacing: '-1.1px', color: '#6FD6FF' }}>42</div>
              <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 6 }}>Partner colleges</div>
            </div>
            <div style={{ border: '1px solid #1F1F30', borderRadius: 16, background: '#11111C', padding: '18px 20px 20px' }}>
              <div style={{ fontSize: 30, fontWeight: '700', letterSpacing: '-1.1px', color: '#F5B342' }}>1,900</div>
              <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 6 }}>Sessions this term</div>
            </div>
          </div>

          {/* Social Platforms Row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 20, marginBottom: 28 }}>
            {/* Discord */}
            <div 
              onClick={() => setShowDiscordModal(true)}
              className="rs-card-hover"
              style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '24px 26px 26px', cursor: 'pointer', transition: 'all 0.25s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 12, marginBottom: 16 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(88,101,242,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={19} color="#7C8BF5" />
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: '600', color: '#34D399', marginLeft: 'auto' }}>
                  <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                  1,240 online
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>Discord</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E', margin: '7px 0 18px' }}>
                Daily chat by branch and by goal. Weekly office hours with a mentor on call.
              </div>
              <span style={{ fontSize: 13.5, fontWeight: '600', color: '#A78BFA' }}>Join server →</span>
            </div>

            {/* WhatsApp */}
            <div 
              onClick={() => setShowCampusModal(true)}
              className="rs-card-hover"
              style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '24px 26px 26px', cursor: 'pointer', transition: 'all 0.25s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 12, marginBottom: 16 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,211,102,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={19} color="#34D399" />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: '600', color: '#8A8A9E', marginLeft: 'auto' }}>Per-campus</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>WhatsApp groups</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E', margin: '7px 0 18px' }}>
                One group per college, run with your placement office. Event alerts and referral drops.
              </div>
              <span style={{ fontSize: 13.5, fontWeight: '600', color: '#A78BFA' }}>Find your campus →</span>
            </div>

            {/* LinkedIn */}
            <div 
              onClick={() => handleLinkPress('https://linkedin.com')}
              className="rs-card-hover"
              style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '24px 26px 26px', cursor: 'pointer', transition: 'all 0.25s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: 12, marginBottom: 16 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(10,102,194,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={19} color="#6FA8F5" />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: '600', color: '#8A8A9E', marginLeft: 'auto' }}>8.2k followers</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>LinkedIn</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E', margin: '7px 0 18px' }}>
                Alumni introductions, placement results and the monthly hiring digest.
              </div>
              <span style={{ fontSize: 13.5, fontWeight: '600', color: '#A78BFA' }}>Follow →</span>
            </div>
          </div>

          {/* Code of Conduct & Coming Up Sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1fr) 380px', gap: 20, marginTop: 22, alignItems: 'start' }}>
            {/* Code of Conduct */}
            <div style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '24px 26px 26px' }}>
              <div style={{ fontSize: 19, fontWeight: '700', letterSpacing: '-.4px', color: '#FFFFFF', marginBottom: 6 }}>Code of conduct</div>
              <div style={{ fontSize: 14, color: '#8A8A9E', marginBottom: 22 }}>Four rules. They are enforced, and enforcement is logged.</div>
              
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 14 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(124,92,252,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '700', color: '#A78BFA' }}>1</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 5 }}>Be useful before you be right</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E' }}>Answer the question that was asked. Corrections are welcome; point-scoring is not.</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 14 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(124,92,252,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '700', color: '#A78BFA' }}>2</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 5 }}>No selling, no scraping, no spam</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E' }}>Paid courses, referral-for-fee offers and bulk DMs get a permanent ban on first offence.</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 14 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(124,92,252,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '700', color: '#A78BFA' }}>3</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 5 }}>Someone else's data is not yours to share</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E' }}>No screenshots of private messages, resumes, offer letters or salary details without consent.</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 14 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(124,92,252,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '700', color: '#A78BFA' }}>4</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 5 }}>Harassment ends the conversation</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E' }}>Report it and we act within four hours. Reports are confidential from the person reported.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Up Sidebar */}
            <div style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '24px 26px 26px' }}>
              <div style={{ fontSize: 19, fontWeight: '700', letterSpacing: '-.4px', color: '#FFFFFF', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#A78BFA" />
                Coming up
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {UPCOMING_EVENTS.map((ev) => (
                  <div 
                    key={ev.id}
                    onClick={() => router.push('/events')}
                    style={{ border: '1px solid #292940', borderRadius: 14, background: '#161622', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1.2px', color: ev.tagColor, marginBottom: 7 }}>
                      {ev.date}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: '600', color: '#FFFFFF' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} color="#6A6A7E" />
                      {ev.location}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Campus WhatsApp Selector Modal */}
        {showCampusModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: '#11111C', border: '1px solid #2C2A52', borderRadius: 20, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color="#34D399" />
                  <h3 style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>Find Your Campus Group</h3>
                </div>
                <button 
                  onClick={() => setShowCampusModal(false)}
                  style={{ padding: 4, borderRadius: 8, border: '1px solid #1F1F30', background: 'transparent', color: '#8A8A9E', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: '#8A8A9E', marginBottom: 16 }}>
                Select your institution to join your verified campus WhatsApp group run with your placement office.
              </p>

              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={15} color="#6A6A7E" style={{ position: 'absolute', left: 14, top: 14, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search college name or city..."
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  style={{ width: '100%', background: '#161622', border: '1px solid #292940', borderRadius: 12, paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: '#FFFFFF', outline: 'none' }}
                />
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, paddingRight: 4 }}>
                {filteredCampuses.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleJoinCampusGroup(c.name)}
                    style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #1F1F30', background: '#161622', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#8A8A9E', marginTop: 2 }}>{c.location} · {c.members}</div>
                    </div>
                    {copiedCampus === c.name ? (
                      <span style={{ fontSize: 12, fontWeight: '700', color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} /> Joining...
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: '600', color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Join <ArrowRight size={13} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Discord Directory Modal */}
        {showDiscordModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: '#11111C', border: '1px solid #2C2A52', borderRadius: 20, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={20} color="#7C8BF5" />
                  <h3 style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>StudentAlumni Discord</h3>
                </div>
                <button 
                  onClick={() => setShowDiscordModal(false)}
                  style={{ padding: 4, borderRadius: 8, border: '1px solid #1F1F30', background: 'transparent', color: '#8A8A9E', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: '#8A8A9E', marginBottom: 20 }}>
                Our Discord server connects 12,400+ verified candidates and alumni across technical channels.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {DISCORD_CHANNELS.map((ch, idx) => (
                  <div key={idx} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #1F1F30', background: '#161622' }}>
                    <div style={{ fontSize: 14, fontWeight: '700', color: '#A78BFA' }}>{ch.name}</div>
                    <div style={{ fontSize: 12, color: '#8A8A9E', marginTop: 4 }}>{ch.desc}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowDiscordModal(false);
                  handleLinkPress('https://discord.gg');
                }}
                style={{ width: '100%', background: '#5865F2', color: '#FFFFFF', fontSize: 14, fontWeight: '700', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                Join Discord Server Now
              </button>
            </div>
          </div>
        )}

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
