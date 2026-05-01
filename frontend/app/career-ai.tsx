/**
 * /career-ai — SA Career AI standalone page.
 * Matches SA Career AI.html artifact: personalised roadmap, train with AI,
 * build-your-profile cards.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { Sparkles, Target, TrendingUp, BookOpen, Play, Check } from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const ROADMAP = [
  { step: 1, title: 'Foundations', desc: 'Python + DSA + Git', status: 'done' },
  { step: 2, title: 'Frontend Mastery', desc: 'React, TypeScript, Tailwind', status: 'done' },
  { step: 3, title: 'Backend & APIs', desc: 'Node, FastAPI, PostgreSQL', status: 'active' },
  { step: 4, title: 'System Design', desc: 'Scalability, caching, queues', status: 'upcoming' },
  { step: 5, title: 'Interview Prep', desc: 'Mock rounds · LeetCode Top 150', status: 'upcoming' },
  { step: 6, title: 'First Offer', desc: 'Land your first ₹12 LPA+ role', status: 'upcoming' },
];

const TRAINERS = [
  { title: 'Resume AI', sub: 'Rewrites your resume line-by-line with impact statements.', Icon: BookOpen, color: '#A78BFA' },
  { title: 'Interview AI', sub: 'Live mock interviews with personalised feedback.', Icon: Target, color: '#34D399' },
  { title: 'Aptitude AI', sub: 'Adaptive quizzes based on your weak areas.', Icon: TrendingUp, color: '#F472B6' },
];

export default function CareerAIPage() {
  return (
    <FeaturePageShell
      title="AI Career Roadmap"
      subtitle="Online · Personalised for you — based on your profile, skills, and goals"
      heroEmoji="🧠"
      accent="#A78BFA"
      rightSlot={<View style={s.onlinePill}><View style={s.dot} /><Text style={s.onlinePillText}>AI Online</Text></View>}
    >
      <View style={s.heroStats}>
        {[{ k: '42%', v: 'Career Score' }, { k: '48', v: 'Matches' }, { k: '5', v: 'Mentors' }, { k: '12', v: 'Skills Verified' }].map((x, i) => (
          <View key={i} style={s.stat}><Text style={s.statK}>{x.k}</Text><Text style={s.statV}>{x.v}</Text></View>
        ))}
      </View>

      <Text style={s.kicker}>YOUR ROADMAP — PERSONALISED</Text>
      <View style={s.roadmap}>
        {ROADMAP.map((r, i) => (
          <View key={i} style={[s.step, r.status === 'active' && s.stepActive]}>
            <View style={[s.stepNo, r.status === 'done' && { backgroundColor: '#10B981' }, r.status === 'active' && { backgroundColor: '#7C3AED' }]}>
              {r.status === 'done' ? <Check size={14} color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 }}>{r.step}</Text>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.stepTitle}>{r.title}</Text>
              <Text style={s.stepDesc}>{r.desc}</Text>
            </View>
            {r.status === 'active' && <Pressable style={s.viewPlan}><Text style={s.viewPlanText}>View Plan →</Text></Pressable>}
          </View>
        ))}
      </View>

      <Text style={s.kicker}>TRAIN WITH AI</Text>
      <View style={s.grid}>
        {TRAINERS.map((t, i) => (
          <View key={i} style={s.trainer}>
            <View style={[s.trainerIcon, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}><t.Icon size={18} color={t.color} /></View>
            <Text style={s.trainerTitle}>{t.title}</Text>
            <Text style={s.trainerSub}>{t.sub}</Text>
            <Pressable style={s.trainerBtn}><Play size={12} color="#fff" /><Text style={s.trainerBtnText}>Start now</Text></Pressable>
          </View>
        ))}
      </View>

      <View style={s.buildCard}>
        <Sparkles size={20} color="#FCD34D" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.buildTitle}>Build Your Profile</Text>
          <Text style={s.buildSub}>Complete your profile to 100% to unlock Career AI Pro features, resume reviews, and mentor matching.</Text>
        </View>
        <Pressable style={s.trainerBtn}><Text style={s.trainerBtnText}>Go to Profile</Text></Pressable>
      </View>
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.45)', borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  onlinePillText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  heroStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  statK: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 22 },
  statV: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },
  roadmap: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  stepActive: { backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.35)' },
  stepNo: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  stepDesc: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  viewPlan: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#7C3AED' },
  viewPlanText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  trainer: { flex: 1, minWidth: 240, padding: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 8 },
  trainerIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  trainerTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  trainerSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  trainerBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 9, backgroundColor: '#7C3AED', marginTop: 4 },
  trainerBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  buildCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(252,211,77,0.06)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  buildTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  buildSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5, marginTop: 4 },
});
