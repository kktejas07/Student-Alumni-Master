/**
 * Student -> Achievements — gamification dashboard with streaks, badges,
 * weekly challenges, and a leaderboard. Wired to existing wallet gamification
 * endpoints (gamification_engine.py).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Trophy, Flame, Star, Target, Crown, Lock, Award, Zap, TrendingUp } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { usePalette } from '../tokens';

/* ── types ────────────────────────────────────────────────────────────── */

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface Badge {
  slug: string;
  title: string;
  rarity: Rarity;
  hint: string;
  earned: boolean;
  earned_at?: string;
}

interface CalendarDay {
  date: string;
  active: boolean;
  recovered?: boolean;
}

interface StreakData {
  current_streak: number;
  best_streak: number;
  calendar: CalendarDay[];
}

interface Challenge {
  id: string;
  title: string;
  target: number;
  progress: number;
  category: string;
  reward: number;
  claimed: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  my_rank: number;
}

/* ── constants ────────────────────────────────────────────────────────── */

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#64748B',
  uncommon: '#2DD4BF',
  rare: '#F59E0B',
  epic: '#A78BFA',
  legendary: '#EF4444',
};
const RARITY_BG: Record<Rarity, string> = {
  common: 'rgba(100,116,139,0.08)',
  uncommon: 'rgba(45,212,191,0.08)',
  rare: 'rgba(245,158,11,0.08)',
  epic: 'rgba(167,139,250,0.10)',
  legendary: 'rgba(239,68,68,0.08)',
};

/* ── component ───────────────────────────────────────────────────────── */

export function AchievementsView() {
  const P = usePalette();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [lbPeriod, setLbPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const load = useCallback(async () => {
    setLoading(true);
    const [sk, bg, ch, lb] = await Promise.allSettled([
      request('/wallet/streak').catch(() => null),
      request('/wallet/badges').catch(() => ({ badges: [] })),
      request('/wallet/challenges').catch(() => ({ challenges: [] })),
      request(`/wallet/leaderboard?period=${lbPeriod}&scope=college`).catch(() => null),
    ]);
    if (sk.status === 'fulfilled' && sk.value) setStreak(sk.value as StreakData);
    if (bg.status === 'fulfilled') setBadges(((bg.value as Record<string, unknown>)?.badges as Badge[]) || []);
    if (ch.status === 'fulfilled') setChallenges(((ch.value as Record<string, unknown>)?.challenges as Challenge[]) || []);
    if (lb.status === 'fulfilled' && lb.value) setLeaderboard(lb.value as LeaderboardData);
    setLoading(false);
  }, [lbPeriod]);

  useEffect(() => { load(); }, [load]);

  const claimChallenge = async (id: string) => {
    setClaimingId(id);
    try {
      await request(`/wallet/challenges/${id}/claim`, { method: 'POST' });
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, claimed: true } : c));
    } catch { /* silent */ }
    setClaimingId(null);
  };

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={P.violet} />
      </View>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const bestStreak = streak?.best_streak || 0;
  const calendar = streak?.calendar || [];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Trophy size={22} color={P.violet} />
        <Text style={[s.title, { color: P.text }]}>Achievements</Text>
      </View>

      {/* Streak Hero */}
      <View style={[s.streakHero, { backgroundColor: '#7C5CFC' }]}>
        <View style={s.streakTop}>
          <Flame size={36} color="#FCD34D" />
          <Text style={s.streakNum}>{currentStreak}</Text>
          <Text style={s.streakLabel}>Day Streak</Text>
        </View>
        <View style={s.streakMeta}>
          <View style={s.streakMetaItem}>
            <TrendingUp size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.streakMetaText}>Best: {bestStreak} days</Text>
          </View>
          <View style={s.streakMetaItem}>
            <Zap size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.streakMetaText}>Keep it going!</Text>
          </View>
        </View>

        {/* 21-day calendar */}
        {calendar.length > 0 && (
          <View style={s.streakCal}>
            {calendar.slice(-21).map((day: any, i: number) => {
              const isActive = day.active || day.recovered;
              const isRecovered = day.recovered;
              return (
                <View key={i} style={[
                  s.streakDay,
                  isActive && { backgroundColor: isRecovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)' },
                  !isActive && { backgroundColor: 'rgba(255,255,255,0.12)' },
                ]}>
                  <Text style={[s.streakDayText, { color: isActive ? '#7C5CFC' : 'rgba(255,255,255,0.4)' }]}>
                    {new Date(day.date).getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Badges */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Award size={18} color={P.violet} />
          <Text style={[s.sectionTitle, { color: P.text }]}>Badges</Text>
          <Text style={[s.badgeCount, { color: P.muted }]}>{badges.filter(b => b.earned).length}/{badges.length} earned</Text>
        </View>
        <View style={s.badgeGrid}>
          {badges.map((b, i) => {
            const rarity = b.rarity || 'common';
            const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;
            const bg = RARITY_BG[rarity] || RARITY_BG.common;
            return (
              <View key={i} style={[s.badgeCard, { backgroundColor: b.earned ? bg : '#F1F5F9', borderColor: b.earned ? color : '#E2E8F0' }]}>
                {!b.earned && <View style={s.badgeLock}><Lock size={16} color="#94A3B8" /></View>}
                <View style={[s.badgeIcon, { backgroundColor: b.earned ? color + '20' : '#E2E8F0' }]}>
                  <Star size={20} color={b.earned ? color : '#94A3B8'} />
                </View>
                <Text style={[s.badgeName, { color: b.earned ? P.text : '#94A3B8' }]}>{b.title}</Text>
                <Text style={[s.badgeRarity, { color }]}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</Text>
                <Text style={[s.badgeHint, { color: P.muted }]} numberOfLines={2}>{b.hint}</Text>
                {b.earned && b.earned_at && (
                  <Text style={[s.badgeDate, { color: P.dim }]}>Earned {new Date(b.earned_at).toLocaleDateString()}</Text>
                )}
              </View>
            );
          })}
          {badges.length === 0 && (
            <Text style={[s.emptyText, { color: P.dim }]}>No badges available yet. Keep using the platform to unlock them!</Text>
          )}
        </View>
      </View>

      {/* Weekly Challenge */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Target size={18} color={P.violet} />
          <Text style={[s.sectionTitle, { color: P.text }]}>Weekly Challenge</Text>
        </View>
        {challenges.length === 0 && (
          <View style={[s.challengeCard, { backgroundColor: P.bg1, borderColor: P.glassBorder }]}>
            <Text style={[s.emptyText, { color: P.dim }]}>No active challenges this week. Check back soon!</Text>
          </View>
        )}
        {challenges.map((ch, i) => {
          const progress = Math.min((ch.progress || 0) / (ch.target || 1), 1);
          const pct = Math.round(progress * 100);
          return (
            <View key={i} style={[s.challengeCard, { backgroundColor: P.bg1, borderColor: P.glassBorder }]}>
              <View style={s.challengeTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.challengeTitle, { color: P.text }]}>{ch.title || 'Weekly Challenge'}</Text>
                  <Text style={[s.challengeCat, { color: P.muted }]}>{ch.category || 'General'}</Text>
                </View>
                <View style={[s.rewardBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Zap size={14} color="#D97706" />
                  <Text style={s.rewardText}>+{ch.reward || 0} CR</Text>
                </View>
              </View>
              {/* Progress bar */}
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#10B981' : '#7C5CFC' }]} />
              </View>
              <View style={s.progressLabels}>
                <Text style={[s.progressText, { color: P.muted }]}>{ch.progress || 0} / {ch.target || 0}</Text>
                <Text style={[s.progressPct, { color: pct >= 100 ? '#10B981' : P.violet }]}>{pct}%</Text>
              </View>
              {pct >= 100 && !ch.claimed && (
                <Pressable
                  onPress={() => claimChallenge(ch.id)}
                  style={[s.claimBtn, { backgroundColor: '#10B981' }]}
                  disabled={claimingId === ch.id}
                >
                  {claimingId === ch.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.claimText}>Claim Reward</Text>}
                </Pressable>
              )}
              {ch.claimed && (
                <View style={[s.claimedBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={{ color: '#065F46', fontWeight: '600', fontSize: 13 }}>Claimed</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Leaderboard */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Crown size={18} color={P.violet} />
          <Text style={[s.sectionTitle, { color: P.text }]}>Leaderboard</Text>
          <View style={s.lbTabs}>
            {(['weekly', 'monthly'] as const).map(p => (
              <Pressable key={p} onPress={() => setLbPeriod(p)} style={[s.lbTab, lbPeriod === p && { backgroundColor: P.violet + '14' }]}>
                <Text style={[s.lbTabText, { color: lbPeriod === p ? P.violet : P.muted }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[s.lbCard, { backgroundColor: P.bg1, borderColor: P.glassBorder }]}>
          {(!leaderboard || !leaderboard.entries || leaderboard.entries.length === 0) ? (
            <Text style={[s.emptyText, { color: P.dim, padding: 20 }]}>Leaderboard data not available yet.</Text>
          ) : (
            <>
              {/* Table header */}
              <View style={[s.lbRow, s.lbHeaderRow]}>
                <Text style={[s.lbRank, s.lbHeaderText, { color: P.muted }]}>Rank</Text>
                <Text style={[s.lbName, s.lbHeaderText, { color: P.muted }]}>Name</Text>
                <Text style={[s.lbPoints, s.lbHeaderText, { color: P.muted }]}>Points</Text>
              </View>
              {(leaderboard.entries || []).slice(0, 10).map((entry: any, i: number) => {
                const isMe = entry.is_me || entry.rank === leaderboard.my_rank;
                const medal = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : null;
                return (
                  <View key={i} style={[s.lbRow, isMe && { backgroundColor: P.violet + '0A' }]}>
                    <View style={[s.lbRank, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      {medal ? (
                        <View style={[s.medalBadge, { backgroundColor: medal + '20' }]}>
                          <Text style={[s.medalText, { color: medal }]}>{entry.rank || i + 1}</Text>
                        </View>
                      ) : (
                        <Text style={[s.rankNum, { color: P.muted }]}>{entry.rank || i + 1}</Text>
                      )}
                    </View>
                    <Text style={[s.lbName, { color: isMe ? P.violet : P.text, fontWeight: isMe ? '700' : '500' }]}>
                      {entry.name || 'Anonymous'}{isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={[s.lbPoints, { color: P.text, fontWeight: '600' }]}>{(entry.points || 0).toLocaleString()}</Text>
                  </View>
                );
              })}
              {leaderboard.my_rank && leaderboard.my_rank > 10 && (
                <View style={[s.lbRow, { backgroundColor: P.violet + '08', borderTopWidth: 1, borderTopColor: P.glassBorder }]}>
                  <Text style={[s.lbRank, { color: P.violet, fontWeight: '700' }]}>{leaderboard.my_rank}</Text>
                  <Text style={[s.lbName, { color: P.violet, fontWeight: '700' }]}>You</Text>
                  <Text style={[s.lbPoints, { color: P.violet, fontWeight: '700' }]}>{(leaderboard.my_points || 0).toLocaleString()}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/* ── styles ──────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, maxWidth: 900, alignSelf: 'center', width: '100%', paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700' },

  /* streak hero */
  streakHero: { borderRadius: 20, padding: 28, marginBottom: 28, alignItems: 'center' },
  streakTop: { alignItems: 'center', marginBottom: 12 },
  streakNum: { fontSize: 48, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  streakLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  streakMeta: { flexDirection: 'row', gap: 24, marginBottom: 18 },
  streakMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  streakCal: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', maxWidth: 360 },
  streakDay: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  streakDayText: { fontSize: 11, fontWeight: '700' },

  /* sections */
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', flex: 1 },

  /* badges */
  badgeCount: { fontSize: 13, fontWeight: '500' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: 160, borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', position: 'relative' },
  badgeLock: { position: 'absolute', top: 8, right: 8 },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  badgeName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  badgeRarity: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  badgeHint: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  badgeDate: { fontSize: 10, marginTop: 6 },

  /* challenges */
  challengeCard: { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 10 },
  challengeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  challengeTitle: { fontSize: 15, fontWeight: '700' },
  challengeCat: { fontSize: 12, marginTop: 2 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rewardText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 12 },
  progressPct: { fontSize: 12, fontWeight: '700' },
  claimBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  claimText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  claimedBadge: { marginTop: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },

  /* leaderboard */
  lbTabs: { flexDirection: 'row', gap: 4 },
  lbTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  lbTabText: { fontSize: 13, fontWeight: '600' },
  lbCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  lbHeaderRow: { backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  lbHeaderText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  lbRank: { width: 60 },
  lbName: { flex: 1, fontSize: 14 },
  lbPoints: { width: 80, textAlign: 'right', fontSize: 14 },
  medalBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: 13, fontWeight: '800' },
  rankNum: { fontSize: 14, fontWeight: '500', width: 28, textAlign: 'center' },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },
});
