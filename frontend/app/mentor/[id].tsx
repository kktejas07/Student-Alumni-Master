/**
 * Mentor Profile + Booking Screen
 * ================================
 * When a student taps a mentor card, this screen opens with:
 *  - Mentor's full profile (avatar, title, bio, LinkedIn, ratings)
 *  - Available time slots (mock — real impl would query mentor's calendar)
 *  - Topic input + booking confirmation
 *
 * On successful booking, the booking is persisted and student is shown success.
 */
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MessageCircle, Linkedin, Calendar, Clock } from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Shadows } from '@/src/theme';
import { Card, Button, Input } from '@/src/views/components';
import { api } from '@/src/models/services/api';

// Generate next 7 days × 3 slots/day for booking preview (mock availability)
function generateSlots() {
  const slots: { date: Date; label: string; iso: string }[] = [];
  const today = new Date();
  const times = [
    { h: 10, label: '10:00 AM' },
    { h: 14, label: '2:00 PM' },
    { h: 18, label: '6:00 PM' },
  ];
  for (let d = 1; d <= 7; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);
    times.forEach((t) => {
      const slot = new Date(day);
      slot.setHours(t.h, 0, 0, 0);
      slots.push({
        date: slot,
        label: `${slot.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t.label}`,
        iso: slot.toISOString(),
      });
    });
  }
  return slots;
}

export default function MentorProfileScreen() {
  const router = useRouter();
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

  const slots = useMemo(generateSlots, []);
  const [selectedSlot, setSelectedSlot] = useState<{ iso: string; label: string } | null>(null);
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tags = params.tags ? String(params.tags).split(',') : [];

  /** Confirm the booking by POST /api/bookings. */
  const confirm = async () => {
    if (!selectedSlot) {
      Alert.alert('Pick a slot', 'Please select an available time slot.');
      return;
    }
    if (!topic.trim()) {
      Alert.alert('Topic required', 'What would you like to discuss?');
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
      Alert.alert('Booked!', `Your session with ${params.name} is confirmed.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Booking failed', e.message);
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
            <Image source={{ uri: params.avatar }} style={styles.avatar} />
            <Text style={[Typography.h3, { color: C.textPrimary }]} testID="mentor-name">
              {params.name}
            </Text>
            <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center' }]}>
              {params.title}
            </Text>
            <View style={styles.ratingRow}>
              <Star size={14} color={C.warning} fill={C.warning} />
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{params.rating}</Text>
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>· {params.sessions} sessions</Text>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
            {params.linkedin && (
              <TouchableOpacity
                onPress={() => Linking.openURL(params.linkedin!)}
                style={styles.linkedinBtn}
                testID="mentor-linkedin-btn"
              >
                <Linkedin size={16} color={C.info} />
                <Text style={[Typography.bodyBold, { color: C.info }]}>View LinkedIn</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* ===== Bio ===== */}
        {params.bio && (
          <Card style={{ marginTop: 12 }}>
            <Text style={[Typography.label, { color: C.textSecondary }]}>ABOUT</Text>
            <Text style={[Typography.body, { color: C.textPrimary, marginTop: 8 }]}>{params.bio}</Text>
          </Card>
        )}

        {/* ===== Available slots ===== */}
        <Text style={styles.sectionTitle}>
          <Calendar size={18} color={C.brandPurple} />  Available Slots
        </Text>
        <Text style={[Typography.bodySm, { color: C.textSecondary, marginBottom: 12 }]}>
          30-minute 1:1 sessions. Pick a slot that works for you.
        </Text>
        <View style={styles.slotsGrid}>
          {slots.slice(0, 9).map((s) => {
            const active = selectedSlot?.iso === s.iso;
            return (
              <TouchableOpacity
                key={s.iso}
                onPress={() => setSelectedSlot(s)}
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
            testID="booking-topic-input"
          />
        </View>

        {/* ===== Confirm ===== */}
        <Button
          title={submitting ? 'Booking...' : 'Confirm session'}
          loading={submitting}
          onPress={confirm}
          disabled={!selectedSlot}
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
