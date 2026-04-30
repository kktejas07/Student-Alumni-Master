/**
 * Profile Tab — wired to REAL data:
 *   - Booking history from /api/bookings/me (full list, last 5 shown inline)
 *   - Hours mentored aggregated from completed sessions
 *   - Reviews summary for mentors (count + average from /api/mentors/{id}/reviews)
 *   - Notification inbox row with unread badge
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  LogOut, Sparkles, Settings, Shield, HelpCircle, ChevronRight,
  Briefcase, Home as HomeIcon, CreditCard, ShieldCheck, Calendar,
  Users as UsersIcon, Star, Bell, Clock, TrendingUp,
  Award, Plus, Trash2, X as CloseX,
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Radius } from '@/src/theme';
import { Button, Card, AnimatedCard, SALogo } from '@/src/views/components';
import { useAuth } from '@/src/viewmodels/hooks';
import { api, request } from '@/src/models/services/api';
import { BadgeStack, type Badge } from '@/src/views/web/Badges';
import { CertificatesCard } from '@/src/views/web/CertificatesCard';

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    // Bookings
    try {
      const r = await api.myBookings();
      setBookings(r.bookings || []);
    } catch {}
    // Reviews (only for mentors)
    if (user.role === 'mentor') {
      try {
        const r = await api.mentorReviews(user.id);
        setReviewStats(r.stats);
      } catch {}
    }
    // Notifications unread badge
    try {
      const r = await api.notifications();
      setUnreadCount(r.unread || 0);
    } catch {}
    // Earned badges
    try {
      const r = await request<{ badges: Badge[] }>('/users/me/badges');
      setBadges(r.badges || []);
    } catch {}
  }, [user]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  if (!user) return null;
  const initial = user.full_name?.[0]?.toUpperCase() || 'U';

  // Real metrics
  const completedBookings = bookings.filter((b: any) => b.status === 'completed');
  const upcomingBookings = bookings.filter((b: any) =>
    b.status === 'pending' || b.status === 'confirmed'
  );
  const totalMinutes = completedBookings.reduce((sum: number, b: any) =>
    sum + (b.duration_minutes || 30), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/notifications' as any)}
              style={styles.bellBtn}
              testID="profile-bell-btn"
            >
              <Bell size={20} color={C.deepPurple} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <SALogo size={28} variant="gradient" />
          </View>
        </View>

        {/* User card with avatar */}
        <Card style={styles.userCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {user.face_image_base64 ? (
              <Image source={{ uri: user.face_image_base64 }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h3, { color: C.textPrimary }]}>{user.full_name}</Text>
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{user.email}</Text>
              <View style={styles.roleTag}>
                <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Real stats — wired to bookings + reviews */}
          {(user.role === 'student' || user.role === 'mentor') && (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Calendar size={16} color={C.brandPurple} />
                <Text style={styles.statValue}>{bookings.length}</Text>
                <Text style={styles.statLabel}>
                  {user.role === 'mentor' ? 'SESSIONS' : 'BOOKINGS'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Clock size={16} color={C.brandPurple} />
                <Text style={styles.statValue}>{totalHours}h</Text>
                <Text style={styles.statLabel}>
                  {user.role === 'mentor' ? 'MENTORED' : 'COMPLETED'}
                </Text>
              </View>
              {user.role === 'mentor' && reviewStats?.total > 0 ? (
                <View style={styles.statBox}>
                  <Star size={16} color={C.warning} fill={C.warning} />
                  <Text style={styles.statValue}>{reviewStats.average}</Text>
                  <Text style={styles.statLabel}>{reviewStats.total} REVIEWS</Text>
                </View>
              ) : (
                <View style={styles.statBox}>
                  <Briefcase size={16} color={C.brandPurple} />
                  <Text style={styles.statValue}>{user.skills?.length || 0}</Text>
                  <Text style={styles.statLabel}>SKILLS</Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Two-stack badges: CREDENTIALS (qualifications) + ENGAGEMENT (activity) */}
        {(() => {
          const credentials = badges.filter((b: any) => b.kind === 'credential');
          const engagement = badges.filter((b: any) => b.kind === 'engagement' || b.kind === 'verification' || b.kind === 'special');
          if (badges.length === 0) return null;
          return (
            <Card style={styles.badgesCard} testID="profile-badges-card">
              {credentials.length > 0 && (
                <View style={{ marginBottom: engagement.length > 0 ? 16 : 0 }}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>🎓 Credentials</Text>
                    <Text style={styles.badgeCount}>{credentials.length} earned</Text>
                  </View>
                  <Text style={styles.subhint}>Based on your qualifications, institution & certificates</Text>
                  <View style={{ marginTop: 10 }}>
                    <BadgeStack badges={credentials} max={20} compact size="md" />
                  </View>
                </View>
              )}
              {engagement.length > 0 && (
                <View style={[
                  credentials.length > 0 && { borderTopColor: 'rgba(0,0,0,0.06)', borderTopWidth: 1, paddingTop: 14 },
                ]}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>🏆 Achievements</Text>
                    <Text style={styles.badgeCount}>{engagement.length} earned</Text>
                  </View>
                  <Text style={styles.subhint}>Based on your platform activity & verifications</Text>
                  <View style={{ marginTop: 10 }}>
                    <BadgeStack badges={engagement} max={20} compact size="md" />
                  </View>
                </View>
              )}
            </Card>
          );
        })()}

        {/* Certificates — list + add + delete (refreshes badges on change) */}
        <CertificatesCard onChanged={refresh} />

        {/* Recent Bookings — REAL DATA */}
        {bookings.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>
                {user.role === 'mentor' ? 'Recent sessions' : 'Recent bookings'}
              </Text>
              {upcomingBookings.length > 0 && (
                <View style={styles.upcomingPill}>
                  <Text style={styles.upcomingPillText}>{upcomingBookings.length} upcoming</Text>
                </View>
              )}
            </View>
            <View style={{ gap: 8 }}>
              {bookings.slice(0, 5).map((b: any, idx: number) => (
                <AnimatedCard
                  key={b.id || idx}
                  style={styles.bookingCard}
                  index={idx}
                  testID={`profile-booking-${idx}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>
                      {user.role === 'mentor' ? b.student_name : b.mentor_name}
                    </Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={1}>
                      {b.topic}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Calendar size={11} color={C.textMuted} />
                      <Text style={[Typography.bodySm, { color: C.textMuted, fontSize: 11 }]}>
                        {formatBookingDate(b.scheduled_at || b.slot_start_iso)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, statusStyle(b.status)]}>
                    <Text style={styles.statusText}>{(b.status || 'pending').toUpperCase()}</Text>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          </>
        )}

        {/* QR + Unique ID */}
        {user.qr_code_base64 && (
          <Card style={[styles.qrCard]} bg={C.deepPurple}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={[Typography.label, { color: C.lightPurple }]}>YOUR PLATFORM ID</Text>
              <Text style={[Typography.h3, { color: C.white }]} testID="profile-unique-id">
                {user.unique_id}
              </Text>
              <View style={styles.qrFrame}>
                <Image source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
                  style={styles.qr} testID="profile-qr-image" />
              </View>
              <Text style={[Typography.bodySm, { color: C.lightPurple, textAlign: 'center' }]}>
                Mentors & alumni can scan to connect with you instantly.
              </Text>
            </View>
          </Card>
        )}

        {/* Institution info */}
        {user.school_info && (
          <Card style={{ marginTop: 14 }}>
            <Text style={[Typography.label, { color: C.textSecondary }]}>INSTITUTION</Text>
            <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 4 }]}>
              {user.school_info.institution_name}
            </Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
              {user.school_info.class_or_year}
              {user.school_info.branch_or_stream ? ` · ${user.school_info.branch_or_stream}` : ''}
            </Text>
            {user.career_path && (
              <View style={{ marginTop: 8 }}>
                <Text style={[Typography.label, { color: C.textSecondary }]}>CAREER PATH</Text>
                <Text style={[Typography.bodyBold, { color: C.brandPurple, marginTop: 2 }]}>
                  {user.career_path.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Quick links</Text>
        <View style={{ gap: 10 }}>
          {(user.role === 'admin' || user.role === 'mentor' || user.role === 'college') && (
            <Row icon={TrendingUp} label="Analytics dashboard"
              onPress={() => router.push('/analytics' as any)}
              tint="#00A78E"
              testID="profile-row-analytics" />
          )}
          <Row icon={Bell} label="Notifications"
            badge={unreadCount > 0 ? String(unreadCount) : undefined}
            onPress={() => router.push('/notifications' as any)}
            testID="profile-row-notifications" />
          <Row icon={Sparkles} label="My AI Career Roadmap"
            onPress={() => router.push('/(tabs)')} testID="profile-row-roadmap" />
          <Row icon={Calendar} label="My Bookings"
            onPress={() => router.push('/(tabs)/network')} testID="profile-row-bookings" />
          <Row icon={Briefcase} label="Internships"
            onPress={() => router.push('/internships')} testID="profile-row-internships" />
          <Row icon={HomeIcon} label="Housing & Insurance"
            onPress={() => router.push('/resources')} testID="profile-row-resources" />
        </View>

        {/* Admin-only section */}
        {user.role === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>Admin</Text>
            <Row icon={ShieldCheck} label="Mentor Approval Queue"
              tint={C.brandPurple}
              onPress={() => router.push('/admin/mentors')}
              testID="profile-row-admin-mentors" />
          </>
        )}

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={{ gap: 10 }}>
          <Row icon={Settings} label="Edit Preferences"
            onPress={() => router.push('/preferences' as any)}
            testID="profile-row-settings" />
          <Row icon={Shield} label="Privacy & Security" onPress={() => {}} testID="profile-row-privacy" />
          <Row icon={HelpCircle} label="Help & Support" onPress={() => {}} testID="profile-row-help" />
        </View>

        <Button title="Log out" variant="secondary"
          icon={<LogOut size={18} color={C.brandPurple} />}
          onPress={handleLogout} testID="profile-logout-btn"
          style={{ marginTop: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Row component — clickable list item with icon, label, chevron. */
function Row({ icon: Icon, label, onPress, testID, tint, badge }: any) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} activeOpacity={0.7}>
      <Card style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: tint || C.palePurple }]}>
          <Icon size={18} color={tint ? C.white : C.deepPurple} />
        </View>
        <Text style={[Typography.bodyBold, { color: C.textPrimary, flex: 1 }]}>{label}</Text>
        {badge && (
          <View style={styles.rowBadge}>
            <Text style={styles.rowBadgeText}>{badge}</Text>
          </View>
        )}
        <ChevronRight size={20} color={C.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

/** Format a booking ISO date as "Sat, Jan 25 · 3:00 PM" or "Past" if undefined. */
function formatBookingDate(iso?: string): string {
  if (!iso) return 'Date TBD';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Date TBD';
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

/** Per-status pill colors for booking cards. */
function statusStyle(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return { backgroundColor: 'rgba(15,157,88,0.15)', borderColor: 'rgba(15,157,88,0.4)' };
    case 'confirmed':
      return { backgroundColor: 'rgba(95,37,159,0.15)', borderColor: 'rgba(95,37,159,0.4)' };
    case 'cancelled':
      return { backgroundColor: 'rgba(179,38,30,0.12)', borderColor: 'rgba(179,38,30,0.35)' };
    default: // pending
      return { backgroundColor: 'rgba(232,163,23,0.15)', borderColor: 'rgba(232,163,23,0.4)' };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h2, color: C.textPrimary },
  userCard: { padding: 18 },
  badgesCard: { padding: 16, marginTop: 14 },
  badgeCount: {
    color: C.brandPurple, fontFamily: 'DMSans_700Bold', fontSize: 11,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  subhint: {
    color: 'rgba(11,5,16,0.55)', fontFamily: 'DMSans_400Regular',
    fontSize: 11.5, marginTop: 4,
  },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.surfaceMuted },
  avatarFallback: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: C.palePurple, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: 'DMSans_700Bold', fontSize: 30, color: C.deepPurple },
  roleTag: {
    alignSelf: 'flex-start', backgroundColor: C.palePurple,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6,
  },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statBox: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: C.surfaceMuted, padding: 12, borderRadius: 12,
  },
  statValue: { ...Typography.h3, color: C.textPrimary, fontSize: 22 },
  statLabel: { ...Typography.label, color: C.textSecondary, fontSize: 9 },
  qrCard: { marginTop: 14, padding: 18 },
  qrFrame: { backgroundColor: C.white, padding: 8, borderRadius: 12, marginVertical: 4 },
  qr: { width: 160, height: 160 },
  sectionTitle: { ...Typography.label, color: C.textSecondary, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBadge: {
    backgroundColor: C.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 22,
    alignItems: 'center',
  },
  rowBadgeText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  // Notification bell button + badge
  bellBtn: {
    width: 40, height: 40, borderRadius: 999,
    backgroundColor: C.palePurple,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 999,
    backgroundColor: C.danger,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: C.background,
  },
  bellBadgeText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 10 },

  // Recent bookings list
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  upcomingPill: {
    backgroundColor: C.palePurple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  upcomingPillText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: C.deepPurple,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    color: C.textPrimary,
    letterSpacing: 0.6,
  },
});
