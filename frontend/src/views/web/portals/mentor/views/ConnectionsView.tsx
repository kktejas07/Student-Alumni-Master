/**
 * Mentor Portal — My Connections (RN port).
 * Beautiful dashboard interface featuring stats counters, left sidebar filters,
 * a grid of rich student cards, next sessions, and a profile detail/message drawer.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS, statusMeta } from '../data';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';

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
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isLarge = width >= 1024;
  const user = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [picked, setPicked] = useState<any | null>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadConnections = async (p: number = 1) => {
    try {
      const email = user?.email;
      const res = await api.mentorConnections(email, p, 24);
      const items = res?.items || [];
      const connectedItems = items.filter(
        (item: any) =>
          item.status !== 'none' &&
          item.status !== 'withdrawn' &&
          item.status !== 'declined' &&
          item.status !== 'rejected'
      );
      setStudentsList(connectedItems);
      setPages(res.pages || 1);
      setPage(p);
      if (picked) {
        const fresh = items.find((item: any) => item.id === picked.id);
        if (fresh) setPicked(fresh);
      }
    } catch (e) {
      console.warn('Failed to load mentor connections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConnections(1); }, [user]);

  const handleConnectionDecision = async (otherId: string, decision: 'accept' | 'decline' | 'withdraw' | 'connect') => {
    setActioningId(otherId);
    try {
      if (decision === 'accept') {
        await api.acceptConnection(otherId);
        await loadConnections();
        toast.success('Connection accepted');
      } else if (decision === 'decline') {
        await api.rejectConnection(otherId);
        setStudentsList(prev => prev.map(s => String(s.id) === String(otherId) ? { ...s, status: 'declined' } : s));
        toast.success('Request declined');
      } else if (decision === 'withdraw') {
        await api.withdrawConnection(otherId);
        setStudentsList(prev => prev.map(s => String(s.id) === String(otherId) ? { ...s, status: 'none' } : s));
        toast.success('Request withdrawn');
      } else if (decision === 'connect') {
        await api.sendConnectionRequest(otherId);
        setStudentsList(prev => prev.map(s => String(s.id) === String(otherId) ? { ...s, status: 'pending_sent' } : s));
        toast.success('Connection request sent');
      }
    } catch (e: any) {
      toast.error(`Could not ${decision}`, e?.message || 'Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const handleUpdateStudent = (updatedStudent: any) => {
    setStudentsList(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (picked && picked.id === updatedStudent.id) {
      setPicked(updatedStudent);
    }
  };

  const list = useMemo(() => studentsList.filter((st) => {
    if (filter !== 'all') {
      if (filter === 'completed') {
        if (st.status !== 'completed' && st.progress !== 100) return false;
      } else if (filter === 'pending') {
        if (st.status !== 'pending' && st.status !== 'pending_sent') return false;
      } else {
        if (st.status !== filter) return false;
      }
    }
    if (q && !(st.name + ' ' + st.college + ' ' + st.branch).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [studentsList, filter, q]);

  const stats = useMemo(() => {
    const total = studentsList.length;
    const active = studentsList.filter(s => s.status === 'active').length;
    const sessions = studentsList.reduce((acc, s) => acc + s.sessionsCompleted, 0);
    const upcoming = studentsList.filter(s => s.nextSession).length;
    const rating = 4.9;
    return { total, active, sessions, upcoming, rating };
  }, [studentsList]);

  const cardW = width >= 1440 ? '31.5%' : width >= 768 ? '48%' : '100%';

  if (loading) {
    return (
      <View className="p-[60px] items-center justify-center">
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="gap-3.5">
        <View className="flex-row justify-between items-center flex-wrap gap-2.5">
          <View>
            <Text className="text-white font-display-bold text-xl tracking-[-0.4px]">My Connections</Text>
            <Text className="text-muted font-body-semibold text-xs mt-0.5">{stats.total} students · {stats.upcoming} upcoming sessions</Text>
          </View>
          <View className="flex-row items-center gap-2.5 flex-wrap">
            <View className="flex-row gap-1.5 items-center">
              {FILTERS.map((f) => {
                const on = f.id === filter;
                return (
                  <Pressable key={f.id} onPress={() => setFilter(f.id)} className="px-3.5 h-8 rounded-lg justify-center" style={on ? { backgroundColor: MC.teal, borderColor: MC.teal } : { backgroundColor: MC.card, borderWidth: 1, borderColor: MC.border }}>
                    <Text className="font-body-bold text-xs" style={{ color: on ? '#fff' : MC.muted }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row items-center gap-2 w-[260px] h-9 px-[11px] rounded-[10px] bg-card border border-glass-border">
              <MaterialCommunityIcons name="magnify" size={16} color={MC.dim} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search students..." placeholderTextColor={MC.dim} className="flex-1 text-white font-body-semibold text-[12.5px]" style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined} />
            </View>
          </View>
        </View>

        <View className="flex-row gap-2.5 flex-wrap mt-1">
          <View className="flex-1 min-w-[120px] flex-row items-center gap-2.5 bg-card border border-glass-border rounded-xl px-3 py-2.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center bg-teal/[0.1]"><MaterialCommunityIcons name="account-group" size={16} color={MC.tealP} /></View>
            <View><Text className="text-white font-body-bold text-[15px]">{stats.total}</Text><Text className="text-muted font-body-semibold text-[10.5px] mt-0.5">Total</Text></View>
          </View>
          <View className="flex-1 min-w-[120px] flex-row items-center gap-2.5 bg-card border border-glass-border rounded-xl px-3 py-2.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center bg-green/[0.1]"><MaterialCommunityIcons name="pulse" size={16} color={MC.green} /></View>
            <View><Text className="text-white font-body-bold text-[15px]">{stats.active}</Text><Text className="text-muted font-body-semibold text-[10.5px] mt-0.5">Active</Text></View>
          </View>
          <View className="flex-1 min-w-[120px] flex-row items-center gap-2.5 bg-card border border-glass-border rounded-xl px-3 py-2.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center bg-blue/[0.1]"><MaterialCommunityIcons name="play-circle-outline" size={16} color={MC.blue} /></View>
            <View><Text className="text-white font-body-bold text-[15px]">{stats.sessions}</Text><Text className="text-muted font-body-semibold text-[10.5px] mt-0.5">Sessions</Text></View>
          </View>
          <View className="flex-1 min-w-[120px] flex-row items-center gap-2.5 bg-card border border-glass-border rounded-xl px-3 py-2.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center bg-amber/[0.1]"><MaterialCommunityIcons name="calendar-blank-outline" size={16} color={MC.amber} /></View>
            <View><Text className="text-white font-body-bold text-[15px]">{stats.upcoming}</Text><Text className="text-muted font-body-semibold text-[10.5px] mt-0.5">Upcoming</Text></View>
          </View>
          <View className="flex-1 min-w-[120px] flex-row items-center gap-2.5 bg-card border border-glass-border rounded-xl px-3 py-2.5">
            <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(251,191,36,0.1)' }}><MaterialCommunityIcons name="star" size={16} color="#FBBF24" /></View>
            <View><Text className="text-white font-body-bold text-[15px]">{stats.rating}</Text><Text className="text-muted font-body-semibold text-[10.5px] mt-0.5">Rating</Text></View>
          </View>
        </View>
      </View>

      <View className="w-full">
        <View className="flex-1 w-full">
          <View className="flex-row flex-wrap gap-3 w-full">
            {list.map((st) => {
              const meta = statusMeta(st.status);
              const zapScore = st.progress + 10;
              const hasUnread = st.messages > 0 && st.status === 'pending';
              return (
                <Pressable key={st.id} onPress={() => setPicked(st)} className="bg-card border border-glass-border rounded-[14px] p-3.5" style={{ width: cardW as any, cursor: 'pointer', ...(Platform.OS === 'web' ? { transitionDuration: '160ms' } as any : {}) }}>
                  <View className="flex-row items-start gap-2.5 mb-3">
                    <Av initials={st.avatar} size={42} color={st.color} />
                    <View className="flex-1 min-w-0">
                      <Text numberOfLines={1} className="text-white font-body-bold text-[13.5px]">{st.name}</Text>
                      <Text numberOfLines={1} className="text-muted font-body-semibold text-[11px] mt-0.5">{st.branch} · {st.college}</Text>
                      <Text className="text-dim font-body-semibold text-[10px] mt-0.5">Batch {st.year} - {st.saId}</Text>
                    </View>
                    <View className="items-end gap-1">
                      <Badge label={meta.label} color={meta.color as any} />
                      {hasUnread ? (
                        <View className="bg-red rounded-[10px] min-w-4 h-4 items-center justify-center px-1"><Text className="text-white font-display-bold text-[9.5px]">{st.messages}</Text></View>
                      ) : (
                        <View className="flex-row items-center gap-0.5 bg-teal/[0.08] border border-teal/20 rounded-[6px] px-[5px] py-0.5"><MaterialCommunityIcons name="flash" size={10} color={MC.tealP} /><Text className="text-tealP font-display-bold text-[9px]">{zapScore}</Text></View>
                      )}
                    </View>
                  </View>
                  <View className="gap-1 mb-3">
                    {st.goals.map((g, i) => (
                      <Text key={i} numberOfLines={1} className="text-muted font-body-semibold text-[11.5px] leading-4"><Text className="text-tealP">&gt; </Text>{g}</Text>
                    ))}
                  </View>
                  <View className="gap-1.5 mb-3">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-dim font-body-bold text-[9px] tracking-[0.4px]">PROGRESS</Text>
                      <Text className="text-tealP font-body-bold text-[10px]">{st.progress}%</Text>
                    </View>
                    <View className="h-1 rounded bg-white/[0.07] overflow-hidden">
                      <View className="h-full rounded" style={{ width: `${st.progress}%` as any, backgroundColor: st.progress === 100 ? MC.green : st.progress > 60 ? MC.teal : MC.amber }} />
                    </View>
                  </View>
                  <View className="flex-row gap-3 items-center mb-3">
                    <View className="flex-row items-center gap-1"><MaterialCommunityIcons name="checkbox-marked-outline" size={12} color={MC.dim} /><Text className="text-dim font-body-semibold text-[10.5px]">{st.sessionsCompleted} / {st.sessionsTotal}</Text></View>
                    <Text className="text-dim font-body-semibold text-[10.5px]">CGPA {st.cgpa}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-[5px] mb-3">
                    {st.tags.slice(0, 3).map((t) => (
                      <View key={t} className="bg-teal/[0.08] border border-glass-border rounded-[6px] px-[7px] py-[3px]"><Text className="text-tealP text-[9.5px] font-body-bold">{t}</Text></View>
                    ))}
                  </View>
                  {st.nextSession ? (
                    <View className="bg-teal/[0.04] border border-teal/[0.15] rounded-lg p-2 gap-0.5">
                      <Text className="text-tealP font-body-bold text-[9.5px]">📅 Next Session</Text>
                      <Text className="text-white font-body-bold text-[11px]">{st.nextSession.date} · {st.nextSession.time}</Text>
                      <Text numberOfLines={1} className="text-muted font-body-semibold text-[10.5px]">{st.nextSession.topic}</Text>
                    </View>
                  ) : (
                    <View className="border rounded-lg p-2 gap-0.5" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' }}>
                      <Text className="text-dim font-body-bold text-[9.5px]">No upcoming session</Text>
                      <Text className="text-muted font-body-semibold text-[10.5px]">Set availability to invite booking.</Text>
                    </View>
                  )}
                  {st.status === 'pending' || st.status === 'pending_sent' ? (
                    st.status === 'pending' ? (
                      <View className="flex-row gap-2 w-full mt-2">
                        <Pressable disabled={actioningId === String(st.id)} onPress={() => handleConnectionDecision(st.id, 'accept')} className="flex-1 flex-row gap-1.5 items-center justify-center py-2 rounded-lg bg-tealP">
                          <MaterialCommunityIcons name="check" size={14} color={MC.bg} />
                          <Text className="text-bg font-display-bold text-xs">{actioningId === String(st.id) ? 'Processing...' : 'Accept'}</Text>
                        </Pressable>
                        <Pressable disabled={actioningId === String(st.id)} onPress={() => handleConnectionDecision(st.id, 'decline')} className="flex-1 flex-row gap-1.5 items-center justify-center py-2 rounded-lg border" style={{ borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' }}>
                          <MaterialCommunityIcons name="close" size={14} color={MC.red} />
                          <Text className="text-rose font-body-bold text-xs">Decline</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View className="flex-row gap-2 w-full mt-2">
                        <Pressable disabled={actioningId === String(st.id)} onPress={() => handleConnectionDecision(st.id, 'withdraw')} className="flex-1 flex-row gap-1.5 items-center justify-center py-2 rounded-lg border" style={{ borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' }}>
                          <MaterialCommunityIcons name="close" size={14} color={MC.red} />
                          <Text className="text-rose font-body-bold text-xs">{actioningId === String(st.id) ? 'Processing...' : 'Withdraw'}</Text>
                        </Pressable>
                      </View>
                    )
                  ) : st.status === 'none' || st.status === 'withdrawn' || st.status === 'declined' || st.status === 'rejected' ? (
                    <View className="flex-row gap-2 w-full mt-2">
                      <Pressable disabled={actioningId === String(st.id)} onPress={() => handleConnectionDecision(st.id, 'connect')} className="flex-1 flex-row gap-1.5 items-center justify-center py-2 rounded-lg bg-tealP">
                        <MaterialCommunityIcons name="plus" size={14} color={MC.bg} />
                        <Text className="text-bg font-display-bold text-xs">{actioningId === String(st.id) ? 'Processing...' : 'Connect'}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex-row justify-between items-center mt-1.5 border-t pt-2.5" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <Pressable className="flex-row items-center gap-1 px-2 h-[26px] rounded-[6px] border" style={{ borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)' }} onPress={() => setPicked(st)}>
                        <MaterialCommunityIcons name="eye-outline" size={12} color={MC.tealP} /><Text className="text-tealP font-body-bold text-[10.5px]">View Profile</Text>
                      </Pressable>
                      <View className="flex-row gap-1">
                        <Pressable className="w-6 h-[26px] rounded-[6px] border items-center justify-center" style={{ borderColor: MC.border, backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => toast.info('Coming soon', 'Social profile is not available yet.')}><Text className="text-muted font-body-bold text-[10.5px] leading-3">in</Text></Pressable>
                        <Pressable className="w-6 h-[26px] rounded-[6px] border items-center justify-center" style={{ borderColor: MC.border, backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => toast.info('Coming soon', 'GitHub profile is not available yet.')}><MaterialCommunityIcons name="github" size={12} color={MC.muted} /></Pressable>
                      </View>
                      <Pressable className="flex-row items-center gap-1 px-2 h-[26px] rounded-[6px] border" style={{ borderColor: MC.border2, backgroundColor: 'rgba(34,197,94,0.08)' }} onPress={() => toast.success('Checked in')}>
                        <MaterialCommunityIcons name="check" size={12} color={MC.green} /><Text className="text-green font-body-bold text-[10.5px]">Check-in</Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {list.length === 0 && (
            <View className="w-full py-6 items-center"><Text className="text-muted font-body-semibold">No connections match those filters.</Text></View>
          )}
          {pages > 1 && (
            <View className="flex-row justify-center items-center py-4 gap-3.5">
              <Pressable className="px-3.5 py-[7px] bg-card rounded-lg border border-glass-border" style={page <= 1 ? { opacity: 0.4 } : undefined} onPress={() => page > 1 && loadConnections(page - 1)}><Text className="text-white font-body-bold text-xs">Prev</Text></Pressable>
              <Text className="text-muted font-body-semibold text-xs">{page} / {pages}</Text>
              <Pressable className="px-3.5 py-[7px] bg-card rounded-lg border border-glass-border" style={page >= pages ? { opacity: 0.4 } : undefined} onPress={() => page < pages && loadConnections(page + 1)}><Text className="text-white font-body-bold text-xs">Next</Text></Pressable>
            </View>
          )}
        </View>
      </View>

      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View className="flex-1 bg-black/65 flex-row justify-end">
          <Pressable onPress={() => setPicked(null)} className="flex-1" />
          <View className="w-[460px] max-w-full bg-black border-l" style={{ borderColor: MC.border2 }}>
            {picked && (
              <DrawerInner st={picked} onClose={() => setPicked(null)} onUpdateStudent={handleUpdateStudent} onRefresh={loadConnections} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const parseToISO = (dateStr: string, timeStr: string) => {
  const parts = dateStr.replace(',', '').split(' ');
  const monthName = parts[0];
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const monthIdx = MONTH_NAMES.indexOf(monthName);
  const month = monthIdx !== -1 ? monthIdx : 4;
  const timeParts = timeStr.split(' ');
  const hm = timeParts[0].split(':');
  let hours = parseInt(hm[0], 10);
  const minutes = parseInt(hm[1], 10);
  const ampm = timeParts[1];
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  const d = new Date(year, month, day, hours, minutes, 0);
  return d.toISOString();
};

function DrawerInner({ st, onClose, onUpdateStudent, onRefresh }: { st: Student; onClose: () => void; onUpdateStudent: (updated: Student) => void; onRefresh: () => Promise<void> }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'notes'>('overview');
  const [notesText, setNotesText] = useState(st.lastSession?.notes || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4);
  const [pendingDate, setPendingDate] = useState<string | null>(st.nextSession?.date || null);
  const [selectedTime, setSelectedTime] = useState(st.nextSession?.time || '10:00 AM');
  const [sessionTopic, setSessionTopic] = useState(st.nextSession?.topic || '1:1 Mentorship Session');

  const handlePrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else { setCalMonth((m) => m - 1); } };
  const handleNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else { setCalMonth((m) => m + 1); } };
  const handleDaySelect = (day: number) => { setPendingDate(`${MONTH_NAMES[calMonth]} ${day}, 2026`); };
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const handleConfirmSchedule = async () => {
    if (!pendingDate) return;
    setIsScheduling(true);
    try {
      const slot_start_iso = parseToISO(pendingDate, selectedTime);
      await api.createMentorBooking({ student_id: String(st.id), slot_start_iso, topic: sessionTopic });
      await onRefresh();
      setActiveTab('overview');
      toast.success('Session scheduled', `Booked with ${st.name || 'student'}.`);
    } catch (e: any) { toast.error('Schedule failed', e?.message || 'Please try again.'); }
    finally { setIsScheduling(false); }
  };

  const handleSaveNotes = () => { onUpdateStudent({ ...st, lastSession: { date: st.lastSession?.date || 'Today', notes: notesText } }); setIsSaved(true); setTimeout(() => setIsSaved(false), 2000); };

  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true); setAiAnalysis(null);
    setTimeout(() => { setIsAnalyzing(false); setAiAnalysis('✨ AI STRENGTH ASSESSMENT:\n• Exceptional analytical abilities and strong system design foundation.\n• Arjun demonstrates deep understanding of horizontal scaling, caching strategies (Redis), and load balancers.\n\n📈 DEVELOPMENT AREAS:\n• Concurrency models in Python (asyncio) need more hands-on practice.\n• Focus on database sharding and CAP theorem trade-offs in the next mock interview.\n\n🎯 NEXT ACTION MILESTONES:\n• Mock Session on May 7th focusing entirely on high-throughput system bottlenecks.'); }, 1800);
  };

  const zapScore = st.progress + 10;

  return (
    <View className="flex-1 bg-[#050810]">
      <View className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Text className="text-white font-display-bold text-lg tracking-[-0.4px]">Student Profile</Text>
        <Pressable onPress={onClose} className="w-7 h-7 rounded-[14px] items-center justify-center" style={{ backgroundColor: 'rgba(0, 255, 204, 0.08)', borderColor: 'rgba(0, 255, 204, 0.20)', borderWidth: 1 }}>
          <MaterialCommunityIcons name="close" size={16} color="#00ffcc" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3.5 bg-teal/[0.04] border border-teal/[0.15] rounded-[16px] p-4 mb-4">
          <Av initials={st.avatar} size={56} color={st.color} />
          <View className="flex-1 min-w-0">
            <Text numberOfLines={1} className="text-white font-body-bold text-[16px]">{st.name}</Text>
            <Text numberOfLines={1} className="text-muted font-body-semibold text-[11.5px] mt-0.5">{st.branch} · {st.college} · {st.year}</Text>
            <View className="flex-row items-center gap-2.5 mt-1.5">
              <Badge label={statusMeta(st.status).label} color={statusMeta(st.status).color as any} />
              <View className="flex-row items-center gap-0.5 bg-teal/[0.08] border border-teal/20 rounded-[6px] px-[5px] py-0.5"><MaterialCommunityIcons name="flash" size={10} color={MC.tealP} /><Text className="text-tealP font-display-bold text-[9px]">{zapScore}</Text></View>
              <Text className="text-dim font-body-semibold text-[11px]">CGPA {st.cgpa}</Text>
            </View>
          </View>
          <View className="gap-1.5 justify-center">
            <Pressable className="w-6 h-6 rounded-[12px] border items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => toast.info('Coming soon', 'Social profile is not available yet.')}><Text className="text-[#00ffcc] font-body-bold text-[11px]">in</Text></Pressable>
            <Pressable className="w-6 h-6 rounded-[12px] border items-center justify-center" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }} onPress={() => toast.info('Coming soon', 'GitHub profile is not available yet.')}><MaterialCommunityIcons name="github" size={12} color="#fff" /></Pressable>
          </View>
        </View>

        <View className="flex-row gap-2 mb-5">
          <View className="flex-1 bg-white/[0.01] border rounded-xl py-2.5 items-center gap-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }}><MaterialCommunityIcons name="play-circle-outline" size={16} color={MC.tealP} /><Text className="text-white font-body-bold text-[13px]">{st.sessionsCompleted}/{st.sessionsTotal}</Text><Text className="text-dim font-body-semibold text-[9.5px]">Sessions</Text></View>
          <View className="flex-1 bg-white/[0.01] border rounded-xl py-2.5 items-center gap-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }}><MaterialCommunityIcons name="pulse" size={16} color={MC.tealP} /><Text className="text-white font-body-bold text-[13px]">{st.progress}%</Text><Text className="text-dim font-body-semibold text-[9.5px]">Progress</Text></View>
          <View className="flex-1 bg-white/[0.01] border rounded-xl py-2.5 items-center gap-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }}><MaterialCommunityIcons name="school-outline" size={16} color={MC.tealP} /><Text className="text-white font-body-bold text-[13px]">{st.cgpa}</Text><Text className="text-dim font-body-semibold text-[9.5px]">CGPA</Text></View>
          <View className="flex-1 bg-white/[0.01] border rounded-xl py-2.5 items-center gap-1" style={{ borderColor: 'rgba(255,255,255,0.05)' }}><MaterialCommunityIcons name="calendar-blank-outline" size={16} color={MC.tealP} /><Text className="text-white font-body-bold text-[13px]">{st.joinedOn.split(',')[0]}</Text><Text className="text-dim font-body-semibold text-[9.5px]">Joined</Text></View>
        </View>

        <View className="flex-row gap-2 border-b pb-0.5 mb-[18px]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <Pressable onPress={() => setActiveTab('overview')} className="py-2 px-4 rounded-lg" style={activeTab === 'overview' ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text className="font-body-bold text-[12.5px]" style={{ color: activeTab === 'overview' ? MC.bg : MC.muted }}>Overview</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('sessions')} className="py-2 px-4 rounded-lg" style={activeTab === 'sessions' ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text className="font-body-bold text-[12.5px]" style={{ color: activeTab === 'sessions' ? MC.bg : MC.muted }}>Sessions</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('notes')} className="py-2 px-4 rounded-lg" style={activeTab === 'notes' ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text className="font-body-bold text-[12.5px]" style={{ color: activeTab === 'notes' ? MC.bg : MC.muted }}>Notes</Text>
          </Pressable>
        </View>

        {activeTab === 'overview' && (
          <View className="gap-[18px]">
            <View className="gap-2">
              <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">GOALS</Text>
              {st.goals.map((goal, i) => (
                <View key={i} className="flex-row items-center gap-2 bg-teal/[0.02] border border-teal/[0.12] rounded-[10px] p-2.5">
                  <MaterialCommunityIcons name="compass-outline" size={14} color={MC.tealP} />
                  <Text className="text-white font-body-bold text-[12.5px]">{goal}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1 gap-1.5">
                <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">INTERESTS</Text>
                <View className="flex-row flex-wrap gap-1">{st.interests.slice(0, 3).map((it) => <View key={it} className="bg-teal/[0.05] border border-teal/[0.18] rounded-[6px] px-2 py-1"><Text className="text-tealP text-[10px] font-body-bold">{it}</Text></View>)}</View>
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">SKILLS</Text>
                <View className="flex-row flex-wrap gap-1">{st.skills.slice(0, 4).map((sk) => <View key={sk} className="bg-white/[0.02] border border-white/[0.08] rounded-[6px] px-2 py-1"><Text className="text-muted text-[10px] font-body-bold">{sk}</Text></View>)}</View>
              </View>
            </View>
            <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 gap-2">
              <View className="flex-row justify-between items-center"><Text className="text-white font-body-bold text-[13px]">Mentorship Progress</Text><Text className="text-tealP font-body-bold text-[13px]">{st.progress}%</Text></View>
              <View className="h-[6px] rounded-[3px] bg-white/[0.05] overflow-hidden"><View className="h-full rounded-[3px] bg-tealP" style={{ width: `${st.progress}%` as any }} /></View>
              <Text className="text-dim font-body-semibold text-[11px]">{st.sessionsCompleted} of {st.sessionsTotal} sessions · Joined {st.joinedOn}</Text>
            </View>
            {st.nextSession ? (
              <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 gap-2">
                <View className="flex-row items-center gap-1.5 mb-2"><MaterialCommunityIcons name="calendar-blank-outline" size={14} color={MC.tealP} /><Text className="text-tealP font-body-bold text-[13px]">Upcoming Session</Text></View>
                <Text className="text-white font-body-bold text-[15px]">{st.nextSession.date} · {st.nextSession.time}</Text>
                <Text className="text-muted font-body-semibold text-xs">{st.nextSession.topic}</Text>
                <View className="mt-3 border-t pt-3" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <Text className="text-dim font-body-bold text-[9.5px] tracking-[0.5px]">🟢 START SESSION VIA</Text>
                  <View className="flex-row gap-2 mt-2">
                    <Pressable className="flex-row gap-1 items-center px-2.5 h-8 rounded-lg border flex-1 justify-center" style={{ borderColor: 'rgba(34, 197, 94, 0.20)', backgroundColor: 'rgba(34, 197, 94, 0.08)' }} onPress={() => Platform.OS === 'web' ? window.open('https://meet.google.com', '_blank') : toast.info('Opening Meet')}><MaterialCommunityIcons name="video-outline" size={14} color="#fff" /><Text className="text-white font-body-bold text-[10.5px]">Google Meet</Text></Pressable>
                    <Pressable className="flex-row gap-1 items-center px-2.5 h-8 rounded-lg border flex-1 justify-center" style={{ borderColor: 'rgba(34, 197, 94, 0.20)', backgroundColor: 'rgba(34, 197, 94, 0.08)' }} onPress={() => Platform.OS === 'web' ? window.open('https://zoom.us', '_blank') : toast.info('Opening Zoom')}><MaterialCommunityIcons name="video-box" size={14} color="#fff" /><Text className="text-white font-body-bold text-[10.5px]">Zoom</Text></Pressable>
                    <Pressable className="flex-row gap-1 items-center px-2.5 h-8 rounded-lg border flex-1 justify-center" style={{ backgroundColor: '#3f2a56', borderColor: '#5c3e7f' }} onPress={() => Platform.OS === 'web' ? window.open('https://teams.microsoft.com', '_blank') : toast.info('Opening Teams')}><MaterialCommunityIcons name="microsoft-teams" size={14} color="#fff" /><Text className="text-white font-body-bold text-[10.5px]">Teams</Text></Pressable>
                  </View>
                </View>
                <Pressable className="flex-row gap-1.5 items-center px-3.5 h-9 rounded-lg border justify-center mt-2.5" style={{ borderColor: 'rgba(20, 184, 166, 0.20)', backgroundColor: 'rgba(20, 184, 166, 0.05)' }} onPress={() => toast.info('Generating agenda', 'Creating a tailored agenda with AI...')}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={14} color="#00ffcc" /><Text className="text-[#00ffcc] font-body-bold text-[11.5px]">Generate Session Agenda</Text>
                </Pressable>
              </View>
            ) : (
              <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 items-center py-5">
                <MaterialCommunityIcons name="calendar-question" size={24} color={MC.dim} />
                <Text className="text-white font-body-bold text-[13px] mt-2">No Upcoming Sessions Scheduled</Text>
                <Pressable onPress={() => setActiveTab('sessions')} className="h-8 px-3.5 bg-tealP rounded-lg justify-center mt-3"><Text className="text-bg font-display-bold text-[11.5px]">Schedule New Session Now</Text></Pressable>
              </View>
            )}
            <View className="gap-2 mt-1">
              <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">✨ AI PROGRESS ANALYSIS</Text>
              {isAnalyzing ? (
                <View className="p-3 rounded-[10px] border items-center" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <MaterialCommunityIcons name="loading" size={16} color={MC.tealP} />
                  <Text className="text-dim font-body-semibold text-[11.5px]">Synthesizing custom student progress models...</Text>
                </View>
              ) : aiAnalysis ? (
                <View className="p-3 rounded-[10px] border" style={{ borderColor: 'rgba(20,184,166,0.30)', backgroundColor: 'rgba(20,184,166,0.03)' }}>
                  <Text className="text-white font-body-semibold text-xs leading-[18px]">{aiAnalysis}</Text>
                </View>
              ) : (
                <Pressable className="flex-row gap-1.5 items-center px-3.5 h-9 rounded-lg border self-start" style={{ borderColor: 'rgba(20, 184, 166, 0.20)', backgroundColor: 'rgba(20, 184, 166, 0.05)' }} onPress={handleRunAiAnalysis}>
                  <MaterialCommunityIcons name="sparkles" size={14} color="#00ffcc" /><Text className="text-[#00ffcc] font-body-bold text-[11.5px]">Analyze Progress</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {activeTab === 'sessions' && (
          <View className="gap-3.5">
            {st.lastSession && (
              <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 gap-2">
                <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">LAST COMPLETED SESSION</Text>
                <Text className="text-white font-body-bold text-[13px] mt-1">Covered Core Topics</Text>
                <Text className="text-muted font-body-semibold text-xs mt-1 leading-[18px]">{st.lastSession.notes}</Text>
              </View>
            )}
            <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 gap-2">
              <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">SCHEDULE A NEW SESSION</Text>
              <View className="gap-3 mt-2.5">
                <View>
                  <Text className="text-muted font-body-bold text-[10.5px] mb-1.5">SESSION TOPIC</Text>
                  <TextInput value={sessionTopic} onChangeText={setSessionTopic} placeholder="Enter session topic..." placeholderTextColor={MC.dim} className="bg-card border border-glass-border rounded-[10px] px-2.5 py-2 text-white text-[13px] font-body-semibold h-10" style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined} />
                </View>
                <View>
                  <Text className="text-muted font-body-bold text-[10.5px] mb-1.5">SELECT TIME SLOT</Text>
                  <View className="flex-row gap-1.5 flex-wrap">
                    {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => (
                      <Pressable key={t} onPress={() => setSelectedTime(t)} className="px-2.5 py-1.5 rounded-lg border" style={selectedTime === t ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)' }}>
                        <Text className="font-body-bold text-[11px]" style={{ color: selectedTime === t ? '#fff' : MC.tealP }}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="bg-card border border-glass-border rounded-xl p-3 mt-[5px]">
                  <View className="flex-row justify-between items-center mb-2.5">
                    <Pressable onPress={handlePrevMonth} className="w-7 h-7 rounded-[6px] items-center justify-center bg-white/[0.05]"><MaterialCommunityIcons name="chevron-left" size={16} color="#fff" /></Pressable>
                    <Text className="text-white font-body-bold text-[12.5px]">{MONTH_NAMES[calMonth]} {calYear}</Text>
                    <Pressable onPress={handleNextMonth} className="w-7 h-7 rounded-[6px] items-center justify-center bg-white/[0.05]"><MaterialCommunityIcons name="chevron-right" size={16} color="#fff" /></Pressable>
                  </View>
                  <View className="flex-row justify-between mb-2">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <Text key={i} className="text-dim font-body-bold text-[10.5px] w-[13%] text-center">{day}</Text>)}</View>
                  <View className="flex-row flex-wrap gap-[1.5%]">
                    {calendarCells.map((day, idx) => {
                      if (day === null) return <View key={`empty-${idx}`} className="w-[13%] h-[30px] mb-1" />;
                      const formatted = `${MONTH_NAMES[calMonth]} ${day}, 2026`;
                      const isSelected = pendingDate === formatted;
                      return (
                        <Pressable key={`day-${day}`} onPress={() => handleDaySelect(day)} className="w-[13%] h-[30px] items-center justify-center rounded-md mb-1" style={isSelected ? { backgroundColor: MC.tealP } : undefined}>
                          <Text className="font-body-semibold text-[11px]" style={{ color: isSelected ? MC.bg : '#fff', ...(isSelected ? { fontFamily: FONTS.bold } : {}) }}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {pendingDate && (
                  <Pressable disabled={isScheduling} onPress={handleConfirmSchedule} className="bg-tealP h-[42px] rounded-[10px] items-center justify-center mt-2.5" style={{ cursor: 'pointer', ...(isScheduling ? { opacity: 0.7 } : {}) }}>
                    {isScheduling ? <ActivityIndicator size="small" color={MC.bg} /> : <Text className="text-bg font-display-bold text-xs">Confirm Session for {pendingDate} at {selectedTime}</Text>}
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'notes' && (
          <View className="gap-3.5">
            <View className="bg-white/[0.02] border border-white/[0.06] rounded-[14px] p-3.5 gap-2">
              <Text className="text-dim font-body-bold text-[10px] tracking-[0.8px]">SESSION NOTES & FEEDBACK</Text>
              <Text className="text-muted font-body-semibold text-xs mt-1 mb-3">Write specific developmental notes, task assignments, or remarks. Arjun will see these on their profile.</Text>
              <TextInput value={notesText} onChangeText={setNotesText} placeholder="Type session logs, key takeaways, and action items..." placeholderTextColor={MC.dim} multiline numberOfLines={6} className="bg-card border border-glass-border rounded-[10px] p-3 text-white text-[13px] font-body-semibold min-h-[100px]" style={{ textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }} />
              <Pressable onPress={handleSaveNotes} className="flex-row gap-1.5 items-center px-3.5 h-[38px] rounded-lg bg-tealP justify-center mt-3">
                {isSaved ? <><MaterialCommunityIcons name="check" size={14} color="#fff" /><Text className="text-white font-display-bold text-xs">Notes Saved!</Text></> : <><MaterialCommunityIcons name="content-save-outline" size={14} color="#fff" /><Text className="text-white font-display-bold text-xs">Save Remarks & Notes</Text></>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
