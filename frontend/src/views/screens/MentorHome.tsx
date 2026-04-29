/**
 * MentorHome — replaces the default 8-module student dashboard for mentor users.
 *
 * Layout (mobile-first):
 *  1. Hero header with greeting + earnings/rating glance + notification bell
 *  2. KPI strip: Sessions · Hours mentored · Rating · Pending requests
 *  3. "Post a Session" primary CTA
 *  4. Upcoming sessions list (next 5 from /api/bookings/me filtered by status)
 *  5. Pending requests row (status=pending — needs accept/decline)
 *  6. Recent reviews preview
 *  7. Quick actions: Analytics · Availability · Edit Profile · Knowledge Rooms
 *
 * Data sources:
 *   - /api/bookings/me (mentor view: returns bookings where mentor_id == self)
 *   - /api/mentors/{id}/reviews
 *   - /api/notifications
 *   - /api/analytics  (mentor scope)
 *
 * Action endpoints used:
 *   - POST /api/bookings/{id}/confirm    (NEW — see backend addition)
 *   - POST /api/bookings/{id}/decline    (NEW — see backend addition)
 *   - POST /api/mentor/sessions          (NEW — session/availability post)
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Plus,
  CalendarDays,
  Users,
  CircleCheck,
  CircleX,
  CheckCheck,
  ChevronRight,
  MessageSquare,
  Settings,
  X,
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Radius, Gradients } from '@/src/theme';
import { Card, AnimatedCard, SALogo, Button } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';

export default function MentorHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [b, r, n] = await Promise.all([
        api.myBookings().catch(() => ({ bookings: [] })),
        api.mentorReviews(user.id).catch(() => ({ reviews: [], stats: null })),
        api.notifications().catch(() => ({ unread: 0 })),
      ]);
      setBookings(b.bookings || []);
      setReviews(((r.reviews || r.items) || []).slice(0, 3));
      setReviewStats(r.stats || null);
      setUnread(n.unread || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!user) return null;

  const pending = bookings.filter((b) => b.status === 'pending');
  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  );
  const completed = bookings.filter((b) => b.status === 'completed');
  const totalMinutes = completed.reduce((s, b) => s + (b.duration_minutes || 30), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const earningsEst = completed.length * (user.mentor_rate_inr || 500); // placeholder rate

  const onAccept = async (id: string) => {
    try {
      await api.confirmBooking(id);
      refresh();
    } catch (e: any) {
      showAlert('Could not confirm', e.message || 'Try again later');
    }
  };
  const onDecline = async (id: string) => {
    try {
      await api.declineBooking(id);
      refresh();
    } catch (e: any) {
      showAlert('Could not decline', e.message || 'Try again later');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brandPurple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      {/* HERO */}
      <LinearGradient
        colors={Gradients.heroDiagonal as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.heroRow}>
            <SALogo size={36} variant="white" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroKicker}>MENTOR PORTAL</Text>
              <Text style={styles.heroGreeting} numberOfLines={1}>
                Hi, {user.full_name?.split(' ')[0] || 'there'} 👋
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/notifications' as any)}
              testID="mentor-bell"
              style={styles.heroIconBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: true }}
            >
              <Bell size={20} color={C.white} />
              {unread > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              testID="mentor-profile"
              style={[styles.heroIconBtn, { marginLeft: 8 }]}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: true }}
            >
              <Settings size={20} color={C.white} />
            </Pressable>
          </View>

          {/* Pending review banner */}
          {user.mentor_status === 'pending' && (
            <View style={styles.pendingBanner}>
              <Clock size={14} color="#FFB454" />
              <Text style={styles.pendingBannerText}>
                Your mentor profile is under review (24-48h). Bookings unlock once approved.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
            }}
            tintColor={C.brandPurple}
          />
        }
      >
        {/* KPI STRIP — 4 metrics */}
        <View style={styles.kpiRow}>
          <KpiTile
            icon={Calendar}
            value={String(bookings.length)}
            label="SESSIONS"
            color={C.brandPurple}
            testID="kpi-sessions"
          />
          <KpiTile
            icon={Clock}
            value={`${totalHours}h`}
            label="MENTORED"
            color="#0F9D58"
            testID="kpi-hours"
          />
          <KpiTile
            icon={Star}
            value={reviewStats?.total > 0 ? String(reviewStats.average) : '—'}
            label={reviewStats?.total > 0 ? `${reviewStats.total} REVIEWS` : 'NO REVIEWS'}
            color="#E8A317"
            fillStar
            testID="kpi-rating"
          />
          <KpiTile
            icon={TrendingUp}
            value={`₹${earningsEst.toLocaleString('en-IN')}`}
            label="EST. EARNINGS"
            color="#7B3DBF"
            testID="kpi-earnings"
          />
        </View>

        {/* POST A SESSION CTA */}
        <TouchableOpacity
          onPress={() => setShowPostModal(true)}
          activeOpacity={0.85}
          testID="mentor-post-session"
        >
          <LinearGradient
            colors={['#7B3DBF', '#5F259F'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.postCta}
          >
            <View style={styles.postCtaIcon}>
              <Plus size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.postCtaTitle}>Post a Session</Text>
              <Text style={styles.postCtaSub}>
                Open a slot for students to book — group or 1:1
              </Text>
            </View>
            <ChevronRight size={20} color={C.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* PENDING REQUESTS — needs action */}
        {pending.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <View style={styles.urgentPill}>
                <Text style={styles.urgentPillText}>{pending.length} NEW</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {pending.slice(0, 3).map((b) => (
                <PendingCard
                  key={b.id}
                  booking={b}
                  onAccept={() => onAccept(b.id)}
                  onDecline={() => onDecline(b.id)}
                />
              ))}
            </View>
          </>
        )}

        {/* UPCOMING SESSIONS */}
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        {upcoming.filter((b) => b.status === 'confirmed').length === 0 ? (
          <Card style={styles.emptyCard}>
            <CalendarDays size={32} color={C.lightPurple} />
            <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 8 }]}>
              No upcoming sessions
            </Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              Post a session above to start receiving bookings.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {upcoming
              .filter((b) => b.status === 'confirmed')
              .slice(0, 5)
              .map((b, i) => (
                <AnimatedCard key={b.id || i} index={i} style={styles.sessionCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>
                      {b.student_name || 'Student'}
                    </Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={1}>
                      {b.topic || 'Career session'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Calendar size={11} color={C.textMuted} />
                      <Text style={[Typography.bodySm, { color: C.textMuted, fontSize: 11 }]}>
                        {formatDate(b.scheduled_at || b.slot_start_iso)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.confirmedPill}>
                    <Text style={styles.confirmedPillText}>CONFIRMED</Text>
                  </View>
                </AnimatedCard>
              ))}
          </View>
        )}

        {/* RECENT REVIEWS */}
        {reviews.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.viewAllLink}>See all →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {reviews.map((r, i) => (
                <Card key={r.id || i} style={styles.reviewCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        size={14}
                        color={idx < r.rating ? '#E8A317' : C.border}
                        fill={idx < r.rating ? '#E8A317' : 'none'}
                      />
                    ))}
                    <Text style={[Typography.bodySm, { color: C.textMuted, fontSize: 11, marginLeft: 4 }]}>
                      {formatRelative(r.created_at)}
                    </Text>
                  </View>
                  {r.comment && (
                    <Text
                      style={[Typography.body, { color: C.textPrimary, marginTop: 8, lineHeight: 20 }]}
                      numberOfLines={3}
                    >
                      "{r.comment}"
                    </Text>
                  )}
                  <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>
                    — {r.user_name || 'Anonymous student'}
                  </Text>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* QUICK ACTIONS GRID */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionTile
            icon={TrendingUp}
            label="Analytics"
            tint="#0F9D58"
            onPress={() => router.push('/analytics')}
            testID="action-analytics"
          />
          <ActionTile
            icon={Users}
            label="Knowledge Rooms"
            tint="#7B3DBF"
            onPress={() => router.push('/rooms')}
            testID="action-rooms"
          />
          <ActionTile
            icon={MessageSquare}
            label="Messages"
            tint="#1A73E8"
            onPress={() => router.push('/chat')}
            testID="action-chat"
          />
          <ActionTile
            icon={Settings}
            label="Edit Profile"
            tint="#E8A317"
            onPress={() => router.push('/(tabs)/profile')}
            testID="action-edit"
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* POST SESSION MODAL */}
      <PostSessionModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        onPosted={() => {
          setShowPostModal(false);
          refresh();
        }}
      />
    </View>
  );
}

// =================== Sub components ===========================================
function KpiTile({
  icon: Icon,
  value,
  label,
  color,
  fillStar,
  testID,
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
  fillStar?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.kpiTile]} testID={testID}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1A` }]}>
        <Icon size={16} color={color} fill={fillStar ? color : 'none'} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function PendingCard({
  booking,
  onAccept,
  onDecline,
}: {
  booking: any;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card style={styles.pendingCard}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View style={styles.pendingDot} />
          <Text style={[Typography.label, { color: '#E8A317', fontSize: 10 }]}>NEW REQUEST</Text>
        </View>
        <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>
          {booking.student_name || 'Student'}
        </Text>
        <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={2}>
          {booking.topic || 'Career mentorship session'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <Calendar size={11} color={C.textMuted} />
          <Text style={[Typography.bodySm, { color: C.textMuted, fontSize: 11 }]}>
            {formatDate(booking.scheduled_at || booking.slot_start_iso)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity onPress={onAccept} style={styles.acceptBtn} testID={`accept-${booking.id}`}>
            <CircleCheck size={14} color={C.white} />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline} style={styles.declineBtn} testID={`decline-${booking.id}`}>
            <CircleX size={14} color={C.danger} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

function ActionTile({
  icon: Icon,
  label,
  tint,
  onPress,
  testID,
}: {
  icon: any;
  label: string;
  tint: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} testID={testID} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Card style={styles.actionTile}>
        <View style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}>
          <Icon size={18} color={tint} />
        </View>
        <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 8 }]}>{label}</Text>
      </Card>
    </TouchableOpacity>
  );
}

function PostSessionModal({
  visible,
  onClose,
  onPosted,
}: {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('30');
  const [maxAttendees, setMaxAttendees] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setTopic('');
    setDate('');
    setDuration('30');
    setMaxAttendees('1');
  };

  const submit = async () => {
    if (!title.trim() || !topic.trim() || !date.trim()) {
      showAlert('Missing info', 'Please fill title, topic and date.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createMentorSession({
        title: title.trim(),
        topic: topic.trim(),
        scheduled_at: date.trim(),
        duration_minutes: parseInt(duration, 10) || 30,
        max_attendees: parseInt(maxAttendees, 10) || 1,
      });
      reset();
      onPosted();
    } catch (e: any) {
      showAlert('Could not post', e.message || 'Try again later');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post a Session</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>
            Students will see this in their feed and can request to book.
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <Field label="Title *" placeholder="e.g., Cracking Product Manager interviews" value={title} onChangeText={setTitle} />
            <Field label="Topic / Description *" placeholder="What will you cover?" value={topic} onChangeText={setTopic} multiline />
            <Field
              label="Date & Time *"
              placeholder="e.g., 2025-07-15 18:30"
              value={date}
              onChangeText={setDate}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Duration (min)" placeholder="30" keyboardType="numeric" value={duration} onChangeText={setDuration} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Max attendees" placeholder="1" keyboardType="numeric" value={maxAttendees} onChangeText={setMaxAttendees} />
              </View>
            </View>

            <Button
              title={submitting ? 'Posting...' : 'Post Session'}
              loading={submitting}
              onPress={submit}
              icon={!submitting ? <CheckCheck size={16} color={C.white} /> : undefined}
              style={{ marginTop: 18 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.fieldInput, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

// =================== Helpers ===========================================
function showAlert(title: string, body: string) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    (globalThis as any).alert?.(`${title}\n${body}`);
  } else {
    Alert.alert(title, body);
  }
}

function formatDate(iso?: string): string {
  if (!iso) return 'Date TBD';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso?: string): string {
  if (!iso) return 'recently';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// =================== Styles ============================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  heroKicker: { ...Typography.label, color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  heroGreeting: { ...Typography.h3, color: C.white, marginTop: 2, fontSize: 20 },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.deepPurple,
  },
  bellBadgeText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 10 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,180,84,0.15)',
    borderColor: 'rgba(255,180,84,0.4)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  pendingBannerText: { ...Typography.bodySm, color: C.white, flex: 1 },

  // Content
  container: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as const },
  kpiTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { ...Typography.h3, color: C.textPrimary, fontSize: 22 },
  kpiLabel: { ...Typography.label, color: C.textSecondary, fontSize: 9 },

  // Post CTA
  postCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: Radius.lg,
    marginTop: 4,
  },
  postCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCtaTitle: { ...Typography.h3, color: C.white, fontSize: 18 },
  postCtaSub: { ...Typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Section
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: { ...Typography.subheading, color: C.textPrimary, marginTop: 12, marginBottom: 4 },
  urgentPill: {
    backgroundColor: 'rgba(232,163,23,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,163,23,0.4)',
  },
  urgentPillText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#E8A317',
    letterSpacing: 0.6,
  },
  viewAllLink: { ...Typography.bodyBold, color: C.brandPurple, fontSize: 13 },

  // Pending card
  pendingCard: {
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#E8A317',
  },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8A317' },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F9D58',
    paddingVertical: 10,
    borderRadius: 999,
  },
  acceptBtnText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(179,38,30,0.35)',
  },
  declineBtnText: { color: C.danger, fontFamily: 'DMSans_700Bold', fontSize: 13 },

  // Session card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  confirmedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,157,88,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(15,157,88,0.4)',
  },
  confirmedPillText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    color: '#0F9D58',
    letterSpacing: 0.6,
  },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 26, gap: 4 },

  // Reviews
  reviewCard: { padding: 14 },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: { padding: 14, alignItems: 'flex-start' },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '90%' as any,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...Typography.h2, color: C.textPrimary, fontSize: 24 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSub: {
    ...Typography.body,
    color: C.textSecondary,
    marginTop: 6,
    marginBottom: 8,
  },

  // Field
  fieldLabel: { ...Typography.label, color: C.textSecondary, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.surface,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: C.textPrimary,
  },
});
