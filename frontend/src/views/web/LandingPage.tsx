/**
 * Web-only Landing Page for Student Alumni
 * Matches design in /app/frontend/landing_refs/* (7 sections):
 *   1. Sticky Navbar
 *   2. Hero (Your Campus Life, Reimagined) + Stats
 *   3. Features  - "Everything You Need, One Platform" (3 cards)
 *   4. Features  - Network & Connect / Launch Startups / Verified & Trusted (3 cards)
 *   5. Upcoming Events (4 cards) -- mock data, will be wired to /api/events later
 *   6. Services Built for Students (4 cards)
 *   7. CTA - Ready to Transform Your Student Experience?
 *   8. Footer
 *
 * NOTE: Rendered ONLY when Platform.OS === 'web'. Mobile experience untouched.
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Briefcase,
  BookOpen,
  MessageCircle,
  Settings,
  ChevronDown,
  Users,
  Zap,
  Shield,
  Building2 as Home,
  ShieldCheck,
  Tag,
  Rocket,
  MapPin,
  Sparkles,
  LayoutGrid,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

// ---- Custom social brand icons (lucide-react-native doesn't ship brand icons) ----
function TwitterIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill={color}
      />
    </Svg>
  );
}
function LinkedInIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.268 2.37 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.064 2.063 2.063 0 112.063 2.064zm1.778 13.019H3.555V9h3.56v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill={color}
      />
    </Svg>
  );
}
function InstagramIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill={color}
      />
    </Svg>
  );
}
function YouTubeIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        fill={color}
      />
    </Svg>
  );
}
import { Colors as C, Typography } from '@/src/theme';
import { SALogo } from '@/src/views/components';

// ----------------------- COLORS / DESIGN TOKENS ------------------------------
// Dark theme tuned to screenshots
const PALETTE = {
  pageBg: '#0A0420',           // deep navy/black background
  pageBgAlt: '#120833',
  navBg: 'rgba(10, 4, 32, 0.85)',
  cardBg: 'rgba(28, 14, 65, 0.6)',
  cardBorder: 'rgba(176, 127, 223, 0.22)',
  cardBorderGlow: 'rgba(176, 127, 223, 0.55)',
  textOnDark: '#FFFFFF',
  textMutedOnDark: 'rgba(255,255,255,0.72)',
  textFaint: 'rgba(255,255,255,0.56)',
  accent: '#B07FDF',
  accentBright: '#C896F5',
  accentSoft: 'rgba(176,127,223,0.18)',
  pink: '#E879F9',
  divider: 'rgba(255,255,255,0.08)',
};

// ----------------------- MOCK DATA -------------------------------------------
const MOCK_EVENTS = [
  {
    category: 'Hackathon',
    title: 'TechHack 2024',
    location: 'IIT Delhi',
    date: 'Jan 15-17',
    attending: '500',
    image:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=70&auto=format&fit=crop',
  },
  {
    category: 'Investment Meet',
    title: 'Startup Summit',
    location: 'Bangalore',
    date: 'Jan 22',
    attending: '200',
    image:
      'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=900&q=70&auto=format&fit=crop',
  },
  {
    category: 'College Fest',
    title: 'Waves 2024',
    location: 'BITS Pilani',
    date: 'Feb 1-4',
    attending: '10,000',
    image:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=70&auto=format&fit=crop',
  },
  {
    category: 'Networking',
    title: 'Alumni Connect',
    location: 'Mumbai',
    date: 'Feb 10',
    attending: '150',
    image:
      'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=900&q=70&auto=format&fit=crop',
  },
];

// ----------------------- SECTION REFS HOOK -----------------------------------
// We use scroll-to-section navigation for the navbar.
// On web we scroll the document/window (not a RN ScrollView).
function useScrollSections() {
  const scrollRef = useRef<ScrollView | null>(null);
  const positions = useRef<Record<string, number>>({});

  const setPos = (key: string) => (e: any) => {
    positions.current[key] = e?.nativeEvent?.layout?.y ?? 0;
  };
  const scrollTo = (key: string) => {
    const y = positions.current[key] ?? 0;
    const target = Math.max(y - 60, 0);
    scrollRef.current?.scrollTo({ y: target, animated: true });
  };
  return { scrollRef, setPos, scrollTo };
}

// ----------------------- COMPONENT -------------------------------------------
export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMd = width >= 900;
  const isSm = width >= 640;
  const { scrollRef, setPos, scrollTo } = useScrollSections();

  return (
    <View style={[styles.page, { backgroundColor: PALETTE.pageBg }]}>
      {/* Decorative glow blobs covering whole page */}
      <View pointerEvents="none" style={styles.bgBlobs}>
        <View style={[styles.blob, { top: -180, left: -120, backgroundColor: 'rgba(123,61,191,0.35)' }]} />
        <View style={[styles.blob, { top: 400, right: -180, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
        <View style={[styles.blob, { top: 1100, left: -150, backgroundColor: 'rgba(232,121,249,0.18)' }]} />
        <View style={[styles.blob, { top: 1900, right: -200, backgroundColor: 'rgba(123,61,191,0.25)' }]} />
      </View>

      {/* Sticky Navbar */}
      <Navbar
        isMd={isMd}
        onNav={(key) => scrollTo(key)}
        onLogin={() => router.push('/(auth)/login')}
        onGetStarted={() => router.push('/(auth)/email-detect')}
      />

      <ScrollView
        ref={(r) => {
          scrollRef.current = r;
        }}
        contentContainerStyle={{ paddingTop: 72 }}
        showsVerticalScrollIndicator
        nativeID="landing-scroll"
      >
        {/* HERO */}
        <View onLayout={setPos('hero')}>
          <Hero
            isMd={isMd}
            isSm={isSm}
            onGetStarted={() => router.push('/(auth)/email-detect')}
            onExploreEvents={() => scrollTo('events')}
          />
        </View>

        {/* FEATURE BLOCK 1 — Everything You Need, One Platform */}
        <FeaturesEverythingNeed isMd={isMd} />

        {/* FEATURE BLOCK 2 — Network & Connect / Launch Startups / Verified */}
        <FeaturesNetwork isMd={isMd} />

        {/* UPCOMING EVENTS */}
        <View onLayout={setPos('events')}>
          <UpcomingEvents
            isMd={isMd}
            onViewAll={() => router.push('/events')}
          />
        </View>

        {/* SERVICES */}
        <View onLayout={setPos('services')}>
          <ServicesSection isMd={isMd} onLearnMore={() => router.push('/(auth)/email-detect')} />
        </View>

        {/* CTA */}
        <CtaSection onGetStarted={() => router.push('/(auth)/email-detect')} />

        {/* FOOTER */}
        <Footer
          onNav={(key) => scrollTo(key)}
          onBlogs={() => router.push('/blogs')}
          onContact={() => router.push('/contact')}
        />
      </ScrollView>
    </View>
  );
}

// ============================ NAVBAR =========================================
function Navbar({
  isMd,
  onNav,
  onLogin,
  onGetStarted,
}: {
  isMd: boolean;
  onNav: (key: string) => void;
  onLogin: () => void;
  onGetStarted: () => void;
}) {
  const router = useRouter();
  const links: { key: string; label: string; icon: any; onPress?: () => void }[] = [
    { key: 'hero', label: 'Dashboard', icon: LayoutGrid },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'blogs', label: 'Blogs', icon: BookOpen, onPress: () => router.push('/blogs') },
    { key: 'contact', label: 'Contact', icon: MessageCircle, onPress: () => router.push('/contact') },
  ];

  return (
    <View style={[styles.navWrap, { backgroundColor: PALETTE.navBg }]}>
      <View style={[styles.navInner, { maxWidth: 1280 }]}>
        {/* Logo */}
        <Pressable style={styles.logoRow} onPress={() => onNav('hero')}>
          <View style={styles.logoBadge}>
            <SALogo size={26} variant="glass" />
          </View>
          <Text style={styles.brandText}>StudentAlumni</Text>
        </Pressable>

        {/* Center links — hidden on small */}
        {isMd && (
          <View style={styles.navLinks}>
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <Pressable
                  key={l.label}
                  onPress={() => (l.onPress ? l.onPress() : onNav(l.key))}
                  style={({ hovered }: any) => [
                    styles.navLink,
                    hovered && { backgroundColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  <Icon size={14} color={PALETTE.textMutedOnDark} />
                  <Text style={styles.navLinkText}>{l.label}</Text>
                  <ChevronDown size={12} color={PALETTE.textFaint} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Right action group */}
        <View style={styles.navRight}>
          {isMd && (
            <Pressable style={styles.iconBtn}>
              <Settings size={16} color={PALETTE.textMutedOnDark} />
            </Pressable>
          )}
          <Pressable onPress={onLogin}>
            <Text style={styles.loginText}>Log In</Text>
          </Pressable>
          <GradientButton onPress={onGetStarted} label="Get Started" small />
        </View>
      </View>
    </View>
  );
}

// ============================ HERO ===========================================
function Hero({
  isMd,
  isSm,
  onGetStarted,
  onExploreEvents,
}: {
  isMd: boolean;
  isSm: boolean;
  onGetStarted: () => void;
  onExploreEvents: () => void;
}) {
  const stats = [
    { value: '50K+', label: 'Active Students' },
    { value: '500+', label: 'Events Monthly' },
    { value: '200+', label: 'Partner Colleges' },
    { value: '100+', label: 'Exclusive Offers' },
  ];

  return (
    <View style={[styles.section, { paddingVertical: isMd ? 110 : 80 }]}>
      <View style={[styles.container, { maxWidth: 1080, alignItems: 'center' }]}>
        {/* Pill */}
        <View style={styles.heroPill}>
          <Sparkles size={14} color={PALETTE.accentBright} />
          <Text style={styles.heroPillText}>The Student Ecosystem Platform</Text>
        </View>

        {/* Heading */}
        <Text
          style={[
            styles.heroHeading,
            { fontSize: isMd ? 76 : isSm ? 56 : 44, lineHeight: isMd ? 82 : isSm ? 60 : 48 },
          ]}
        >
          Your Campus Life,{'\n'}
          <Text style={{ color: PALETTE.accentBright }}>Reimagined</Text>
        </Text>

        {/* Subheading */}
        <Text style={[styles.heroSub, { maxWidth: 760, fontSize: isMd ? 20 : 16 }]}>
          Discover events, access exclusive services, connect with your community, and unlock
          opportunities designed exclusively for students.
        </Text>

        {/* Buttons */}
        <View style={[styles.heroBtnRow, { flexDirection: isSm ? 'row' : 'column' }]}>
          <GradientButton
            label="Get Started Free"
            onPress={onGetStarted}
            iconRight={<ArrowRight size={18} color="#fff" />}
          />
          <OutlineButton label="Explore Events" onPress={onExploreEvents} />
        </View>

        {/* Stats grid */}
        <View
          style={[
            styles.statsRow,
            {
              flexDirection: isSm ? 'row' : 'column',
              gap: isMd ? 60 : 24,
              marginTop: isMd ? 70 : 50,
            },
          ]}
        >
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================ FEATURES 1 =====================================
function FeaturesEverythingNeed({ isMd }: { isMd: boolean }) {
  const items = [
    {
      icon: Calendar,
      title: 'Discover Events',
      desc: 'From hackathons to college fests, find events that match your interests and advance your career.',
    },
    {
      icon: Briefcase,
      title: 'Student Services',
      desc: 'Access housing, insurance, discounts, and more — all verified and curated for students.',
    },
    {
      icon: BookOpen,
      title: 'Community Blogs',
      desc: 'Share your stories, learn from peers, and stay updated with campus life across colleges.',
    },
  ];
  return (
    <View style={[styles.section, { paddingVertical: 90 }]}>
      <View style={styles.container}>
        <SectionHeader
          title={
            <>
              Everything You Need,{' '}
              <Text style={{ color: PALETTE.accentBright }}>One Platform</Text>
            </>
          }
          subtitle="Student Alumni brings together events, services, community, and opportunities in a seamless experience designed for modern students."
        />
        <View style={[styles.cardGrid, { flexDirection: isMd ? 'row' : 'column' }]}>
          {items.map((it) => (
            <FeatureCard key={it.title} {...it} flex={isMd} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================ FEATURES 2 =====================================
function FeaturesNetwork({ isMd }: { isMd: boolean }) {
  const items = [
    {
      icon: Users,
      title: 'Network & Connect',
      desc: 'Build meaningful connections with students, alumni, and professionals in your field.',
    },
    {
      icon: Zap,
      title: 'Launch Startups',
      desc: 'Showcase your ideas, find co-founders, and connect with investors and mentors.',
    },
    {
      icon: Shield,
      title: 'Verified & Trusted',
      desc: 'Every listing is verified. Your data is secure. Your experience is premium.',
    },
  ];
  return (
    <View style={[styles.section, { paddingTop: 0, paddingBottom: 90 }]}>
      <View style={styles.container}>
        <View style={[styles.cardGrid, { flexDirection: isMd ? 'row' : 'column' }]}>
          {items.map((it) => (
            <FeatureCard key={it.title} {...it} flex={isMd} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================ UPCOMING EVENTS ================================
function UpcomingEvents({ isMd, onViewAll }: { isMd: boolean; onViewAll: () => void }) {
  return (
    <View style={[styles.section, { paddingVertical: 90 }]}>
      <View style={styles.container}>
        <View
          style={{
            flexDirection: isMd ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: isMd ? 'flex-end' : 'flex-start',
            marginBottom: 40,
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionHeading, { fontSize: isMd ? 48 : 34 }]}>
              Upcoming <Text style={{ color: PALETTE.accentBright }}>Events</Text>
            </Text>
            <Text style={[styles.sectionSub, { marginTop: 12, maxWidth: 620 }]}>
              Don't miss out on the most exciting student events happening across campuses.
            </Text>
          </View>
          <OutlineButton
            label="View All Events"
            small
            iconRight={<ArrowRight size={16} color="#fff" />}
            onPress={onViewAll}
          />
        </View>

        <View
          style={[
            styles.eventGrid,
            { flexDirection: isMd ? 'row' : 'column', flexWrap: isMd ? 'wrap' : 'nowrap' },
          ]}
        >
          {MOCK_EVENTS.map((e) => (
            <EventCard key={e.title} event={e} isMd={isMd} />
          ))}
        </View>
      </View>
    </View>
  );
}

function EventCard({ event, isMd }: { event: (typeof MOCK_EVENTS)[number]; isMd: boolean }) {
  return (
    <View
      style={[
        styles.eventCard,
        {
          width: isMd ? 'calc(25% - 18px)' as any : '100%',
          minWidth: isMd ? 230 : 0,
        },
      ]}
    >
      <View style={styles.eventImageWrap}>
        <Image source={{ uri: event.image }} style={styles.eventImage} resizeMode="cover" />
        <View style={styles.eventCategoryBadge}>
          <Text style={styles.eventCategoryText}>{event.category}</Text>
        </View>
      </View>
      <View style={{ padding: 18 }}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Row icon={MapPin} text={event.location} />
        <Row icon={Calendar} text={event.date} />
        <Row icon={Users} text={`${event.attending} attending`} />
      </View>
    </View>
  );
}

function Row({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <Icon size={14} color={PALETTE.textMutedOnDark} />
      <Text style={{ color: PALETTE.textMutedOnDark, fontFamily: 'DMSans_500Medium', fontSize: 13 }}>
        {text}
      </Text>
    </View>
  );
}

// ============================ SERVICES =======================================
function ServicesSection({ isMd, onLearnMore }: { isMd: boolean; onLearnMore: () => void }) {
  const items = [
    {
      icon: Home,
      title: 'Student Housing',
      desc: 'Find verified, affordable housing near your campus. Roommate matching included.',
    },
    {
      icon: ShieldCheck,
      title: 'Smart Insurance',
      desc: 'Compare student-friendly insurance policies. No jargon, just clarity.',
    },
    {
      icon: Tag,
      title: 'Exclusive Discounts',
      desc: 'Unlock student-only offers from top brands. Save more, stress less.',
    },
    {
      icon: Rocket,
      title: 'Startup Launchpad',
      desc: 'Showcase your ideas, find mentors, and connect with investors.',
    },
  ];
  return (
    <View style={[styles.section, { paddingVertical: 90 }]}>
      <View style={styles.container}>
        <SectionHeader
          title={
            <>
              Services Built for <Text style={{ color: PALETTE.accentBright }}>Students</Text>
            </>
          }
          subtitle="Everything you need to thrive during your student life — verified, curated, and designed with your needs in mind."
        />
        <View
          style={[
            styles.cardGrid,
            { flexDirection: isMd ? 'row' : 'column', flexWrap: isMd ? 'wrap' : 'nowrap' },
          ]}
        >
          {items.map((it) => (
            <ServiceCard key={it.title} {...it} flex={isMd} onLearnMore={onLearnMore} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  desc,
  flex,
  onLearnMore,
}: {
  icon: any;
  title: string;
  desc: string;
  flex: boolean;
  onLearnMore: () => void;
}) {
  return (
    <View
      style={[
        styles.featureCard,
        flex && { width: 'calc(50% - 12px)' as any, minWidth: 300 },
      ]}
    >
      <View style={[styles.iconBubble, { backgroundColor: PALETTE.accentSoft }]}>
        <Icon size={24} color={PALETTE.accentBright} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
      <Pressable onPress={onLearnMore} style={styles.learnMoreRow}>
        <Text style={styles.learnMoreText}>Learn More</Text>
        <ArrowUpRight size={14} color={PALETTE.accentBright} />
      </Pressable>
    </View>
  );
}

// ============================ CTA ============================================
function CtaSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <View style={[styles.section, { paddingVertical: 110 }]}>
      <LinearGradient
        colors={['#3D1468', '#5F259F', '#7B3DBF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ctaWrap]}
      >
        <View style={[styles.container, { alignItems: 'center', paddingVertical: 80 }]}>
          <View style={styles.heroPill}>
            <Sparkles size={14} color="#fff" />
            <Text style={[styles.heroPillText, { color: '#fff' }]}>Join 50,000+ Students</Text>
          </View>
          <Text style={[styles.ctaHeading]}>
            Ready to Transform Your{'\n'}Student Experience?
          </Text>
          <Text style={[styles.ctaSub]}>
            Join the fastest-growing student platform. Access events, services, and opportunities
            that make campus life extraordinary.
          </Text>
          <Pressable
            onPress={onGetStarted}
            style={({ hovered }: any) => [
              styles.ctaButton,
              hovered && { transform: [{ translateY: -2 }] },
            ]}
          >
            <Text style={styles.ctaButtonText}>Get Started Free</Text>
            <ArrowRight size={20} color="#0A0420" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================ FOOTER =========================================
function Footer({
  onNav,
  onBlogs,
  onContact,
}: {
  onNav: (key: string) => void;
  onBlogs: () => void;
  onContact: () => void;
}) {
  const router = useRouter();
  const cols: { title: string; items: { label: string; onPress: () => void }[] }[] = [
    {
      title: 'Platform',
      items: [
        { label: 'Events', onPress: () => onNav('events') },
        { label: 'Services', onPress: () => onNav('services') },
        { label: 'Blogs', onPress: onBlogs },
        { label: 'Community', onPress: () => router.push('/(auth)/email-detect') },
      ],
    },
    {
      title: 'Services',
      items: [
        { label: 'Housing', onPress: () => onNav('services') },
        { label: 'Insurance', onPress: () => onNav('services') },
        { label: 'Discounts', onPress: () => onNav('services') },
        { label: 'Startups', onPress: () => onNav('services') },
      ],
    },
    {
      title: 'Company',
      items: [
        { label: 'About Us', onPress: onContact },
        { label: 'Careers', onPress: onContact },
        { label: 'Press', onPress: onContact },
        { label: 'Contact', onPress: onContact },
      ],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', onPress: onContact },
        { label: 'Terms of Service', onPress: onContact },
        { label: 'Cookie Policy', onPress: onContact },
      ],
    },
  ];

  return (
    <View style={[styles.footerWrap]}>
      <View style={[styles.container, styles.footerInner]}>
        {/* Brand col */}
        <View style={{ flex: 1.4, minWidth: 240, gap: 16 }}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <SALogo size={24} variant="glass" />
            </View>
            <Text style={styles.brandText}>StudentAlumni</Text>
          </View>
          <Text style={styles.footerDesc}>
            The all-in-one platform for students. Events, services, community — everything you need
            to thrive.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            {[TwitterIcon, LinkedInIcon, InstagramIcon, YouTubeIcon].map((Icon, i) => (
              <Pressable
                key={i}
                onPress={onContact}
                style={({ hovered }: any) => [
                  styles.socialBtn,
                  hovered && { backgroundColor: PALETTE.accentSoft, borderColor: PALETTE.accent },
                ]}
              >
                <Icon size={16} color={PALETTE.textMutedOnDark} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Link cols */}
        {cols.map((c) => (
          <View key={c.title} style={{ flex: 1, minWidth: 140, gap: 12 }}>
            <Text style={styles.footerColTitle}>{c.title}</Text>
            {c.items.map((it) => (
              <Pressable key={it.label} onPress={it.onPress}>
                <Text style={styles.footerColLink}>{it.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerCopy}>
          © {new Date().getFullYear()} StudentAlumni. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

// ============================ BUILDING BLOCKS ================================
function SectionHeader({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle: string;
}) {
  const { width } = useWindowDimensions();
  const isMd = width >= 900;
  return (
    <View style={{ alignItems: 'center', marginBottom: 50 }}>
      <Text style={[styles.sectionHeading, { fontSize: isMd ? 48 : 34 }]}>{title}</Text>
      <Text style={[styles.sectionSub, { marginTop: 16, maxWidth: 720, textAlign: 'center' }]}>
        {subtitle}
      </Text>
    </View>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  flex,
}: {
  icon: any;
  title: string;
  desc: string;
  flex: boolean;
}) {
  return (
    <View style={[styles.featureCard, flex && { flex: 1, minWidth: 260 }]}>
      <View style={[styles.iconBubble, { backgroundColor: PALETTE.accentSoft }]}>
        <Icon size={24} color={PALETTE.accentBright} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

function GradientButton({
  label,
  onPress,
  iconRight,
  small,
}: {
  label: string;
  onPress?: () => void;
  iconRight?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.gradBtnWrap,
        small && { borderRadius: 999 },
        hovered && { transform: [{ translateY: -1 }], boxShadow: '0px 12px 30px rgba(95,37,159,0.45)' },
      ]}
    >
      <LinearGradient
        colors={['#9B5BE0', '#5F259F', '#3D1468']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradBtnInner,
          small && { paddingHorizontal: 22, paddingVertical: 11 },
        ]}
      >
        <Text style={[styles.gradBtnText, small && { fontSize: 14 }]}>{label}</Text>
        {iconRight}
      </LinearGradient>
    </Pressable>
  );
}

function OutlineButton({
  label,
  onPress,
  iconRight,
  small,
}: {
  label: string;
  onPress?: () => void;
  iconRight?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.outlineBtn,
        small && { paddingHorizontal: 18, paddingVertical: 10 },
        hovered && { backgroundColor: PALETTE.accentSoft, borderColor: PALETTE.accent },
      ]}
    >
      <Text style={[styles.outlineBtnText, small && { fontSize: 14 }]}>{label}</Text>
      {iconRight}
    </Pressable>
  );
}

// ============================ STYLES =========================================
const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  bgBlobs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  blob: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.5,
    // soft blur on web
    ...({ filter: 'blur(120px)' } as any),
  },

  // ---- Navbar ----
  navWrap: {
    position: ('fixed' as any) || 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    ...({ backdropFilter: 'blur(16px)' } as any),
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    alignSelf: 'center',
    gap: 18,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(123,61,191,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 14px rgba(176,127,223,0.4)',
  },
  brandText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 17, letterSpacing: -0.2 },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...({ cursor: 'pointer' } as any),
  },
  navLinkText: {
    color: PALETTE.textOnDark,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: PALETTE.textOnDark,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    ...({ cursor: 'pointer' } as any),
  },

  // ---- General sections ----
  section: { width: '100%', alignItems: 'center', paddingHorizontal: 24 },
  container: { width: '100%', maxWidth: 1200, alignSelf: 'center' },

  // ---- Hero ----
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.accentSoft,
    borderWidth: 1,
    borderColor: PALETTE.cardBorderGlow,
    marginBottom: 30,
    boxShadow: '0px 0px 22px rgba(176,127,223,0.3)',
  },
  heroPillText: {
    color: PALETTE.accentBright,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  heroHeading: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
    letterSpacing: -2,
  },
  heroSub: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 30,
  },
  heroBtnRow: { flexDirection: 'row', gap: 16, marginTop: 36, alignItems: 'center' },

  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    marginTop: 70,
  },
  statItem: { alignItems: 'center', minWidth: 120 },
  statValue: {
    color: PALETTE.accentBright,
    fontFamily: 'DMSans_700Bold',
    fontSize: 44,
    letterSpacing: -1,
  },
  statLabel: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    marginTop: 4,
  },

  // ---- Section header ----
  sectionHeading: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.2,
  },
  sectionSub: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 26,
  },

  // ---- Card grid ----
  cardGrid: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' as any },
  featureCard: {
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 20,
    padding: 28,
    minHeight: 200,
    gap: 16,
    ...({ backdropFilter: 'blur(10px)' } as any),
    boxShadow: '0px 4px 22px rgba(176,127,223,0.12)',
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  featureDesc: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  learnMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    ...({ cursor: 'pointer' } as any),
  },
  learnMoreText: {
    color: PALETTE.accentBright,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },

  // ---- Events ----
  eventGrid: { gap: 24, justifyContent: 'space-between' },
  eventCard: {
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 20,
    overflow: 'hidden',
    flex: 0,
    flexBasis: 'auto' as any,
    flexShrink: 1,
    flexGrow: 1,
    minWidth: 230,
    boxShadow: '0px 6px 22px rgba(176,127,223,0.16)',
  },
  eventImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#1a0f33',
    position: 'relative',
  },
  eventImage: { width: '100%', height: '100%' },
  eventCategoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(95,37,159,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.6)',
  },
  eventCategoryText: {
    color: '#fff',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  eventTitle: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 19,
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  // ---- CTA ----
  ctaWrap: {
    width: '100%',
    maxWidth: 1200,
    borderRadius: 32,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.4)',
  },
  ctaHeading: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 56,
    lineHeight: 62,
    textAlign: 'center',
    letterSpacing: -1.5,
    marginTop: 24,
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 720,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 999,
    marginTop: 36,
    boxShadow: '0px 8px 20px rgba(0,0,0,0.25)',
    ...({ cursor: 'pointer', transitionDuration: '180ms' } as any),
  },
  ctaButtonText: {
    color: '#0A0420',
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
  },

  // ---- Footer ----
  footerWrap: {
    width: '100%',
    backgroundColor: '#06021A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  footerInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 36,
    paddingBottom: 50,
  },
  footerDesc: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  footerColTitle: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  footerColLink: {
    color: PALETTE.textMutedOnDark,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    paddingVertical: 4,
    ...({ cursor: 'pointer' } as any),
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerCopy: {
    color: PALETTE.textFaint,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },

  // ---- Buttons ----
  gradBtnWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    boxShadow: '0px 6px 24px rgba(176,127,223,0.35)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  gradBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  gradBtnText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(176,127,223,0.5)',
    backgroundColor: 'rgba(176,127,223,0.05)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  outlineBtnText: {
    color: '#fff',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
});
