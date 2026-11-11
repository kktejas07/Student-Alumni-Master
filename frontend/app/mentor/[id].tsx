// @ts-nocheck
/**
 * Mentor Profile + Booking Screen
 * ================================
 * When a student taps a mentor card, this screen opens with:
 *  - Mentor's full profile (avatar, title, bio, LinkedIn, ratings)
 *  - Available time slots from GET /api/mentors/{id}/availability
 *  - Topic input + booking confirmation
 *
 * On successful booking, the booking is persisted and student is shown success.
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MessageCircle, ExternalLink, Calendar, Clock } from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Shadows } from '@/src/theme';
import { Card, Button, Input } from '@/src/views/components';
import { useToast } from '@/src/views/components';
import { api, request } from '@/src/models/services/api';

type Slot = { label: string; iso: string };

/**
 * Flatten GET /api/mentors/{id}/availability (the mentor's configured slots
 * minus booked sessions, next 7 days) into pickable 30-minute slots.
 * Previously this screen generated three fixed slots a day regardless of
 * the mentor's calendar.
 */
function flattenAvailability(days: any[]): Slot[] {
  const out: Slot[] = [];
  for (const d of days || []) {
    for (const sl of d.slots || []) {
      if (!sl.available) continue;
      const iso = `${d.date}T${sl.time}:00Z`;
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) continue;
      out.push({
        iso: dt.toISOString(),
        label: `${dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      });
    }
  }
  return out;
}

export default function MentorProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  // Mentor data is passed via URL params for mocked sample mentors
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    title?: string;
    bio?: string;
    avatar?: string;
    rating?: string;
    sessions?: string;
    linkedin?: string;
    tags?: string;
  }>();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ iso: string; label: string } | null>(null);
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentor, setMentor] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [booked, setBooked] = useState(false);

  const tags = params.tags ? String(params.tags).split(',') : [];

  useEffect(() => {
    if (!params.id) { setSlotsLoading(false); return; }
    setSlotsLoading(true);
    request<{ days: any[] }>(`/mentors/${encodeURIComponent(String(params.id))}/availability?days=7`)
      .then((res) => setSlots(flattenAvailability(res?.days || [])))
      .catch((err) => { console.warn('Failed to fetch availability:', err); setSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      setLoadingProfile(true);
      api.getPublicProfile(params.id)
        .then((data) => {
          if (data) {
            setMentor(data);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch mentor profile:', err);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    }
  }, [params.id]);

  const displayName = mentor?.full_name || params.name || 'Anonymous';
  const displayTitle = mentor?.job_title && mentor?.organization
    ? `${mentor.job_title} at ${mentor.organization}`
    : (mentor?.headline || params.title || 'Expert Mentor');
  const displayBio = mentor?.bio || params.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.';
  const displayRating = mentor?.rating ?? params.rating ?? '—';
  const displaySessions = mentor?.sessions ?? params.sessions ?? '0';
  const displayTags = mentor?.skills?.length ? mentor.skills : (mentor?.interests?.length ? mentor.interests : tags);
  const displayLinkedin = mentor?.linkedin_url || params.linkedin;
  const displayAvatar = mentor?.photo_data 
    ? (mentor.photo_data.startsWith('data:') ? mentor.photo_data : `data:image/jpeg;base64,${mentor.photo_data}`)
    : (params.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200');

  /** Confirm the booking by POST /api/bookings. */
  const confirm = async () => {
    if (!selectedSlot) {
      toast.warning('Pick a slot', 'Please select an available time slot.');
      return;
    }
    if (!topic.trim()) {
      toast.warning('Topic required', 'What would you like to discuss?');
      return;
    }
    setSubmitting(true);
    try {
      const slotEnd = new Date(selectedSlot.iso);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);
      await api.createBooking({
        mentor_id: params.id,
        slot_start_iso: selectedSlot.iso,
        slot_end_iso: slotEnd.toISOString(),
        topic: topic.trim(),
      });
      setBooked(true);
      toast.success('Booked', `Your session with ${displayName} is confirmed.`);
      router.back();
    } catch (e: any) {
      toast.error('Booking failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="mentor-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        {/* ===== Mentor profile header ===== */}
        <Card style={styles.profileCard}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            <Text style={[Typography.h3, { color: C.textPrimary }]} testID="mentor-name">
              {displayName}
            </Text>
            <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center' }]}>
              {displayTitle}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={14} color={C.warning} fill={C.warning} />
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{displayRating}</Text>
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>· {displaySessions} sessions</Text>
            </View>
            {displayTags.length > 0 && (
              <View style={styles.tagsRow}>
                {displayTags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            {displayLinkedin && (
              <TouchableOpacity
                onPress={() => Linking.openURL(displayLinkedin)}
                style={styles.linkedinBtn}
                testID="mentor-linkedin-btn"
              >
                <ExternalLink size={16} color={C.info} />
                <Text style={[Typography.bodyBold, { color: C.info }]}>View LinkedIn</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* ===== Bio ===== */}
        {displayBio && (
          <Card style={{ marginTop: 12 }}>
            <Text style={[Typography.label, { color: C.textSecondary }]}>ABOUT</Text>
            <Text style={[Typography.body, { color: C.textPrimary, marginTop: 8 }]}>{displayBio}</Text>
          </Card>
        )}

        {/* ===== Available slots ===== */}
        <Text style={styles.sectionTitle}>
          <Calendar size={18} color={C.brandPurple} />  Available Slots
        </Text>
        <Text style={[Typography.bodySm, { color: C.textSecondary, marginBottom: 12 }]}>
          30-minute 1:1 sessions. Pick a slot that works for you.
        </Text>
        {slotsLoading && <ActivityIndicator color={C.brandPurple} style={{ marginBottom: 12 }} />}
        {!slotsLoading && slots.length === 0 && (
          <Text style={[Typography.bodySm, { color: C.textSecondary, marginBottom: 12 }]}>
            No open slots in the next 7 days. Check back later or message the mentor.
          </Text>
        )}
        <View style={styles.slotsGrid}>
          {slots.slice(0, 12).map((s) => {
            const active = selectedSlot?.iso === s.iso;
            return (
              <TouchableOpacity
                key={s.iso}
                onPress={() => {
                  if (!booked) {
                    setSelectedSlot(s);
                  }
                }}
                disabled={booked}
                style={[styles.slotChip, active && styles.slotChipActive]}
                testID={`slot-${s.iso}`}
                activeOpacity={0.7}
              >
                <Clock size={12} color={active ? C.white : C.brandPurple} />
                <Text
                  style={[
                    Typography.bodySm,
                    { color: active ? C.white : C.textPrimary, fontFamily: 'DMSans_600SemiBold' },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===== Topic ===== */}
        <View style={{ marginTop: 16 }}>
          <Input
            label="What would you like to discuss?"
            placeholder="e.g., How do I prepare for FAANG interviews?"
            value={topic}
            onChangeText={setTopic}
            multiline
            numberOfLines={3}
            editable={!booked && !submitting}
            testID="booking-topic-input"
          />
        </View>

        {/* ===== Confirm ===== */}
        <Button
          title={booked ? 'Session Booked' : submitting ? 'Booking...' : 'Confirm session'}
          loading={submitting}
          onPress={confirm}
          disabled={!selectedSlot || !topic.trim() || booked || submitting}
          testID="booking-confirm-btn"
          style={{ marginTop: Spacing.lg }}
          icon={<MessageCircle size={18} color={C.white} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  profileCard: { padding: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.surfaceMuted, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'center' },
  tag: { backgroundColor: C.palePurple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  linkedinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.infoSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
  },
  sectionTitle: { ...Typography.h4, color: C.textPrimary, marginTop: 24, marginBottom: 4 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.palePurple,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  slotChipActive: {
    backgroundColor: C.brandPurple,
    borderColor: C.brandPurple,
  },
});
