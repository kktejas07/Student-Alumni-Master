/**
 * College platform sub-screens — Students, Alumni, Programs, Analytics, Settings.
 * Specs: /tmp/ui_specs/platform-college.jsx
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, Avatar, SearchBar, PageHeader, SectionLabel, ProgressStrip, KpiTile } from '../components';
import { SA, SAGradients } from '../tokens';

function TagChip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.chip, active && { backgroundColor: SA.white, borderColor: SA.white },
        hovered && !active && { backgroundColor: 'rgba(255,255,255,0.12)' },
      ]}
    >
      <Text style={{ color: active ? SA.purple : SA.textFaint, fontFamily: SA.fontBold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export function CollegeStudents() {
  const { width } = useWindowDimensions();
  const cols = width >= 1300 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const list = [
    { name: 'Rahul Sharma', dept: 'CSE', batch: '2022', cgpa: '8.2', status: 'Placed', co: 'Swiggy' },
    { name: 'Priya Singh', dept: 'CSE', batch: '2022', cgpa: '9.1', status: 'Offer', co: 'Google' },
    { name: 'Arun Kumar', dept: 'ECE', batch: '2022', cgpa: '7.8', status: 'Placed', co: 'Microsoft' },
    { name: 'Meera Rao', dept: 'CSE', batch: '2023', cgpa: '8.8', status: 'Active', co: '—' },
    { name: 'Vikram Gupta', dept: 'Mech', batch: '2022', cgpa: '7.5', status: 'Placed', co: 'Tata' },
    { name: 'Nisha Patel', dept: 'CSE', batch: '2023', cgpa: '9.3', status: 'Active', co: '—' },
    { name: 'Ravi Verma', dept: 'Civil', batch: '2022', cgpa: '7.2', status: 'Placed', co: 'L&T' },
    { name: 'Sneha Joshi', dept: 'CSE', batch: '2024', cgpa: '8.6', status: 'Active', co: '—' },
  ];
  return (
    <>
      <PageHeader title="Student Management 🎓" subtitle="4,820 enrolled students across all departments." />
      <View style={styles.filterRow}>
        <SearchBar placeholder="Search by name, roll no, department…" width={280} />
        {['All Batches', '2022', '2023', '2024', '2025'].map((f, i) => (
          <TagChip key={f} label={f} active={i === 0} />
        ))}
      </View>
      <View style={styles.grid}>
        {list.map((s, i) => {
          const inits = s.name.split(' ').map((p) => p[0]).join('').toUpperCase();
          const status = s.status;
          const sBg = status === 'Placed' ? 'rgba(22,163,74,0.2)' : status === 'Offer' ? 'rgba(217,119,6,0.2)' : 'rgba(255,255,255,0.07)';
          const sBd = status === 'Placed' ? 'rgba(134,239,172,0.4)' : status === 'Offer' ? 'rgba(252,211,77,0.4)' : 'rgba(255,255,255,0.1)';
          const sFg = status === 'Placed' ? SA.success : status === 'Offer' ? SA.warn : SA.textFaint;
          return (
            <View key={i} style={{ width: `${100 / cols}%` as any, padding: 6 }}>
              <GlassCard pad={16}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <Avatar initials={inits} size={36} gradient={SAGradients.blue} />
                  <View style={[styles.statusPill, { backgroundColor: sBg, borderColor: sBd }]}>
                    <Text style={{ color: sFg, fontFamily: SA.fontBold, fontSize: 10, letterSpacing: 0.4 }}>
                      {status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13, marginBottom: 2 }}>{s.name}</Text>
                <Text style={{ color: SA.textFaint, fontSize: 11, marginBottom: 2 }}>{s.dept} · Batch {s.batch}</Text>
                <Text style={{ color: SA.purpleLight, fontFamily: SA.fontSemi, fontSize: 11 }}>CGPA: {s.cgpa}</Text>
                {s.co !== '—' && (
                  <Text style={{ color: SA.success, fontSize: 11, marginTop: 2 }}>→ {s.co}</Text>
                )}
              </GlassCard>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ─── ALUMNI ─────────────────────────────────────────────────────────────────────
export function CollegeAlumni() {
  const { width } = useWindowDimensions();
  const cols3 = width >= 1100 ? 3 : width >= 800 ? 2 : 1;
  return (
    <>
      <PageHeader title="Alumni Engagement 🤝" subtitle="12,400 alumni registered. 520 active as mentors." />
      <View style={[styles.kpiRow]}>
        {[
          { emoji: '🌍', label: 'Countries', val: '48', sub: 'Alumni spread globally' },
          { emoji: '🤝', label: 'Mentors', val: '520', sub: 'Actively mentoring students' },
          { emoji: '💼', label: 'Jobs Posted', val: '1,240', sub: 'Opportunities shared' },
        ].map((c) => (
          <GlassCard key={c.label} pad={20} style={{ flex: 1, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 32 }}>{c.emoji}</Text>
            <View>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 24 }}>{c.val}</Text>
              <Text style={{ color: SA.textFaint, fontSize: 11, marginTop: 2 }}>{c.label} · {c.sub}</Text>
            </View>
          </GlassCard>
        ))}
      </View>

      <GlassCard pad={24}>
        <SectionLabel>TOP ALUMNI MENTORS</SectionLabel>
        <View style={styles.grid}>
          {[
            { av: 'PS', name: 'Priya Singh', batch: '2018', role: 'PM @ Google', sessions: 42, rating: 4.9 },
            { av: 'AK', name: 'Arun Kumar', batch: '2019', role: 'SWE @ Microsoft', sessions: 28, rating: 4.8 },
            { av: 'VG', name: 'Vikram Gupta', batch: '2017', role: 'Founder', sessions: 61, rating: 4.9 },
            { av: 'MR', name: 'Meera Rao', batch: '2020', role: 'Designer @ Swiggy', sessions: 19, rating: 4.7 },
            { av: 'NP', name: 'Nisha Patel', batch: '2019', role: 'Data Sci @ Amazon', sessions: 35, rating: 4.8 },
            { av: 'RV', name: 'Ravi Verma', batch: '2018', role: 'Marketing @ PhonePe', sessions: 22, rating: 4.6 },
          ].map((m, i) => (
            <View key={i} style={{ width: `${100 / cols3}%` as any, padding: 6 }}>
              <GlassCard pad={16}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <Avatar initials={m.av} size={38} gradient={SAGradients.blue} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }}>{m.name}</Text>
                    <Text style={{ color: SA.textFaint, fontSize: 11 }} numberOfLines={1}>{m.role} · Batch {m.batch}</Text>
                  </View>
                </View>
                <Text style={{ color: SA.purpleLight, fontFamily: SA.fontSemi, fontSize: 11 }}>⭐ {m.rating} · {m.sessions} sessions</Text>
              </GlassCard>
            </View>
          ))}
        </View>
      </GlassCard>
    </>
  );
}

// ─── PROGRAMS ──────────────────────────────────────────────────────────────────
export function CollegePrograms() {
  const { width } = useWindowDimensions();
  const cols = width >= 1300 ? 3 : width >= 800 ? 2 : 1;
  const list = [
    { name: 'B.Tech Computer Science', dept: 'CSE', students: 490, faculty: 42, placed: '98%', duration: '4 years' },
    { name: 'B.Tech Electronics', dept: 'ECE', students: 280, faculty: 38, placed: '95%', duration: '4 years' },
    { name: 'B.Tech Mechanical', dept: 'Mech', students: 250, faculty: 35, placed: '88%', duration: '4 years' },
    { name: 'M.Tech CSE', dept: 'CSE PG', students: 120, faculty: 28, placed: '99%', duration: '2 years' },
    { name: 'MBA Technology', dept: 'Management', students: 180, faculty: 22, placed: '96%', duration: '2 years' },
    { name: 'Ph.D. Programs', dept: 'Research', students: 340, faculty: 80, placed: 'N/A', duration: '3–5 years' },
  ];
  return (
    <>
      <PageHeader title="Programs 📋" subtitle="Manage departments, courses, and academic programs." />
      <View style={styles.grid}>
        {list.map((p, i) => (
          <View key={i} style={{ width: `${100 / cols}%` as any, padding: 7 }}>
            <GlassCard pad={20}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: SA.fontBold, fontSize: 10, letterSpacing: 0.8, marginBottom: 8 }}>
                {p.dept.toUpperCase()} · {p.duration.toUpperCase()}
              </Text>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 16, lineHeight: 20, marginBottom: 14 }}>{p.name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { l: 'Students', v: String(p.students) },
                  { l: 'Faculty', v: String(p.faculty) },
                  { l: 'Placement', v: p.placed },
                ].map((s) => (
                  <View key={s.l} style={{ flex: 1, minWidth: 80 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginBottom: 2 }}>{s.l}</Text>
                    <Text style={{ color: s.v.includes('%') ? SA.success : SA.white, fontFamily: SA.fontBold, fontSize: 15 }}>{s.v}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────────
export function CollegeAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  return (
    <>
      <PageHeader title="Analytics 📈" subtitle="Real-time data and trends for your institution." />
      <View style={[styles.kpiRow]}>
        <KpiTile emoji="📈" label="Platform Engagement" value="78%" note="↑ 12% vs last semester" />
        <KpiTile emoji="🎯" label="Career Score (avg)" value="72/100" note="Above national avg" noteColor={SA.purplePale} />
        <KpiTile emoji="💼" label="Internship Rate" value="89%" note="3rd year students" />
        <KpiTile emoji="🏆" label="NPS Score" value="72" note="Student satisfaction" noteColor={SA.warn} />
      </View>
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <GlassCard pad={24} style={{ flex: 1 }}>
          <SectionLabel>YEAR-ON-YEAR PLACEMENT TRENDS</SectionLabel>
          <View style={styles.barChart}>
            {[
              { year: '2020', pct: 82 },
              { year: '2021', pct: 87 },
              { year: '2022', pct: 89 },
              { year: '2023', pct: 91 },
              { year: '2024', pct: 94 },
            ].map((d) => (
              <View key={d.year} style={styles.barCol}>
                <Text style={{ color: SA.purplePale, fontFamily: SA.fontBold, fontSize: 11 }}>{d.pct}%</Text>
                <LinearGradient
                  colors={['#7B3DBF', 'rgba(95,37,159,0.4)'] as any}
                  style={{ width: '100%', height: `${d.pct}%` as any, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}
                />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: SA.fontSemi, fontSize: 10 }}>{d.year}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
        <GlassCard pad={24} style={{ flex: 1 }}>
          <SectionLabel>STUDENT PLATFORM USAGE</SectionLabel>
          {[
            { label: 'Career Path (AI)', pct: 78, gradient: SAGradients.purple },
            { label: 'Internship Search', pct: 89, gradient: SAGradients.green },
            { label: 'Course Enrolment', pct: 65, gradient: SAGradients.blue },
            { label: 'Mentor Sessions', pct: 42, gradient: SAGradients.copper },
            { label: 'Resources (insurance etc.)', pct: 34, gradient: SAGradients.purple },
          ].map((s) => (
            <ProgressStrip key={s.label} label={s.label} pct={s.pct} gradient={s.gradient} />
          ))}
        </GlassCard>
      </View>
    </>
  );
}

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
export function CollegeSettings() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const fields = [
    { label: 'Institution Name', val: 'IIT Bombay' },
    { label: 'Type', val: 'Technical University' },
    { label: 'Location', val: 'Mumbai, Maharashtra' },
    { label: 'NAAC Grade', val: 'A++' },
    { label: 'NIRF Rank', val: '#3 (Engineering)' },
    { label: 'Admin Email', val: 'admin@iitb.ac.in' },
  ];
  const [notifs, setNotifs] = useState([
    { label: 'Weekly placement reports', on: true },
    { label: 'New alumni registrations', on: true },
    { label: 'Campus drive reminders', on: true },
    { label: 'Student milestone alerts', on: false },
  ]);
  const integrations = [
    { name: 'Coursera API', status: 'Connected', emoji: '✓' },
    { name: 'LinkedIn API', status: 'Connected', emoji: '✓' },
    { name: 'edX API', status: 'Connected', emoji: '✓' },
    { name: 'Internshala API', status: 'Pending', emoji: '⏳' },
  ];
  return (
    <>
      <PageHeader title="Settings ⚙️" subtitle="Manage your institution's profile, integrations, and preferences." />
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <GlassCard pad={24} style={{ flex: 1 }}>
          <SectionLabel>INSTITUTION PROFILE</SectionLabel>
          {fields.map((f) => (
            <View key={f.label} style={styles.statRow}>
              <Text style={{ color: SA.textFaint, fontSize: 12 }}>{f.label}</Text>
              <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 13 }}>{f.val}</Text>
            </View>
          ))}
          <Pressable
            style={({ hovered }: any) => [{
              backgroundColor: SA.white, marginTop: 16,
              paddingVertical: 10, borderRadius: 10, alignItems: 'center',
              ...({ cursor: 'pointer' } as any),
            }, hovered && { transform: [{ translateY: -1 }] }]}
          >
            <Text style={{ color: SA.purple, fontFamily: SA.fontBold, fontSize: 13 }}>Edit Profile</Text>
          </Pressable>
        </GlassCard>
        <View style={{ flex: 1, gap: 14 }}>
          <GlassCard pad={20}>
            <SectionLabel>API INTEGRATIONS</SectionLabel>
            {integrations.map((a) => (
              <View key={a.name} style={styles.intRow}>
                <Text style={{ color: a.status === 'Connected' ? SA.success : SA.warn, fontSize: 14 }}>{a.emoji}</Text>
                <Text style={{ flex: 1, color: SA.white, fontFamily: SA.fontMedium, fontSize: 13 }}>{a.name}</Text>
                <Text style={{ color: a.status === 'Connected' ? SA.success : SA.warn, fontFamily: SA.fontBold, fontSize: 11 }}>{a.status.toUpperCase()}</Text>
              </View>
            ))}
          </GlassCard>
          <GlassCard pad={20}>
            <SectionLabel>NOTIFICATIONS</SectionLabel>
            {notifs.map((n, i) => (
              <View key={n.label} style={styles.intRow}>
                <Text style={{ flex: 1, color: SA.textMuted, fontSize: 13 }}>{n.label}</Text>
                <Pressable onPress={() => setNotifs((p) => p.map((x, j) => j === i ? { ...x, on: !x.on } : x))}>
                  <View style={[styles.toggle, n.on ? { backgroundColor: SA.success } : { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <View style={[styles.toggleKnob, n.on ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]} />
                  </View>
                </Pressable>
              </View>
            ))}
          </GlassCard>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...({ cursor: 'pointer' } as any),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const },
  split: { flexDirection: 'row', gap: 20 },
  barChart: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
    height: 160, paddingHorizontal: 8, paddingTop: 14,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%' as any, justifyContent: 'flex-end' },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1,
  },
  intRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 9,
    borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1,
  },
  toggle: {
    width: 36, height: 20, borderRadius: 10, padding: 2,
  },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: SA.white },
});
