/**
 * /career-ai — SA Career AI standalone (matches SA Career AI.html spec).
 * Sections: Top stats · 6 skill-category Train-with-AI cards ·
 * 10-Week Roadmap · Build Your Profile · Skill Scores.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import {
  Sparkles, Target, TrendingUp, BookOpen, Play, Check, Mic, Users,
  Code, MessageSquare, Briefcase, Award, FileText, GitBranch, Globe,
  Rocket, Flame, Trophy,
} from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

// 6 skill categories with sub-skills + AI tools
const CATEGORIES = [
  {
    id: 'comm', title: 'Communication', emoji: '💬', color: '#A78BFA',
    sub: 'Master verbal, written and presentation skills for the workplace.',
    skills: ['Public Speaking', 'Email Writing', 'Presentation Skills', 'Active Listening', 'Storytelling'],
    insight: 'Your speaking pace is 20% faster than optimal. Try the Pacing Exercise today.',
    tools: ['AI Speech Coach', 'Presentation Reviewer', 'Writing Grader'],
    score: 68, Icon: Mic,
  },
  {
    id: 'soft', title: 'Soft Skills', emoji: '🧠', color: '#34D399',
    sub: 'Build leadership, teamwork, time management and emotional intelligence.',
    skills: ['Leadership', 'Teamwork', 'Time Management', 'Emotional Intelligence', 'Problem Solving', 'Adaptability'],
    insight: "Based on your sessions, focus on Time Management — it's your lowest-scoring area.",
    tools: ['EQ Assessment', 'Leadership Scenarios', 'Daily Habit Tracker'],
    score: 54, Icon: Users,
  },
  {
    id: 'tech', title: 'Technical Skills', emoji: '💻', color: '#22D3EE',
    sub: 'Level up your coding, data, design and engineering skills with AI guidance.',
    skills: ['DSA & Algorithms', 'System Design', 'SQL & Databases', 'Machine Learning', 'Cloud & DevOps', 'Frontend Dev'],
    insight: 'System Design is at 40% — this is asked in every FAANG interview. Start today!',
    tools: ['Code Reviewer', 'LeetCode Mentor', 'System Design Coach'],
    score: 72, Icon: Code,
  },
  {
    id: 'int', title: 'Interview Prep', emoji: '🎯', color: '#FCD34D',
    sub: 'Crack any interview with AI mock sessions, feedback and answer coaching.',
    skills: ['Behavioural (STAR)', 'Technical Rounds', 'Case Studies', 'HR Round', 'Salary Negotiation'],
    insight: "You haven't done a mock interview in 7 days. Stay sharp — book one today!",
    tools: ['AI Mock Interview', 'Answer Analyser', 'Body Language AI'],
    score: 45, Icon: Target,
  },
  {
    id: 'net', title: 'Networking', emoji: '🤝', color: '#F472B6',
    sub: 'Build meaningful professional relationships online and offline.',
    skills: ['LinkedIn Outreach', 'Cold Emailing', 'Event Networking', 'Personal Branding'],
    insight: 'Your LinkedIn response rate is 12%. AI can help craft personalised messages for 40%+.',
    tools: ['LinkedIn Message AI', 'Brand Analyser', 'Outreach Templates'],
    score: 38, Icon: Globe,
  },
  {
    id: 'lead', title: 'Leadership', emoji: '👑', color: '#FB923C',
    sub: 'Develop executive presence, decision-making and people management skills.',
    skills: ['Executive Presence', 'Conflict Resolution', 'Decision Making', 'Delegation', 'Mentoring Others'],
    insight: 'Your decision-making score is strong! Work on delegation — key for senior roles.',
    tools: ['Executive Coach AI', 'Conflict Resolution AI', 'Delegation Framework'],
    score: 52, Icon: Trophy,
  },
];

// 10-Week AI Career Roadmap
const ROADMAP = [
  { week: 'Week 1–2', title: 'Foundation Assessment', tasks: [
    'Complete profile strength scan',
    'Take AI skill diagnostic across 6 domains',
    'Set career goal (SWE / PM / Analyst / Design)',
    'Upload resume for AI review',
  ], color: '#A78BFA' },
  { week: 'Week 3–4', title: 'Profile Building', tasks: [
    'Enhance resume with AI suggestions',
    'Add 2 projects to portfolio',
    'Request LinkedIn endorsements',
    'Get Certifications (NPTEL/Coursera)',
  ], color: '#34D399' },
  { week: 'Week 5–6', title: 'Skill Development', tasks: [
    'Complete Communication module',
    'Practice 5 mock interviews with AI',
    'Improve System Design score to 70%',
    'Start DSA practice (3 problems/day)',
  ], color: '#22D3EE' },
  { week: 'Week 7–8', title: 'Network & Apply', tasks: [
    'Connect with 10 alumni in target domain',
    'Apply to 5 matched internships',
    'Attend 1 industry event',
    'Book 2 mentor sessions',
  ], color: '#F472B6' },
  { week: 'Week 9–10', title: 'Interview Ready', tasks: [
    'Complete all mock interview rounds',
    'Negotiate offer with AI salary coach',
    'Get 3 referrals from network',
    'Final profile polish + go live',
  ], color: '#FCD34D' },
];

const BUILD_TOOLS = [
  { label: 'Resume', Icon: FileText },
  { label: 'Portfolio', Icon: Briefcase },
  { label: 'Skills', Icon: Sparkles },
  { label: 'Certifications', Icon: Award },
  { label: 'Projects', Icon: Code },
  { label: 'LinkedIn Boost', Icon: Globe },
  { label: 'Mock Interviews', Icon: Target },
  { label: 'CV Review', Icon: BookOpen },
  { label: 'GitHub', Icon: GitBranch },
  { label: 'Cover Letter', Icon: MessageSquare },
];

export default function CareerAIPage() {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const activeCat = CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];
  const overall = Math.round(CATEGORIES.reduce((a, b) => a + b.score, 0) / CATEGORIES.length);

  return (
    <FeaturePageShell
      title="AI Career Roadmap"
      subtitle="Online · Personalised for you"
      heroEmoji="🧠"
      accent="#A78BFA"
      rightSlot={<View style={s.onlinePill}><View style={s.dot} /><Text style={s.onlinePillText}>AI Coach Active</Text></View>}
    >
      {/* Top stats */}
      <View style={s.statsRow}>
        <StatCard label="OVERALL SKILL SCORE" value={`${overall}%`} sub="Across all categories" color="#A78BFA" Icon={Sparkles} />
        <StatCard label="PROFILE STRENGTH" value="72%" sub="Complete now →" color="#34D399" Icon={Rocket} />
        <StatCard label="AI SESSIONS" value="24" sub="This month" color="#FCD34D" Icon={TrendingUp} />
        <StatCard label="SKILL STREAK" value="12 days" sub="Keep it up!" color="#FB923C" Icon={Flame} />
      </View>

      {/* Train with AI — 6 categories */}
      <Text style={s.kicker}>TRAIN WITH AI</Text>
      <View style={s.catTabs}>
        {CATEGORIES.map((ct) => (
          <Pressable key={ct.id} onPress={() => setCat(ct.id)} style={[s.catTab, cat === ct.id && { backgroundColor: ct.color + '22', borderColor: ct.color + '55' }]}>
            <Text style={s.catTabEmoji}>{ct.emoji}</Text>
            <Text style={[s.catTabText, cat === ct.id && { color: ct.color }]}>{ct.title}</Text>
            <View style={s.catTabScore}><Text style={s.catTabScoreText}>{ct.score}%</Text></View>
          </Pressable>
        ))}
      </View>

      {/* Active category detail */}
      <View style={[s.catCard, { borderColor: activeCat.color + '55', backgroundColor: activeCat.color + '0a' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[s.catIcon, { backgroundColor: activeCat.color + '22', borderColor: activeCat.color + '55' }]}>
            <activeCat.Icon size={20} color={activeCat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.catTitle}>{activeCat.title} <Text style={{ color: activeCat.color }}>· {activeCat.score}%</Text></Text>
            <Text style={s.catSub}>{activeCat.sub}</Text>
          </View>
        </View>

        <View style={s.skillsRow}>
          {activeCat.skills.map((sk) => (
            <View key={sk} style={s.skillChip}><Text style={s.skillChipText}>{sk}</Text></View>
          ))}
        </View>

        <View style={s.insight}>
          <Sparkles size={14} color={activeCat.color} />
          <Text style={s.insightText}>{activeCat.insight}</Text>
        </View>

        <View style={{ gap: 8, marginTop: 10 }}>
          <Text style={s.toolsKicker}>AI TOOLS AVAILABLE</Text>
          <View style={s.toolsRow}>
            {activeCat.tools.map((t) => (
              <Pressable key={t} style={[s.toolBtn, { borderColor: activeCat.color + '55' }]}>
                <Play size={11} color={activeCat.color} />
                <Text style={[s.toolText, { color: activeCat.color }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Skill Scores progress */}
      <Text style={s.kicker}>SKILL SCORES</Text>
      <View style={s.scoresCard}>
        {CATEGORIES.map((ct, i) => (
          <View key={ct.id} style={[s.scoreRow, i < CATEGORIES.length - 1 && { borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 }]}>
            <Text style={s.scoreEmoji}>{ct.emoji}</Text>
            <Text style={s.scoreLabel}>{ct.title}</Text>
            <View style={s.scoreBar}>
              <View style={[s.scoreBarFill, { width: `${ct.score}%`, backgroundColor: ct.color }]} />
            </View>
            <Text style={[s.scoreValue, { color: ct.color }]}>{ct.score}%</Text>
          </View>
        ))}
      </View>

      {/* 10-Week Roadmap */}
      <Text style={s.kicker}>10-WEEK AI CAREER ROADMAP</Text>
      <View style={s.roadmapGrid}>
        {ROADMAP.map((r, i) => (
          <View key={i} style={[s.roadCard, { borderColor: r.color + '55' }]}>
            <View style={[s.roadWeek, { backgroundColor: r.color + '22', borderColor: r.color + '55' }]}>
              <Text style={[s.roadWeekText, { color: r.color }]}>{r.week}</Text>
            </View>
            <Text style={s.roadTitle}>{r.title}</Text>
            <View style={{ gap: 7, marginTop: 6 }}>
              {r.tasks.map((t, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Check size={11} color={r.color} style={{ marginTop: 3 }} />
                  <Text style={s.taskText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Build Your Profile */}
      <Text style={s.kicker}>BUILD YOUR PROFILE</Text>
      <View style={s.buildRow}>
        {BUILD_TOOLS.map((t, i) => (
          <Pressable key={i} style={s.buildCard}>
            <View style={s.buildIcon}><t.Icon size={16} color="#A78BFA" /></View>
            <Text style={s.buildLabel}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </FeaturePageShell>
  );
}

function StatCard({ label, value, sub, color, Icon }: { label: string; value: string; sub: string; color: string; Icon: any }) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Icon size={14} color={color} />
        </View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.45)', borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
  onlinePillText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, marginTop: 2 },
  statSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2, marginTop: 6 },

  catTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  catTabEmoji: { fontSize: 16 },
  catTabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  catTabScore: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  catTabScoreText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  catCard: { padding: 20, borderRadius: 14, borderWidth: 1, gap: 12 },
  catIcon: { width: 44, height: 44, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  catSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5, marginTop: 3 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1 },
  skillChipText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.08)', borderColor: 'rgba(252,211,77,0.25)', borderWidth: 1 },
  insightText: { flex: 1, color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  toolsKicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1 },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  toolText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  scoresCard: { padding: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  scoreEmoji: { fontSize: 18 },
  scoreLabel: { width: 140, color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 12.5 },
  scoreBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  scoreValue: { width: 46, textAlign: 'right', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  roadmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  roadCard: { flex: 1, minWidth: 220, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, gap: 8 },
  roadWeek: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  roadWeekText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5, letterSpacing: 0.4 },
  roadTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  taskText: { flex: 1, color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, lineHeight: 16 },

  buildRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  buildCard: { flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.07)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1, alignItems: 'center', gap: 6, ...({ cursor: 'pointer' } as any) },
  buildIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.18)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buildLabel: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5, textAlign: 'center' },
});
