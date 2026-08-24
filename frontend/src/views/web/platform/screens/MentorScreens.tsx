/**
 * Mentor platform sub-screens — Students, Sessions, Post Jobs, Analytics.
 * Specs: /tmp/ui_specs/platform-mentor.jsx
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { GlassCard, Avatar, PageHeader, SectionLabel, ProgressStrip, KpiTile } from '../components';
import { SA, SAGradients } from '../tokens';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

function PrimaryPill({ label, onPress, full }: { label: string; onPress?: () => void; full?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        { backgroundColor: SA.white, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', ...({ cursor: 'pointer' } as any) },
        full && { flex: 1 },
        hovered && { transform: [{ translateY: -1 }] },
      ]}
    >
      <Text style={{ color: SA.purple, fontFamily: SA.fontBold, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
function GhostPill({ label, onPress, full }: { label: string; onPress?: () => void; full?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, alignItems: 'center', ...({ cursor: 'pointer' } as any) },
        full && { flex: 1 },
        hovered && { backgroundColor: 'rgba(255,255,255,0.14)' },
      ]}
    >
      <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

// ─── STUDENTS ──────────────────────────────────────────────────────────────────────────
export function MentorStudents() {
  const { width } = useWindowDimensions();
  const cols = width >= 1300 ? 3 : width >= 900 ? 2 : 1;
  const list = [
    { av: 'RS', name: 'Rahul Sharma', batch: '2022', goal: 'Product Design', sessions: 4, status: 'On Track', progress: 68 },
    { av: 'DM', name: 'Divya Mehta', batch: '2022', goal: 'Business Analyst', sessions: 6, status: 'Placed ✓', progress: 100 },
    { av: 'AK', name: 'Ankit Kumar', batch: '2023', goal: 'Software Eng', sessions: 2, status: 'In Progress', progress: 35 },
    { av: 'NM', name: 'Neha Mehta', batch: '2022', goal: 'Product Manager', sessions: 5, status: 'On Track', progress: 72 },
    { av: 'SK', name: 'Suraj Kumar', batch: '2023', goal: 'Data Science', sessions: 3, status: 'In Progress', progress: 45 },
    { av: 'SJ', name: 'Sneha Joshi', batch: '2023', goal: 'UX Design', sessions: 1, status: 'Just Started', progress: 15 },
  ];
  return (
    <>
      <PageHeader title="My Students 🎓" subtitle="12 active mentees across batches 2021–2023." />
      <View style={styles.grid}>
        {list.map((s, i) => {
          const placed = s.status.includes('Placed');
          const statusColor = placed ? SA.success : s.status === 'On Track' ? SA.purpleLight : SA.textFaint;
          return (
            <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
              <GlassCard pad={20}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                  <Avatar initials={s.av} size={44} gradient={SAGradients.green} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }}>{s.name}</Text>
                    <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }}>Batch {s.batch} · {s.sessions} sessions</Text>
                    <Text style={{ color: statusColor, fontFamily: SA.fontSemi, fontSize: 11, marginTop: 3 }}>{s.status}</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 }}>Goal: {s.goal}</Text>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 14 }}>
                  <View style={{ width: `${s.progress}%` as any, height: '100%', backgroundColor: placed ? SA.success : SA.purpleLight, borderRadius: 2 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <GhostPill label="Message" full />
                  <PrimaryPill label="Schedule" full />
                </View>
              </GlassCard>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ─── SESSIONS ──────────────────────────────────────────────────────────────────────
export function MentorSessions() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const user = useAuthStore((s) => s.user);
  const [bookings, setBookings] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    api.myBookings().then((r) => setBookings(r.bookings || [])).catch(() => {});
  }, [user]);

  const upcoming = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const sample = [
    { name: 'Rahul Sharma', date: 'Today', time: '4:00 – 4:45 PM', topic: 'Career path & portfolio review' },
    { name: 'Ankit Kumar', date: 'Tomorrow', time: '11:00 – 11:30 AM', topic: 'Resume & LinkedIn review' },
    { name: 'Sneha Joshi', date: 'Dec 3', time: '3:00 – 4:00 PM', topic: 'Mock PM interview' },
    { name: 'Neha Mehta', date: 'Dec 5', time: '6:00 – 6:45 PM', topic: 'Case study walkthrough' },
  ];
  const list = upcoming.length ? upcoming.map((b) => ({
    name: b.student_name || 'Student',
    date: b.scheduled_at?.split(' ')[0] || 'TBD',
    time: b.scheduled_at?.split(' ')[1] || '',
    topic: b.topic || 'Career session',
  })) : sample;

  return (
    <>
      <PageHeader title="Sessions 📅" subtitle="Manage your upcoming and past mentoring sessions." />
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <GlassCard pad={24} style={{ flex: 1 }}>
          <SectionLabel>UPCOMING SESSIONS</SectionLabel>
          {list.map((s, i) => (
            <View key={i} style={styles.sessionRow}>
              <View style={styles.sessionDate}>
                <Text style={{ color: SA.purpleLight, fontFamily: SA.fontBold, fontSize: 11, textTransform: 'uppercase' }}>
                  {(s.date || '').split(' ')[0] || 'TBD'}
                </Text>
                {s.date?.includes(' ') && (
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 20 }}>{s.date.split(' ')[1]}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }}>{s.name}</Text>
                <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {s.time ? `${s.time} · ${s.topic}` : s.topic}
                </Text>
              </View>
              <PrimaryPill label="Join" />
            </View>
          ))}
        </GlassCard>
        <View style={{ width: isWide ? 300 : '100%', gap: 14 }}>
          <GlassCard pad={20}>
            <SectionLabel>SESSION STATS</SectionLabel>
            {[
              { l: 'Total sessions', v: String(bookings.length || 42) },
              { l: 'Hours mentored', v: '38 hrs' },
              { l: 'Avg rating', v: '⭐ 4.9' },
              { l: 'No-shows', v: '2' },
            ].map((s) => (
              <View key={s.l} style={styles.statRow}>
                <Text style={{ color: SA.textFaint, fontSize: 13 }}>{s.l}</Text>
                <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }}>{s.v}</Text>
              </View>
            ))}
          </GlassCard>
          <GlassCard pad={20}>
            <SectionLabel>AVAILABILITY</SectionLabel>
            {['Mon 4–7 PM', 'Wed 5–8 PM', 'Fri 3–6 PM', 'Sat 10 AM–1 PM'].map((d) => (
              <View key={d} style={styles.availRow}>
                <Text style={{ color: SA.textMuted, fontSize: 13 }}>{d}</Text>
                <View style={styles.toggleOn}>
                  <View style={styles.toggleKnob} />
                </View>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>
    </>
  );
}

// ─── POST JOBS ──────────────────────────────────────────────────────────────────────
export function MentorPostJobs() {
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 2 : 1;
  const jobs = [
    { role: 'Product Design Intern', co: 'Swiggy', loc: 'Bangalore', stipend: '₹40K/mo', applicants: 12, posted: '2 days ago', active: true },
    { role: 'PM Associate', co: 'Swiggy', loc: 'Bangalore', salary: '₹18–22 LPA', applicants: 8, posted: '1 week ago', active: true },
    { role: 'UX Researcher', co: 'Swiggy', loc: 'Remote', salary: '₹12–16 LPA', applicants: 5, posted: '2 weeks ago', active: false },
  ];
  return (
    <>
      <PageHeader title="Post Opportunities 💼" subtitle="Share job and internship opportunities from your network." />
      <View style={styles.grid}>
        {jobs.map((j, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
            <GlassCard pad={20}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 15 }}>{j.role}</Text>
                  <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 3 }}>{j.co} · {j.loc}</Text>
                </View>
                <View style={[styles.statusPill, j.active ? styles.activePill : styles.closedPill]}>
                  <Text style={{ fontSize: 10, fontFamily: SA.fontBold, color: j.active ? SA.success : 'rgba(255,255,255,0.35)', letterSpacing: 0.4 }}>
                    {j.active ? 'ACTIVE' : 'CLOSED'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: SA.textMuted, fontSize: 13, marginBottom: 12 }}>
                💰 {j.stipend || j.salary} · 👥 {j.applicants} applicants · {j.posted}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <GhostPill label="View Applicants" full />
                <GhostPill label="Edit" />
              </View>
            </GlassCard>
          </View>
        ))}
        <View style={{ width: `${100 / cols}%` as any, padding: 7 }}>
          <Pressable
            style={({ hovered }: any) => [
              styles.dashedCard,
              hovered && { backgroundColor: 'rgba(255,255,255,0.04)' },
            ]}
          >
            <Text style={{ fontSize: 36, opacity: 0.3 }}>+</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: SA.fontBold, fontSize: 14, marginTop: 6 }}>
              Post New Opportunity
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280 }}>
              Share a job or internship from your company or network
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────────
export function MentorAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  return (
    <>
      <PageHeader title="Analytics 📊" subtitle="Your impact as a mentor, measured." />
      <View style={[styles.kpiRow, !isWide && { flexDirection: 'column' }]}>
        <KpiTile emoji="🎓" label="Students Mentored" value="12" note="Total lifetime" noteColor={SA.purplePale} />
        <KpiTile emoji="✅" label="Placement Rate" value="67%" note="8 of 12 placed" />
        <KpiTile emoji="⭐" label="Avg Rating" value="4.9" note="From 38 reviews" noteColor={SA.warn} />
        <KpiTile emoji="⏱" label="Hours Mentored" value="38h" note="Across 42 sessions" noteColor={SA.purplePale} />
      </View>
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <GlassCard pad={24} style={{ flex: 1 }}>
          <SectionLabel>MENTEE OUTCOMES</SectionLabel>
          {[
            { name: 'Placed at top company', count: 8, pct: 67 },
            { name: 'Got internship offer', count: 10, pct: 83 },
            { name: 'Completed career switch', count: 4, pct: 33 },
            { name: 'Started own venture', count: 2, pct: 17 },
          ].map((o) => (
            <ProgressStrip
              key={o.name}
              label={o.name}
              pct={o.pct}
              rightLabel={`${o.count} students (${o.pct}%)`}
              gradient={SAGradients.green}
            />
          ))}
        </GlassCard>
        <View style={{ width: isWide ? 300 : '100%' }}>
          <GlassCard pad={20}>
            <SectionLabel>RECENT REVIEWS</SectionLabel>
            {[
              { av: 'RS', name: 'Rahul S.', rating: 5, text: "Priya's guidance completely changed my career trajectory." },
              { av: 'DM', name: 'Divya M.', rating: 5, text: 'Got my first internship within 2 weeks of our session!' },
            ].map((r, i, arr) => (
              <View key={i} style={{ paddingVertical: 12, borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: i < arr.length - 1 ? 1 : 0 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <Avatar initials={r.av} size={32} gradient={SAGradients.green} />
                  <View>
                    <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 12 }}>{r.name}</Text>
                    <Text style={{ color: SA.warn, fontSize: 11 }}>{'⭐'.repeat(r.rating)}</Text>
                  </View>
                </View>
                <Text style={{ color: SA.textMuted, fontSize: 12, lineHeight: 17 }}>{r.text}</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  split: { flexDirection: 'row', gap: 20 },
  kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
    borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1,
  },
  sessionDate: { width: 50, alignItems: 'center' },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  availRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  toggleOn: {
    width: 36, height: 20, borderRadius: 10, backgroundColor: SA.success,
    paddingHorizontal: 2, alignItems: 'flex-end', justifyContent: 'center',
  },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: SA.white },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  activePill: { backgroundColor: 'rgba(22,163,74,0.2)', borderColor: 'rgba(134,239,172,0.4)' },
  closedPill: { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' },
  dashedCard: {
    borderWidth: 1, borderStyle: 'dashed' as any, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16, padding: 30, alignItems: 'center', justifyContent: 'center',
    minHeight: 160, gap: 4,
    ...({ cursor: 'pointer' } as any),
  },
});
