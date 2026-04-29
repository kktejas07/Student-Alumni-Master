/**
 * Student platform sub-screens — Internships, Courses, Resources (tabbed), Network.
 * Specs: /tmp/ui_specs/platform-student.jsx
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GlassCard, Avatar, SearchBar, PageHeader, SectionLabel, StatusBanner,
} from '../components';
import { SA, SAGradients } from '../tokens';

function TagChip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.chip,
        active && { backgroundColor: SA.white, borderColor: SA.white },
        hovered && !active && { backgroundColor: 'rgba(255,255,255,0.12)' },
      ]}
    >
      <Text style={{
        color: active ? SA.purple : SA.textFaint,
        fontFamily: SA.fontBold,
        fontSize: 13,
      }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryPill({ label, onPress, dark, full }: { label: string; onPress?: () => void; dark?: boolean; full?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.primaryPill,
        full && { flex: 1 },
        dark && { backgroundColor: SA.success },
        hovered && { transform: [{ translateY: -1 }] },
      ]}
    >
      <Text style={{ color: dark ? '#0A2E1A' : SA.purple, fontFamily: SA.fontBold, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function GhostPill({ label, onPress, full }: { label: string; onPress?: () => void; full?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.ghostPill,
        full && { flex: 1 },
        hovered && { backgroundColor: 'rgba(255,255,255,0.14)' },
      ]}
    >
      <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

// ─── INTERNSHIPS ─────────────────────────────────────────────────────────────
export function StudentInternships() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 2 : 1;
  const jobs = [
    { role: 'Product Design Intern', co: 'Swiggy', loc: 'Bangalore', stipend: '₹40K/mo', match: 96, duration: '6 months' },
    { role: 'SWE Intern', co: 'Razorpay', loc: 'Remote', stipend: '₹35K/mo', match: 91, duration: '3 months' },
    { role: 'Data Analyst Intern', co: 'PhonePe', loc: 'Bangalore', stipend: '₹45K/mo', match: 88, duration: '6 months' },
    { role: 'Marketing Intern', co: 'Zomato', loc: 'Gurgaon', stipend: '₹25K/mo', match: 82, duration: '3 months' },
    { role: 'iOS Developer Intern', co: 'CRED', loc: 'Bangalore', stipend: '₹50K/mo', match: 79, duration: '6 months' },
    { role: 'Growth Intern', co: 'Meesho', loc: 'Remote', stipend: '₹30K/mo', match: 76, duration: '3 months' },
  ];
  return (
    <>
      <PageHeader title="Internship Matches 💼" subtitle="48 verified opportunities — ranked by your AI career fit." />
      <View style={[styles.filterRow]}>
        <SearchBar placeholder="Search by role, company, location…" width={260} />
        {['All', 'Remote', 'Bangalore', 'Mumbai', 'Delhi NCR', 'Paid'].map((f, i) => (
          <TagChip key={f} label={f} active={i === 0} />
        ))}
      </View>
      <View style={[styles.grid, { gap: 14 }]}>
        {jobs.map((j, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, paddingRight: i % cols === 0 ? 7 : 0, paddingLeft: i % cols === 1 ? 7 : 0 }}>
            <GlassCard pad={20}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}>
                  <View style={styles.coIcon}><Text style={{ fontSize: 20 }}>🏢</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15 }} numberOfLines={1}>{j.role}</Text>
                    <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{j.co} · {j.loc}</Text>
                  </View>
                </View>
                <View>
                  <Text style={{ color: SA.success, fontFamily: SA.fontBold, fontSize: 16, textAlign: 'right' }}>{j.match}%</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textAlign: 'right' }}>match</Text>
                </View>
              </View>
              <Text style={{ color: SA.textMuted, fontSize: 12, marginBottom: 14 }}>💰 {j.stipend}  ⏱ {j.duration}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryPill label="Apply Now" full />
                <GhostPill label="Save" />
              </View>
            </GlassCard>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── COURSES ─────────────────────────────────────────────────────────────────
export function StudentCourses() {
  const { width } = useWindowDimensions();
  const cols = width >= 1300 ? 3 : width >= 900 ? 2 : 1;
  const courses = [
    { platform: 'Coursera', color: '#4285F4', title: 'Google Data Analytics', level: 'Beginner', hrs: '180 hrs', rating: 4.8, enrolled: '4.2M', tag: 'Analytics' },
    { platform: 'edX', color: '#E44B4B', title: 'CS50: Computer Science', level: 'Beginner', hrs: '100 hrs', rating: 4.9, enrolled: '3.8M', tag: 'Engineering' },
    { platform: 'Udemy', color: '#A435F0', title: 'Complete Python Bootcamp', level: 'Intermediate', hrs: '22 hrs', rating: 4.7, enrolled: '1.1M', tag: 'Engineering' },
    { platform: 'LinkedIn', color: '#0A66C2', title: 'Product Management', level: 'Beginner', hrs: '8 hrs', rating: 4.6, enrolled: '500K', tag: 'Product' },
    { platform: 'Coursera', color: '#4285F4', title: 'UI/UX Design by Google', level: 'Beginner', hrs: '200 hrs', rating: 4.8, enrolled: '2.1M', tag: 'Design' },
    { platform: 'edX', color: '#E44B4B', title: 'MIT: Machine Learning', level: 'Advanced', hrs: '120 hrs', rating: 4.9, enrolled: '800K', tag: 'AI/ML' },
  ];
  return (
    <>
      <PageHeader title="Free Courses 📚" subtitle="Curated from Coursera, edX, Udemy & LinkedIn Learning — free via platform APIs." />
      <View style={styles.filterRow}>
        <SearchBar placeholder="Search courses…" width={260} />
        {['All', 'Design', 'Engineering', 'Product', 'AI/ML', 'Analytics'].map((f, i) => (
          <TagChip key={f} label={f} active={i === 0} />
        ))}
      </View>
      <View style={styles.grid}>
        {courses.map((c, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
            <GlassCard pad={20}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.platformPill, { backgroundColor: c.color + '22', borderColor: c.color + '44' }]}>
                  <Text style={{ color: c.color, fontFamily: SA.fontBold, fontSize: 10, letterSpacing: 0.5 }}>{c.platform}</Text>
                </View>
                <View style={styles.tagPill}><Text style={{ color: SA.textFaint, fontFamily: SA.fontSemi, fontSize: 10 }}>{c.tag}</Text></View>
              </View>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15, lineHeight: 20, marginBottom: 10, minHeight: 42 }}>
                {c.title}
              </Text>
              <Text style={{ color: SA.textFaint, fontSize: 12, marginBottom: 4 }}>⏱ {c.hrs} · {c.level}</Text>
              <Text style={{ color: SA.textFaint, fontSize: 12, marginBottom: 4 }}>⭐ {c.rating} · 👥 {c.enrolled} enrolled</Text>
              <Text style={{ color: SA.success, fontFamily: SA.fontBold, fontSize: 12, marginBottom: 14 }}>FREE via API</Text>
              <PrimaryPill label="Start Learning" full />
            </GlassCard>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── RESOURCES (tabbed) ──────────────────────────────────────────────────────
export function StudentResources() {
  const [tab, setTab] = useState<'insurance' | 'housing' | 'loans'>('insurance');
  return (
    <>
      <PageHeader title="Student Resources 🛡️" subtitle="Practical tools and comparisons to support your academic journey." />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { id: 'insurance', label: '🛡️ Insurance' },
          { id: 'housing', label: '🏠 Housing' },
          { id: 'loans', label: '💰 Loans' },
        ].map((t) => (
          <TagChip key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id as any)} />
        ))}
      </View>
      {tab === 'insurance' && <Insurance />}
      {tab === 'housing' && <Housing />}
      {tab === 'loans' && <Loans />}
    </>
  );
}

function Insurance() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 800 ? 2 : 1;
  const plans = [
    { name: 'Student Health Plus', provider: 'Star Health', price: '₹2,999/yr', cover: '₹5L', features: ['Hospitalization', 'OPD cover', 'Mental health', 'Pre-existing after 2yr'], recommended: true },
    { name: 'Campus Shield', provider: 'HDFC Ergo', price: '₹1,799/yr', cover: '₹3L', features: ['Hospitalization', 'Accidental cover', 'Dental included'] },
    { name: 'Device + Health Pack', provider: 'Bajaj Allianz', price: '₹3,499/yr', cover: '₹5L + device', features: ['Full health', 'Laptop/Phone cover', 'Travel insurance'] },
  ];
  return (
    <View style={styles.grid}>
      {plans.map((p, i) => (
        <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
          <GlassCard pad={22} style={p.recommended ? { borderColor: 'rgba(134,239,172,0.4)', backgroundColor: 'rgba(22,163,74,0.08)' } : undefined}>
            {p.recommended && (
              <Text style={{ color: SA.success, fontFamily: SA.fontBold, fontSize: 10, letterSpacing: 0.8, marginBottom: 10 }}>
                ⭐ RECOMMENDED
              </Text>
            )}
            <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 16, marginBottom: 4 }}>{p.name}</Text>
            <Text style={{ color: SA.textFaint, fontSize: 12, marginBottom: 14 }}>{p.provider}</Text>
            <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 24, marginBottom: 4 }}>{p.price}</Text>
            <Text style={{ color: SA.purplePale, fontSize: 12, marginBottom: 16 }}>Cover up to {p.cover}</Text>
            {p.features.map((f) => (
              <View key={f} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                <Text style={{ color: SA.success }}>✓</Text>
                <Text style={{ color: SA.textMuted, fontSize: 12 }}>{f}</Text>
              </View>
            ))}
            <View style={{ marginTop: 16 }}>
              {p.recommended ? <PrimaryPill label="View Plan" dark full /> : <GhostPill label="View Plan" full />}
            </View>
          </GlassCard>
        </View>
      ))}
    </View>
  );
}

function Housing() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 800 ? 2 : 1;
  const places = [
    { name: 'The Student Hub', type: 'Co-living', price: '₹8,000/mo', dist: '0.5 km from campus', amenities: ['WiFi', 'Meals', 'Laundry', 'AC room'] },
    { name: 'Nestaway PG', type: 'PG', price: '₹5,500/mo', dist: '1.2 km from campus', amenities: ['WiFi', 'Meals', 'Power backup'] },
    { name: 'Oyo Life Rooms', type: 'Hostel', price: '₹4,200/mo', dist: '2 km from campus', amenities: ['WiFi', 'Housekeeping', 'Security'] },
  ];
  return (
    <View style={styles.grid}>
      {places.map((h, i) => (
        <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
          <GlassCard pad={20}>
            <LinearGradient
              colors={['rgba(95,37,159,0.3)', 'rgba(123,61,191,0.3)'] as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.housingHeader}
            >
              <Text style={{ fontSize: 32 }}>🏠</Text>
            </LinearGradient>
            <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15, marginBottom: 4 }}>{h.name}</Text>
            <Text style={{ color: SA.textFaint, fontSize: 12, marginBottom: 10 }}>{h.type} · {h.dist}</Text>
            <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 20, marginBottom: 12 }}>{h.price}</Text>
            {h.amenities.map((a) => (
              <View key={a} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: SA.purplePale }}>✓</Text>
                <Text style={{ color: SA.textMuted, fontSize: 12 }}>{a}</Text>
              </View>
            ))}
            <View style={{ marginTop: 14 }}>
              <GhostPill label="View Details" full />
            </View>
          </GlassCard>
        </View>
      ))}
    </View>
  );
}

function Loans() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 800 ? 2 : 1;
  const loans = [
    { bank: 'SBI Education Loan', rate: '7.5%', max: '₹20L', eligible: true, emi: '₹18,500/mo', moratorium: '1 year post-study' },
    { bank: 'HDFC Credila', rate: '9.25%', max: '₹50L', eligible: true, emi: '₹22,000/mo', moratorium: '6 months' },
    { bank: 'Axis Bank', rate: '10.5%', max: '₹15L', eligible: false, emi: '₹19,000/mo', moratorium: '6 months' },
  ];
  return (
    <>
      <StatusBanner type="info" msg="AI-powered eligibility check — results based on your profile (CGPA 8.2, no existing loans)" />
      <View style={styles.grid}>
        {loans.map((l, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
            <GlassCard pad={22} style={l.eligible ? undefined : { borderColor: 'rgba(252,165,165,0.2)', backgroundColor: 'rgba(220,38,38,0.05)' }}>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15, marginBottom: 12 }}>{l.bank}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Interest Rate</Text>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 20 }}>{l.rate}</Text>
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 3 }}>Max Loan</Text>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 20 }}>{l.max}</Text>
                </View>
              </View>
              <Text style={{ color: SA.textMuted, fontSize: 12, marginBottom: 4 }}>EMI: {l.emi} · Moratorium: {l.moratorium}</Text>
              {l.eligible
                ? <StatusBanner type="success" msg="You're eligible for this loan" />
                : <StatusBanner type="error" msg="CGPA requirement not met" />}
              {l.eligible
                ? <PrimaryPill label="Apply Now" full />
                : <View style={[styles.disabledPill]}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontFamily: SA.fontBold, fontSize: 12 }}>Apply Now</Text>
                  </View>}
            </GlassCard>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── NETWORK ────────────────────────────────────────────────────────────────
export function StudentNetwork() {
  const { width } = useWindowDimensions();
  const cols = width >= 1300 ? 3 : width >= 900 ? 2 : 1;
  const mentors = [
    { av: 'PS', name: 'Priya Singh', role: 'Product Manager', co: 'Google', batch: '2022', rating: 4.9, sessions: 42, expertise: ['Product', 'Strategy', 'Growth'] },
    { av: 'AK', name: 'Arun Kumar', role: 'SWE II', co: 'Microsoft', batch: '2021', rating: 4.8, sessions: 28, expertise: ['DSA', 'System Design', 'Java'] },
    { av: 'VG', name: 'Vikram Gupta', role: 'Founder', co: 'TechStart', batch: '2020', rating: 4.9, sessions: 61, expertise: ['Entrepreneurship', 'Fundraising'] },
    { av: 'MR', name: 'Meera Rao', role: 'UX Designer', co: 'Swiggy', batch: '2022', rating: 4.7, sessions: 19, expertise: ['Figma', 'Research', 'UI'] },
    { av: 'NP', name: 'Nisha Patel', role: 'Data Scientist', co: 'Amazon', batch: '2021', rating: 4.8, sessions: 35, expertise: ['Python', 'ML', 'Statistics'] },
    { av: 'RV', name: 'Ravi Verma', role: 'Marketing Lead', co: 'PhonePe', batch: '2020', rating: 4.6, sessions: 22, expertise: ['Growth', 'Branding', 'Analytics'] },
  ];
  return (
    <>
      <PageHeader title="Alumni Network 👥" subtitle="Connect with alumni, find mentors, and build your professional network." />
      <View style={styles.grid}>
        {mentors.map((m, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
            <GlassCard pad={20}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <Avatar initials={m.av} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15 }}>{m.name}</Text>
                  <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }}>{m.role} · {m.co}</Text>
                  <Text style={{ color: SA.purpleLight, fontSize: 11, marginTop: 2 }}>Batch {m.batch} · ⭐ {m.rating} · {m.sessions} sessions</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {m.expertise.map((e) => (
                  <View key={e} style={styles.expertiseChip}>
                    <Text style={{ color: SA.purplePale, fontFamily: SA.fontSemi, fontSize: 11 }}>{e}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryPill label="Book Session" full />
                <GhostPill label="Message" />
              </View>
            </GlassCard>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  primaryPill: {
    backgroundColor: SA.white,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  ghostPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  disabledPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  coIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  platformPill: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  tagPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  housingHeader: {
    height: 80, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  expertiseChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(176,127,223,0.15)',
    borderWidth: 1, borderColor: 'rgba(176,127,223,0.25)',
  },
});
