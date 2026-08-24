/**
 * Student → My Applications — lists internship applications.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Briefcase, CheckCircle, Clock } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
import { usePortalData } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

type App = { id: string; internship_title: string; company: string; status: string; applied_at: string };

export function MyApplicationsView() {
  const { email } = useCurrentUser('booked1@persona.demo');
  const { data } = usePortalData<{ items: App[]; count: number }>(
    `/student/my-applications?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const items = data?.items || [];

  return (
    <View className="gap-3.5">
      <View>
        <Text
          className="text-white text-[22px] tracking-tight"
          style={{ fontFamily: FONTS.xbold }}
        >
          My Applications
        </Text>
        <Text
          className="text-muted text-xs mt-1"
          style={{ fontFamily: FONTS.med }}
        >
          {items.length} applications · auto-refreshes every 30s
        </Text>
      </View>
      <View className="gap-2">
        {items.map((a, idx) => (
          <GlassCard
            key={a.id}
            delay={idx * 30}
            radius={12}
            padding={14}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View className="w-[38px] h-[38px] rounded-[10px] bg-violet/10 border border-violet/30 items-center justify-center">
              <Briefcase size={18} color={SC.accentBright} />
            </View>
            <View className="flex-1 min-w-0">
              <Text
                className="text-white text-[13.5px]"
                style={{ fontFamily: FONTS.bold }}
              >
                {a.internship_title}
              </Text>
              <Text
                className="text-muted text-[11.5px] mt-0.5"
                style={{ fontFamily: FONTS.med }}
              >
                {a.company} · applied {a.applied_at ? String(a.applied_at).slice(0, 10) : '—'}
              </Text>
            </View>
            <View
              className={`flex-row items-center gap-1.5 px-[9px] py-1 rounded-md border ${
                a.status === 'submitted'
                  ? 'bg-yellow-400/10 border-yellow-400/30'
                  : 'bg-green-500/10 border-green-500/30'
              }`}
            >
              {a.status === 'submitted' ? <Clock size={11} color="#FBBF24" /> : <CheckCircle size={11} color="#22C55E" />}
              <Text
                className="text-[10.5px] capitalize"
                style={{
                  fontFamily: FONTS.bold,
                  color: a.status === 'submitted' ? '#FBBF24' : '#22C55E',
                }}
              >
                {a.status}
              </Text>
            </View>
          </GlassCard>
        ))}
        {items.length === 0 && (
          <EmptyState
            variant="applications"
            title="No applications yet"
            body="Once you hit Apply on an internship, you'll see its progress, status, and recruiter feedback right here."
          />
        )}
      </View>
    </View>
  );
}
