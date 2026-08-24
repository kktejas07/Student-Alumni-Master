/**
 * Mentor Portal — Session Requests view.
 * Each card has student info, topic, date, AI fit-score and Accept/Decline.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { SESSION_REQUESTS } from '../data';
import { api } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';

export type Decision = 'pending' | 'accepted' | 'declined';

export interface RequestsViewProps {
  decisions: Record<number, Decision>;
  onSetDecision: (id: number, d: Decision) => void;
  demoMode?: boolean;
}

export function RequestsView({ decisions, onSetDecision, demoMode = false }: RequestsViewProps) {
  const toast = useToast();
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await api.myBookings();
      if (res && res.bookings) {
        setRealBookings(res.bookings);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDecision = async (req: any, decision: 'accepted' | 'declined') => {
    if (req.isMock) {
      onSetDecision(req.id, decision);
      toast.success(decision === 'accepted' ? 'Request accepted' : 'Request declined');
      return;
    }
    try {
      if (decision === 'accepted') {
        await api.confirmBooking(req.id);
        setRealBookings(prev => prev.map(b => b.id === req.id ? { ...b, status: 'confirmed' } : b));
        toast.success('Request accepted', `${req.studentName || 'Student'} session confirmed.`);
      } else {
        await api.declineBooking(req.id);
        setRealBookings(prev => prev.map(b => b.id === req.id ? { ...b, status: 'cancelled' } : b));
        toast.success('Request declined');
      }
    } catch (err: any) {
      toast.error(decision === 'accepted' ? 'Accept failed' : 'Decline failed', err?.message || 'Please try again.');
    }
  };

  const allRequests = useMemo(() => {
    const mocks = demoMode ? SESSION_REQUESTS.map(req => {
      const d = decisions[req.id] || 'pending';
      return {
        ...req,
        id: req.id,
        status: d === 'accepted' ? 'confirmed' : d === 'declined' ? 'cancelled' : 'pending',
        isMock: true
      };
    }) : [];

    const reals = realBookings.map(b => {
      const initials = (b.student_name || 'Student')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      
      let timeStr = b.slot_start_iso;
      let daysAway = 0;
      try {
        const d = new Date(b.slot_start_iso);
        timeStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + 
                  ' · ' + 
                  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        daysAway = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
      } catch (err) {}

      return {
        id: b.id,
        studentName: b.student_name || 'Student',
        avatar: initials,
        color: '#8B5CF6',
        college: 'IIT Bombay',
        branch: 'B.Tech CS',
        year: 2026,
        topic: b.topic || 'Mentorship session',
        time: timeStr,
        daysAway,
        type: 'free' as const,
        status: b.status || 'pending',
        isMock: false
      };
    });

    return [...reals, ...mocks];
  }, [realBookings, decisions, demoMode]);

  const aiScore = (topic: string) => {
    const k = topic.toLowerCase();
    if (k.includes('system')) return { score: 96, label: 'Excellent fit' };
    if (k.includes('startup')) return { score: 89, label: 'Strong fit' };
    if (k.includes('career')) return { score: 84, label: 'Good fit' };
    return { score: 72, label: 'Fair fit' };
  };

  const stats = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let declined = 0;
    for (const req of allRequests) {
      if (req.status === 'pending') {
        pending++;
      } else if (req.status === 'confirmed' || req.status === 'accepted' || req.status === 'completed') {
        accepted++;
      } else {
        declined++;
      }
    }
    return { pending, accepted, declined };
  }, [allRequests]);

  if (loading) {
    return (
      <View className="p-10 items-center justify-center">
        <ActivityIndicator size="large" color={MC.tealP} />
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row gap-3 mb-4">
        {[{ k: 'Pending', v: stats.pending, c: MC.amber },
          { k: 'Accepted', v: stats.accepted, c: MC.green },
          { k: 'Declined', v: stats.declined, c: MC.red }].map((st) => (
          <View key={st.k} className="flex-1 bg-card border border-glass-border rounded-xl p-3.5">
            <Text className="text-[22px] font-display-bold" style={{ color: st.c }}>{st.v}</Text>
            <Text className="text-muted font-body-bold text-[11px]">{st.k}</Text>
          </View>
        ))}
      </View>

      <View className="gap-3">
        {allRequests.map((req) => {
          const ai = aiScore(req.topic);
          return (
            <View key={req.id} className="bg-card border border-glass-border rounded-[14px] p-4">
              <View className="flex-row items-center gap-3">
                <Av initials={req.avatar} size={48} color={req.color} />
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-body-bold text-[14px]">{req.studentName}</Text>
                    <Badge label={req.type === 'paid' ? `Paid ₹${req.amount}` : 'Free'} color={req.type === 'paid' ? 'green' : 'teal'} />
                  </View>
                  <Text className="text-muted font-body-semibold text-xs mt-0.5">{req.college} · {req.branch} · {req.year}</Text>
                  <Text className="text-white font-body-semibold text-[13px] mt-1.5">"{req.topic}"</Text>
                  <Text className="text-dim font-body-semibold text-[11px] mt-1">{req.time}</Text>
                </View>
                <Countdown days={req.daysAway} />
              </View>

              <View className="flex-row gap-2.5 items-center mt-3.5 p-3 rounded-[10px]" style={{ backgroundColor: 'rgba(252,211,77,0.06)', borderColor: 'rgba(252,211,77,0.20)', borderWidth: 1 }}>
                <View className="w-7 h-7 rounded-[8px] items-center justify-center" style={{ backgroundColor: 'rgba(252,211,77,0.15)' }}>
                  <Sparkles size={13} color="#FCD34D" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-amber font-display-bold text-[11px] tracking-[0.6px]">AI FIT SCORE · {ai.score}/100 · {ai.label}</Text>
                  <View className="h-1 rounded-[2px] bg-white/[0.06] overflow-hidden mt-1.5">
                    <View className="h-full bg-amber rounded-[2px]" style={{ width: `${ai.score}%` }} />
                  </View>
                </View>
              </View>

              {req.status === 'pending' ? (
                <View className="flex-row gap-2.5 mt-3">
                  <Pressable onPress={() => handleDecision(req, 'accepted')} className="flex-row gap-1.5 items-center px-4 h-9 rounded-[10px] bg-tealP">
                    <Check size={14} color={MC.bg} /><Text className="text-bg font-display-bold text-xs">Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDecision(req, 'declined')} className="flex-row gap-1.5 items-center px-4 h-9 rounded-[10px] border" style={{ borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' }}>
                    <X size={14} color={MC.red} /><Text className="text-rose font-body-bold text-xs">Decline</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="mt-3 self-start">
                  <Badge 
                    label={
                      req.status === 'confirmed' || req.status === 'accepted'
                        ? 'Accepted ✓'
                        : req.status === 'completed'
                        ? 'Completed ✓'
                        : req.status === 'expired'
                        ? 'Expired'
                        : 'Declined'
                    }
                    color={
                      req.status === 'confirmed' || req.status === 'accepted' || req.status === 'completed'
                        ? 'green'
                        : 'red'
                    }
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
