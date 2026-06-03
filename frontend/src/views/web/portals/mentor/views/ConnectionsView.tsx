/**
 * Mentor Portal — My Connections (RN port).
 * Beautiful dashboard interface featuring stats counters, left sidebar filters,
 * a grid of rich student cards, next sessions, and a profile detail/message drawer.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Modal, ScrollView, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS, statusMeta } from '../data';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

type Student = typeof STUDENTS[number];
const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'pending',   label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ConnectionsView() {
  const { width } = useWindowDimensions();
  const isLarge = width >= 1024;
  const user = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [picked, setPicked] = useState<any | null>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConnections = async () => {
    try {
      const email = user?.email;
      const res = await api.mentorConnections(email);
      setStudentsList(res?.items || []);
    } catch (e) {
      console.warn('Failed to load mentor connections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, [user]);

  const handleUpdateStudent = (updatedStudent: any) => {
    setStudentsList(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (picked && picked.id === updatedStudent.id) {
      setPicked(updatedStudent);
    }
  };

  const list = useMemo(() => studentsList.filter((st) => {
    if (filter !== 'all' && st.status !== filter) return false;
    if (q && !(st.name + ' ' + st.college + ' ' + st.branch).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [studentsList, filter, q]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = studentsList.length;
    const active = studentsList.filter(s => s.status === 'active').length;
    const sessions = studentsList.reduce((acc, s) => acc + s.sessionsCompleted, 0);
    const upcoming = studentsList.filter(s => s.nextSession).length;
    const rating = 4.9;
    return { total, active, sessions, upcoming, rating };
  }, [studentsList]);

  // Responsive card sizing
  const cardW = width >= 1440 ? '31.5%' : width >= 768 ? '48%' : '100%';

  if (loading) {
    return (
      <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {/* Header and stats */}
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={s.sectionTitle}>My Connections</Text>
            <Text style={s.sub}>{stats.total} students · {stats.upcoming} upcoming sessions</Text>
          </View>
          <View style={s.searchBox}>
            <MaterialCommunityIcons name="magnify" size={16} color={MC.dim} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search students..." placeholderTextColor={MC.dim} style={s.searchInput} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIconBg, { backgroundColor: 'rgba(20,184,166,0.1)' }]}>
              <MaterialCommunityIcons name="account-group" size={16} color={MC.tealP} />
            </View>
            <View>
              <Text style={s.statVal}>{stats.total}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconBg, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
              <MaterialCommunityIcons name="pulse" size={16} color={MC.green} />
            </View>
            <View>
              <Text style={s.statVal}>{stats.active}</Text>
              <Text style={s.statLabel}>Active</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconBg, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <MaterialCommunityIcons name="play-circle-outline" size={16} color={MC.blue} />
            </View>
            <View>
              <Text style={s.statVal}>{stats.sessions}</Text>
              <Text style={s.statLabel}>Sessions</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconBg, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={MC.amber} />
            </View>
            <View>
              <Text style={s.statVal}>{stats.upcoming}</Text>
              <Text style={s.statLabel}>Upcoming</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconBg, { backgroundColor: 'rgba(251,191,36,0.1)' }]}>
              <MaterialCommunityIcons name="star" size={16} color="#FBBF24" />
            </View>
            <View>
              <Text style={s.statVal}>{stats.rating}</Text>
              <Text style={s.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content Layout */}
      <View style={{ flexDirection: isLarge ? 'row' : 'column', gap: 20, alignItems: 'flex-start' }}>
        {/* Left Sidebar Filter (Large Screens) / Top Chip Filter (Mobile) */}
        {isLarge ? (
          <View style={s.sidebarFilters}>
            <Text style={s.filterHeader}>FILTER</Text>
            {FILTERS.map((f) => {
              const on = f.id === filter;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={[s.filterRow, on && s.filterRowActive]}
                >
                  <View style={[s.filterDot, { backgroundColor: on ? MC.tealP : 'transparent' }]} />
                  <Text style={[s.filterText, on && s.filterTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', width: '100%' }}>
            {FILTERS.map((f) => {
              const on = f.id === filter;
              return (
                <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[s.chip, on && s.chipOn]}>
                  <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Right side: Cards Grid */}
        <View style={{ flex: 1, width: '100%' }}>
          <View style={s.grid}>
            {list.map((st) => {
              const meta = statusMeta(st.status);
              const zapScore = st.progress + 10;
              const hasUnread = st.messages > 0 && st.status === 'pending';

              return (
                <Pressable
                  key={st.id}
                  onPress={() => setPicked(st)}
                  style={({ hovered }: any) => [
                    s.card,
                    { width: cardW as any },
                    hovered && s.cardHovered
                  ]}
                >
                  {/* Card Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <Av initials={st.avatar} size={42} color={st.color} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={s.cardName}>{st.name}</Text>
                      <Text numberOfLines={1} style={s.cardSubtitle}>{st.branch} · {st.college}</Text>
                      <Text style={s.cardSaId}>Batch {st.year} - {st.saId}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={meta.label} color={meta.color as any} />
                      {hasUnread ? (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadText}>{st.messages}</Text>
                        </View>
                      ) : (
                        <View style={s.zapBadge}>
                          <MaterialCommunityIcons name="flash" size={10} color={MC.tealP} />
                          <Text style={s.zapText}>{zapScore}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Goals List */}
                  <View style={{ gap: 4, marginBottom: 12 }}>
                    {st.goals.map((g, i) => (
                      <Text key={i} numberOfLines={1} style={s.goalText}>
                        <Text style={{ color: MC.tealP }}>&gt; </Text>{g}
                      </Text>
                    ))}
                  </View>

                  {/* Progress Section */}
                  <View style={{ gap: 6, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.progressLabel}>PROGRESS</Text>
                      <Text style={s.progressVal}>{st.progress}%</Text>
                    </View>
                    <View style={s.bar}>
                      <View style={{
                        height: '100%',
                        width: `${st.progress}%` as any,
                        borderRadius: 2,
                        backgroundColor: st.progress === 100 ? MC.green : st.progress > 60 ? MC.teal : MC.amber,
                      }} />
                    </View>
                  </View>

                  {/* Bottom Stats Meta */}
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialCommunityIcons name="checkbox-marked-outline" size={12} color={MC.dim} />
                      <Text style={s.metaText}>{st.sessionsCompleted} / {st.sessionsTotal}</Text>
                    </View>
                    <Text style={s.metaText}>CGPA {st.cgpa}</Text>
                  </View>

                  {/* Tags */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                    {st.tags.slice(0, 3).map((t) => (
                      <View key={t} style={s.tag}>
                        <Text style={s.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Next Session Box */}
                  {st.nextSession ? (
                    <View style={s.nextBox}>
                      <Text style={s.nextLabel}>📅 Next Session</Text>
                      <Text style={s.nextDateTime}>{st.nextSession.date} · {st.nextSession.time}</Text>
                      <Text numberOfLines={1} style={s.nextTopic}>{st.nextSession.topic}</Text>
                    </View>
                  ) : (
                    <View style={[s.nextBox, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' }]}>
                      <Text style={[s.nextLabel, { color: MC.dim }]}>No upcoming session</Text>
                      <Text style={s.nextTopic}>Set availability to invite booking.</Text>
                    </View>
                  )}

                  {/* Footer Action Buttons */}
                  <View style={s.cardFooter}>
                    <Pressable style={s.footerBtn} onPress={() => setPicked(st)}>
                      <MaterialCommunityIcons name="eye-outline" size={12} color={MC.tealP} style={{ marginRight: 2 }} />
                      <Text style={s.footerBtnText}>View Profile</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable style={s.socialBtn} onPress={() => alert('Social Profile coming soon!')}>
                        <Text style={s.socialText}>in</Text>
                      </Pressable>
                      <Pressable style={s.socialBtn} onPress={() => alert('Github Profile coming soon!')}>
                        <MaterialCommunityIcons name="github" size={12} color={MC.muted} />
                      </Pressable>
                    </View>
                    <Pressable style={[s.footerBtn, { backgroundColor: 'rgba(34,197,94,0.08)' }]} onPress={() => alert('Check-in successful!')}>
                      <MaterialCommunityIcons name="check" size={12} color={MC.green} style={{ marginRight: 2 }} />
                      <Text style={[s.footerBtnText, { color: MC.green }]}>Check-in</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {list.length === 0 && (
            <View style={s.empty}>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med }}>No connections match those filters.</Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile/Actions Drawer */}
      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPicked(null)} style={{ flex: 1 }} />
          <View style={s.drawer}>
            {picked && (
              <DrawerInner 
                st={picked} 
                onClose={() => setPicked(null)} 
                onUpdateStudent={handleUpdateStudent}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DrawerInner({ st, onClose, onUpdateStudent }: { st: Student; onClose: () => void; onUpdateStudent: (updated: Student) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'notes'>('overview');
  const [notesText, setNotesText] = useState(st.lastSession?.notes || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Sessions Tab: Local Mock Scheduling States
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // Default to May
  const [pendingDate, setPendingDate] = useState<string | null>(st.nextSession?.date || null);
  const [selectedTime, setSelectedTime] = useState(st.nextSession?.time || '10:00 AM');
  const [sessionTopic, setSessionTopic] = useState(st.nextSession?.topic || '1:1 Mentorship Session');

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const formatted = `${MONTH_NAMES[calMonth]} ${day}, 2026`;
    setPendingDate(formatted);
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const calendarCells = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const handleConfirmSchedule = () => {
    if (!pendingDate) return;
    let daysAway = 7;
    const dayMatch = pendingDate.match(/May (\d+)/i);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      daysAway = Math.max(1, dayNum - 1);
    }
    const updated = {
      ...st,
      nextSession: {
        date: pendingDate,
        time: selectedTime,
        topic: sessionTopic,
        daysAway,
      }
    };
    onUpdateStudent(updated);
    setActiveTab('overview');
  };

  const handleSaveNotes = () => {
    const updated = {
      ...st,
      lastSession: {
        date: st.lastSession?.date || 'Today',
        notes: notesText
      }
    };
    onUpdateStudent(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiAnalysis(
        `✨ AI STRENGTH ASSESSMENT:\n• Exceptional analytical abilities and strong system design foundation.\n• Arjun demonstrates deep understanding of horizontal scaling, caching strategies (Redis), and load balancers.\n\n📈 DEVELOPMENT AREAS:\n• Concurrency models in Python (asyncio) need more hands-on practice.\n• Focus on database sharding and CAP theorem trade-offs in the next mock interview.\n\n🎯 NEXT ACTION MILESTONES:\n• Mock Session on May 7th focusing entirely on high-throughput system bottlenecks.`
      );
    }, 1800);
  };

  const zapScore = st.progress + 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#050810' }}>
      
      {/* Top Title/Header Bar */}
      <View style={d.drawerTopHeader}>
        <Text style={d.drawerTopTitle}>Student Profile</Text>
        <Pressable onPress={onClose} style={d.drawerCloseBtn}>
          <MaterialCommunityIcons name="close" size={16} color="#00ffcc" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Inner Student Profile Header Card */}
        <View style={d.innerCard}>
          <Av initials={st.avatar} size={56} color={st.color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={d.stName}>{st.name}</Text>
            <Text numberOfLines={1} style={d.stSub}>{st.branch} · {st.college} · {st.year}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <Badge label="Active" color="green" />
              <View style={d.stZapBadge}>
                <MaterialCommunityIcons name="flash" size={10} color={MC.tealP} />
                <Text style={d.stZapText}>{zapScore}</Text>
              </View>
              <Text style={d.stCgpaText}>CGPA {st.cgpa}</Text>
            </View>
          </View>
          <View style={{ gap: 6, justifyContent: 'center' }}>
            <Pressable style={d.iconCircleBtn} onPress={() => alert('Social Profile coming soon!')}>
              <Text style={{ color: '#00ffcc', fontFamily: FONTS.bold, fontSize: 11 }}>in</Text>
            </Pressable>
            <Pressable style={d.iconCircleBtn} onPress={() => alert('Github Profile coming soon!')}>
              <MaterialCommunityIcons name="github" size={12} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* 4 Stats Grid Row */}
        <View style={d.fourStatsRow}>
          <View style={d.fourStatCard}>
            <MaterialCommunityIcons name="play-circle-outline" size={16} color={MC.tealP} />
            <Text style={d.fourStatVal}>{st.sessionsCompleted}/{st.sessionsTotal}</Text>
            <Text style={d.fourStatLabel}>Sessions</Text>
          </View>
          <View style={d.fourStatCard}>
            <MaterialCommunityIcons name="pulse" size={16} color={MC.tealP} />
            <Text style={d.fourStatVal}>{st.progress}%</Text>
            <Text style={d.fourStatLabel}>Progress</Text>
          </View>
          <View style={d.fourStatCard}>
            <MaterialCommunityIcons name="school-outline" size={16} color={MC.tealP} />
            <Text style={d.fourStatVal}>{st.cgpa}</Text>
            <Text style={d.fourStatLabel}>CGPA</Text>
          </View>
          <View style={d.fourStatCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={MC.tealP} />
            <Text style={d.fourStatVal}>{st.joinedOn.split(',')[0]}</Text>
            <Text style={d.fourStatLabel}>Joined</Text>
          </View>
        </View>

        {/* Tabs Row */}
        <View style={d.tabsContainer}>
          <Pressable 
            onPress={() => setActiveTab('overview')} 
            style={[d.tabBtn, activeTab === 'overview' && d.tabBtnActive]}
          >
            <Text style={[d.tabText, activeTab === 'overview' && d.tabTextActive]}>Overview</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab('sessions')} 
            style={[d.tabBtn, activeTab === 'sessions' && d.tabBtnActive]}
          >
            <Text style={[d.tabText, activeTab === 'sessions' && d.tabTextActive]}>Sessions</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab('notes')} 
            style={[d.tabBtn, activeTab === 'notes' && d.tabBtnActive]}
          >
            <Text style={[d.tabText, activeTab === 'notes' && d.tabTextActive]}>Notes</Text>
          </Pressable>
        </View>

        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <View style={{ gap: 18 }}>
            
            {/* Goals Capsule Cards */}
            <View style={{ gap: 8 }}>
              <Text style={d.kicker}>GOALS</Text>
              {st.goals.map((goal, i) => (
                <View key={i} style={d.goalCapsule}>
                  <MaterialCommunityIcons name="compass-outline" size={14} color={MC.tealP} />
                  <Text style={d.goalCapsuleText}>{goal}</Text>
                </View>
              ))}
            </View>

            {/* Interests & Skills Side-by-side */}
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={d.kicker}>INTERESTS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {st.interests.slice(0, 3).map((it) => (
                    <View key={it} style={d.tagInterests}>
                      <Text style={d.tagInterestsText}>{it}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={d.kicker}>SKILLS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {st.skills.slice(0, 4).map((sk) => (
                    <View key={sk} style={d.tagSkills}>
                      <Text style={d.tagSkillsText}>{sk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Mentorship Progress Card */}
            <View style={d.panelCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={d.cardTitle}>Mentorship Progress</Text>
                <Text style={d.progressValText}>{st.progress}%</Text>
              </View>
              <View style={d.progressBarWrapper}>
                <View style={[d.progressBarFilled, { width: `${st.progress}%` as any }]} />
              </View>
              <Text style={d.progressSub}>{st.sessionsCompleted} of {st.sessionsTotal} sessions · Joined {st.joinedOn}</Text>
            </View>

            {/* Upcoming Session Action Box */}
            {st.nextSession ? (
              <View style={d.panelCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={14} color={MC.tealP} />
                  <Text style={d.upcomingTitle}>Upcoming Session</Text>
                </View>
                <Text style={d.upcomingDateTime}>{st.nextSession.date} · {st.nextSession.time}</Text>
                <Text style={d.upcomingTopic}>{st.nextSession.topic}</Text>
                
                {/* Meet Launch Section */}
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  <Text style={d.sessionStartLabel}>🟢 START SESSION VIA</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable style={d.meetBtn} onPress={() => Platform.OS === 'web' ? window.open('https://meet.google.com', '_blank') : alert('Opening Meet...')}>
                      <MaterialCommunityIcons name="video-outline" size={14} color="#fff" />
                      <Text style={d.meetBtnText}>Google Meet</Text>
                    </Pressable>
                    <Pressable style={d.meetBtn} onPress={() => Platform.OS === 'web' ? window.open('https://zoom.us', '_blank') : alert('Opening Zoom...')}>
                      <MaterialCommunityIcons name="video-box" size={14} color="#fff" />
                      <Text style={d.meetBtnText}>Zoom</Text>
                    </Pressable>
                    <Pressable style={[d.meetBtn, { backgroundColor: '#3f2a56', borderColor: '#5c3e7f' }]} onPress={() => Platform.OS === 'web' ? window.open('https://teams.microsoft.com', '_blank') : alert('Opening Teams...')}>
                      <MaterialCommunityIcons name="microsoft-teams" size={14} color="#fff" />
                      <Text style={d.meetBtnText}>Teams</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Agenda Generator */}
                <Pressable style={d.agendaBtn} onPress={() => alert('Generating beautifully tailored agenda with AI...')}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={14} color="#00ffcc" />
                  <Text style={d.agendaBtnText}>Generate Session Agenda</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[d.panelCard, { alignItems: 'center', paddingVertical: 20 }]}>
                <MaterialCommunityIcons name="calendar-question" size={24} color={MC.dim} />
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginTop: 8 }}>No Upcoming Sessions Scheduled</Text>
                <Pressable onPress={() => setActiveTab('sessions')} style={d.schedulePromptBtn}>
                  <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>Schedule New Session Now</Text>
                </Pressable>
              </View>
            )}

            {/* AI Progress Analysis */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={d.kicker}>✨ AI PROGRESS ANALYSIS</Text>
              {isAnalyzing ? (
                <View style={d.aiAnalysisBox}>
                  <MaterialCommunityIcons name="loading" size={16} color={MC.tealP} style={d.loadingSpin} />
                  <Text style={d.aiAnalysisPlaceholder}>Synthesizing custom student progress models...</Text>
                </View>
              ) : aiAnalysis ? (
                <View style={[d.aiAnalysisBox, { borderColor: 'rgba(20,184,166,0.30)', backgroundColor: 'rgba(20,184,166,0.03)' }]}>
                  <Text style={d.aiAnalysisText}>{aiAnalysis}</Text>
                </View>
              ) : (
                <Pressable style={d.aiBtn} onPress={handleRunAiAnalysis}>
                  <MaterialCommunityIcons name="sparkles" size={14} color="#00ffcc" />
                  <Text style={d.aiBtnText}>Analyze Progress</Text>
                </Pressable>
              )}
            </View>

          </View>
        )}

        {/* SESSIONS TAB CONTENT */}
        {activeTab === 'sessions' && (
          <View style={{ gap: 14 }}>
            {/* Last session report */}
            {st.lastSession && (
              <View style={d.panelCard}>
                <Text style={d.kicker}>LAST COMPLETED SESSION</Text>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginTop: 4 }}>Covered Core Topics</Text>
                <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{st.lastSession.notes}</Text>
              </View>
            )}

            {/* Interactive Scheduler Card */}
            <View style={d.panelCard}>
              <Text style={d.kicker}>SCHEDULE A NEW SESSION</Text>
              
              <View style={{ gap: 12, marginTop: 10 }}>
                <View>
                  <Text style={d.inputLabel}>SESSION TOPIC</Text>
                  <TextInput
                    value={sessionTopic}
                    onChangeText={setSessionTopic}
                    placeholder="Enter session topic..."
                    placeholderTextColor={MC.dim}
                    style={d.topicInput}
                  />
                </View>

                <View>
                  <Text style={d.inputLabel}>SELECT TIME SLOT</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => {
                      const active = selectedTime === t;
                      return (
                        <Pressable key={t} onPress={() => setSelectedTime(t)} style={[d.timeSlot, active && d.timeSlotActive]}>
                          <Text style={{ color: active ? '#fff' : MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{t}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Calendar Grid card */}
                <View style={d.calCard}>
                  <View style={d.monthRow}>
                    <Pressable onPress={handlePrevMonth} style={d.navArrow}>
                      <MaterialCommunityIcons name="chevron-left" size={16} color="#fff" />
                    </Pressable>
                    <Text style={d.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
                    <Pressable onPress={handleNextMonth} style={d.navArrow}>
                      <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                    </Pressable>
                  </View>

                  <View style={d.weekDaysRow}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <Text key={i} style={d.weekDayName}>{day}</Text>
                    ))}
                  </View>

                  <View style={d.daysGrid}>
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <View key={`empty-${idx}`} style={d.dayCellEmpty} />;
                      }
                      const formatted = `${MONTH_NAMES[calMonth]} ${day}, 2026`;
                      const isSelected = pendingDate === formatted;
                      return (
                        <Pressable
                          key={`day-${day}`}
                          onPress={() => handleDaySelect(day)}
                          style={[d.dayCell, isSelected && d.dayCellSelected]}
                        >
                          <Text style={[d.dayText, isSelected && d.dayTextSelected]}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {pendingDate && (
                  <Pressable onPress={handleConfirmSchedule} style={d.confirmBtn}>
                    <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>
                      Confirm Session for {pendingDate} at {selectedTime}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* NOTES TAB CONTENT */}
        {activeTab === 'notes' && (
          <View style={{ gap: 14 }}>
            <View style={d.panelCard}>
              <Text style={d.kicker}>SESSION NOTES & FEEDBACK</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, marginBottom: 12 }}>Write specific developmental notes, task assignments, or remarks. Arjun will see these on their profile.</Text>
              
              <TextInput
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Type session logs, key takeaways, and action items..."
                placeholderTextColor={MC.dim}
                multiline
                numberOfLines={6}
                style={d.notesTextarea}
              />
              
              <Pressable onPress={handleSaveNotes} style={d.saveNotesBtn}>
                {isSaved ? (
                  <>
                    <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    <Text style={d.saveBtnText}>Notes Saved!</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={14} color="#fff" />
                    <Text style={d.saveBtnText}>Save Remarks & Notes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const d = StyleSheet.create({
  drawerTopHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  drawerTopTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18,
    letterSpacing: -0.4
  },
  drawerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 255, 204, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  innerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.04)',
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  stName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
  stSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  stCgpaText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11 },
  stZapBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(20, 184, 166, 0.08)', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.2)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  stZapText: { color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 9 },
  iconCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },

  // 4 Stats Card Grid
  fourStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  fourStatCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 4 },
  fourStatVal: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  fourStatLabel: { color: MC.dim, fontFamily: FONTS.med, fontSize: 9.5 },

  // Tabs style
  tabsContainer: { flexDirection: 'row', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 1, marginBottom: 18 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabBtnActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  tabText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  tabTextActive: { color: MC.bg },

  // Overview items
  kicker: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  goalCapsule: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20, 184, 166, 0.02)', borderColor: 'rgba(20, 184, 166, 0.12)', borderWidth: 1, borderRadius: 10, padding: 10 },
  goalCapsuleText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  
  tagInterests: { backgroundColor: 'rgba(20,184,166,0.05)', borderColor: 'rgba(20,184,166,0.18)', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagInterestsText: { color: MC.tealP, fontSize: 10, fontFamily: FONTS.bold },
  tagSkills: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagSkillsText: { color: MC.muted, fontSize: 10, fontFamily: FONTS.bold },

  panelCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  progressValText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 },
  progressBarWrapper: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  progressBarFilled: { height: '100%', backgroundColor: MC.tealP, borderRadius: 3 },
  progressSub: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11 },

  upcomingTitle: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 },
  upcomingDateTime: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  upcomingTopic: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
  
  sessionStartLabel: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.5 },
  meetBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 10, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.20)', backgroundColor: 'rgba(34, 197, 94, 0.08)', flex: 1, justifyContent: 'center', cursor: 'pointer' },
  meetBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5 },
  agendaBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.20)', backgroundColor: 'rgba(20, 184, 166, 0.05)', justifyContent: 'center', marginTop: 10, cursor: 'pointer' },
  agendaBtnText: { color: '#00ffcc', fontFamily: FONTS.bold, fontSize: 11.5 },
  schedulePromptBtn: { height: 32, paddingHorizontal: 14, backgroundColor: MC.tealP, borderRadius: 8, justifyContent: 'center', marginTop: 12, cursor: 'pointer' },

  // AI Progress Analysis
  aiBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.20)', backgroundColor: 'rgba(20, 184, 166, 0.05)', alignSelf: 'flex-start', cursor: 'pointer' },
  aiBtnText: { color: '#00ffcc', fontFamily: FONTS.bold, fontSize: 11.5 },
  aiAnalysisBox: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.01)', gap: 6 },
  aiAnalysisPlaceholder: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  aiAnalysisText: { color: '#fff', fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 },
  loadingSpin: { alignSelf: 'center' },

  // Interactive scheduler inside drawer
  inputLabel: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 10.5, marginBottom: 5 },
  topicInput: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, fontFamily: FONTS.med, height: 40, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  timeSlot: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)', cursor: 'pointer' },
  timeSlotActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  calCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 5 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  navArrow: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayName: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 10.5, width: '13%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '1.5%' as any },
  dayCell: { width: '13%', height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 4, cursor: 'pointer' },
  dayCellEmpty: { width: '13%', height: 30, marginBottom: 4 },
  dayCellSelected: { backgroundColor: MC.tealP },
  dayText: { color: '#fff', fontFamily: FONTS.med, fontSize: 11 },
  dayTextSelected: { color: MC.bg, fontFamily: FONTS.bold },
  confirmBtn: { backgroundColor: MC.tealP, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, cursor: 'pointer' },

  // Notes tab
  notesTextarea: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, fontFamily: FONTS.med, minHeight: 100, textAlignVertical: 'top', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  saveNotesBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 38, borderRadius: 8, backgroundColor: MC.tealP, justifyContent: 'center', marginTop: 12, cursor: 'pointer' },
  saveBtnText: { color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 },
});

const s = StyleSheet.create({
  sectionTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.4 },
  sub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  
  // Stats Row Styles
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  statCard: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  statIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  statLabel: { color: MC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },

  // Left Sidebar Filter Styles
  sidebarFilters: { width: 180, gap: 4, borderRightWidth: 1, borderRightColor: MC.border, paddingRight: 10, minHeight: 300 },
  filterHeader: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.8, marginBottom: 8, paddingLeft: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, cursor: 'pointer' },
  filterRowActive: { backgroundColor: 'rgba(20, 184, 166, 0.08)' },
  filterDot: { width: 5, height: 5, borderRadius: 3 },
  filterText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  filterTextActive: { color: MC.tealP },

  // Cards Grid & Layout Styles
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 14, cursor: 'pointer', position: 'relative' },
  cardHovered: { borderColor: MC.border2 },
  cardName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  cardSubtitle: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  cardSaId: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10, marginTop: 1 },
  
  // Custom Card Badges
  unreadBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 9.5 },
  zapBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(20, 184, 166, 0.08)', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.2)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  zapText: { color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 9 },

  goalText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 },
  progressLabel: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.4 },
  progressVal: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 10 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  metaText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  
  tag: { backgroundColor: 'rgba(20,184,166,0.08)', borderColor: MC.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { color: MC.tealP, fontSize: 9.5, fontFamily: FONTS.bold },
  
  nextBox: { backgroundColor: 'rgba(20,184,166,0.04)', borderColor: 'rgba(20,184,166,0.15)', borderWidth: 1, borderRadius: 8, padding: 8, gap: 2 },
  nextLabel: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 9.5 },
  nextDateTime: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
  nextTopic: { color: MC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  // Card Action Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 26, borderRadius: 6, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)', cursor: 'pointer' },
  footerBtnText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 10.5 },
  socialBtn: { width: 24, height: 26, borderRadius: 6, borderWidth: 1, borderColor: MC.border, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  socialText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 10.5, lineHeight: 12 },
  socialTextGithub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  // Drawer Layout Styles
  empty: { width: '100%', padding: 24, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', flexDirection: 'row', justifyContent: 'flex-end' },
  drawer: { width: 460, maxWidth: '100%' as any, backgroundColor: '#000000', borderLeftWidth: 1, borderLeftColor: MC.border2 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer' },
  kicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1, marginTop: 18, marginBottom: 8 },

  // CTA & Action Tabs in Drawer
  ctaBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', cursor: 'pointer' },
  ctaActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  ctaInactive: { borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.07)' },
  
  // Message tab in Drawer
  chatContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, gap: 10, minHeight: 180, maxHeight: 300, borderWidth: 1, borderColor: MC.border },
  chatBubble: { padding: 10, borderRadius: 10, maxWidth: '85%' },
  bubbleMentor: { backgroundColor: 'rgba(20, 184, 166, 0.15)', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleStudent: { backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  inputWrapper: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  msgInput: { flex: 1, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, fontFamily: FONTS.med, minHeight: 40, maxHeight: 80, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  sendBtn: { height: 40, width: 60, backgroundColor: MC.tealP, borderRadius: 10, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  
  // Schedule tab in Drawer
  topicInput: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, fontFamily: FONTS.med, height: 40, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: MC.card, borderWidth: 1, borderColor: MC.border, justifyContent: 'center', cursor: 'pointer' },
  chipOn: { backgroundColor: MC.teal, borderColor: MC.teal },
  timeSlot: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)', cursor: 'pointer' },
  timeSlotActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  calCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 5 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  navArrow: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayName: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 10.5, width: '13%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '1.5%' as any },
  dayCell: { width: '13%', height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 4, cursor: 'pointer' },
  dayCellEmpty: { width: '13%', height: 30, marginBottom: 4 },
  dayCellSelected: { backgroundColor: MC.tealP },
  dayText: { color: '#fff', fontFamily: FONTS.med, fontSize: 11 },
  dayTextSelected: { color: MC.bg, fontFamily: FONTS.bold },
  confirmBtn: { backgroundColor: MC.tealP, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, cursor: 'pointer' },
});
