/**
 * Preferences Editor
 * ===================
 * Per spec: "Avoid overwhelming users with complex forms. Use simple filters
 * and dropdown menus so students can easily adjust their preferences, which
 * in turn updates what content is prioritized on their feed."
 *
 * - Career Path dropdown (job / higher_education / startup / business)
 * - Education Level dropdown (+1 / +2 / B.Tech / Masters / PhD / Alumni)
 * - Interests as toggleable chips (multi-select)
 * - Save → PATCH /api/users/me/preferences → instant dashboard re-priority
 * - Alumni transition CTA (if eligible)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, Divider } from 'react-native-paper';
import { ArrowLeft, ChevronDown, GraduationCap, Sparkles, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors as C, Typography, Spacing, Radius, Shadows, Gradients } from '@/src/theme';
import { AnimatedCard, Button } from '@/src/views/components';
import { useAuth } from '@/src/viewmodels/hooks';
import { api } from '@/src/models/services/api';

const CAREER_OPTIONS = [
  { id: 'job', label: 'Land a Job (Industry)' },
  { id: 'higher_education', label: 'Higher Education (Masters/PhD)' },
  { id: 'startup', label: 'Build a Startup' },
  { id: 'business', label: 'Family / Business Career' },
];

const EDU_OPTIONS = [
  { id: 'plus_one', label: 'Class 11 (+1)' },
  { id: 'plus_two', label: 'Class 12 (+2)' },
  { id: 'btech', label: 'B.Tech / Bachelors' },
  { id: 'masters', label: 'Masters / MBA' },
  { id: 'phd', label: 'PhD / Research' },
  { id: 'other', label: 'Other' },
];

const INTEREST_TAGS = [
  'AI/ML', 'Web Dev', 'Mobile Dev', 'Data Science',
  'Cloud / DevOps', 'Cybersecurity', 'Blockchain', 'IoT',
  'Product Management', 'UX Design', 'Marketing', 'Finance',
  'Entrepreneurship', 'Robotics', 'Research', 'Game Dev',
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const initialEdu = user?.student_info?.education_level || 'btech';
  const [careerPath, setCareerPath] = useState<string>(user?.career_path || 'job');
  const [eduLevel, setEduLevel] = useState<string>(initialEdu);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [showEduMenu, setShowEduMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const careerLabel = CAREER_OPTIONS.find((c) => c.id === careerPath)?.label || 'Select';
  const eduLabel = EDU_OPTIONS.find((e) => e.id === eduLevel)?.label || 'Select';

  const toggleInterest = (tag: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await api.updatePreferences({
        career_path: careerPath,
        education_level: eduLevel,
        interests,
      });
      // Refresh user in store
      try {
        await refreshUser?.();
      } catch {}
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onTransitionAlumni = async () => {
    Alert.alert(
      'Become an alumni?',
      'This will mark you as a graduate. You\'ll unlock mentor mode and Knowledge Rooms.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.transitionToAlumni();
              await refreshUser?.();
              router.replace('/(tabs)');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not transition.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.safe}>
      <LinearGradient colors={Gradients.heroDiagonal as any} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} testID="prefs-back-btn">
              <ArrowLeft size={20} color={C.white} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: 'rgba(255,255,255,0.78)' }]}>SETTINGS</Text>
              <Text style={[Typography.h2, { color: C.white }]}>Your Preferences</Text>
            </View>
          </View>
          <Text style={[Typography.body, { color: 'rgba(255,255,255,0.86)', marginTop: 4 }]}>
            Update your focus to re-prioritize your feed.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Career Path Dropdown ===== */}
        <Text style={styles.sectionTitle}>What's your goal?</Text>
        <Text style={styles.sectionHint}>Drives mentors, courses, and jobs you see</Text>

        <Menu
          visible={showCareerMenu}
          onDismiss={() => setShowCareerMenu(false)}
          anchorPosition="bottom"
          contentStyle={styles.menuContent}
          anchor={
            <AnimatedCard
              onPress={() => setShowCareerMenu(true)}
              style={styles.dropdown}
              testID="career-dropdown"
              index={0}
            >
              <Text style={[Typography.label, { color: C.brandPurple, fontSize: 9 }]}>CAREER PATH</Text>
              <View style={styles.dropdownRow}>
                <Text style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 15 }]}>
                  {careerLabel}
                </Text>
                <ChevronDown size={20} color={C.textSecondary} />
              </View>
            </AnimatedCard>
          }
        >
          {CAREER_OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.id}>
              <Menu.Item
                onPress={() => {
                  setCareerPath(opt.id);
                  setShowCareerMenu(false);
                }}
                title={opt.label}
                titleStyle={[
                  Typography.body,
                  { color: opt.id === careerPath ? C.brandPurple : C.textPrimary, fontFamily: 'DMSans_500Medium' },
                ]}
                trailingIcon={opt.id === careerPath ? () => <Check size={18} color={C.brandPurple} /> : undefined}
                testID={`career-opt-${opt.id}`}
              />
              {idx < CAREER_OPTIONS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Menu>

        {/* ===== Education Level Dropdown ===== */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Your level</Text>
        <Text style={styles.sectionHint}>Tunes content for your stage</Text>

        <Menu
          visible={showEduMenu}
          onDismiss={() => setShowEduMenu(false)}
          anchorPosition="bottom"
          contentStyle={styles.menuContent}
          anchor={
            <AnimatedCard
              onPress={() => setShowEduMenu(true)}
              style={styles.dropdown}
              testID="edu-dropdown"
              index={1}
            >
              <Text style={[Typography.label, { color: C.brandPurple, fontSize: 9 }]}>EDUCATION LEVEL</Text>
              <View style={styles.dropdownRow}>
                <Text style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 15 }]}>
                  {eduLabel}
                </Text>
                <ChevronDown size={20} color={C.textSecondary} />
              </View>
            </AnimatedCard>
          }
        >
          {EDU_OPTIONS.map((opt, idx) => (
            <React.Fragment key={opt.id}>
              <Menu.Item
                onPress={() => {
                  setEduLevel(opt.id);
                  setShowEduMenu(false);
                }}
                title={opt.label}
                titleStyle={[
                  Typography.body,
                  { color: opt.id === eduLevel ? C.brandPurple : C.textPrimary, fontFamily: 'DMSans_500Medium' },
                ]}
                trailingIcon={opt.id === eduLevel ? () => <Check size={18} color={C.brandPurple} /> : undefined}
                testID={`edu-opt-${opt.id}`}
              />
              {idx < EDU_OPTIONS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Menu>

        {/* ===== Interests ===== */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Your interests</Text>
        <Text style={styles.sectionHint}>Tap to add/remove (powers AI matching)</Text>
        <View style={styles.tagsWrap}>
          {INTEREST_TAGS.map((tag) => {
            const active = interests.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleInterest(tag)}
                style={[styles.tag, active ? styles.tagActive : styles.tagInactive]}
                testID={`tag-${tag.replace(/[^a-zA-Z0-9]/g, '-')}`}
              >
                <Text style={[styles.tagText, { color: active ? C.white : C.textPrimary }]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ===== Alumni transition CTA (only for current students) ===== */}
        {user?.role === 'student' && (
          <AnimatedCard
            style={styles.alumniCard}
            onPress={onTransitionAlumni}
            index={2}
            testID="prefs-alumni-cta"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.alumniIcon}>
                <GraduationCap size={22} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>
                  Just graduated?
                </Text>
                <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
                  Transition to alumni → unlock mentor mode + Knowledge Rooms.
                </Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===== Bottom save bar ===== */}
      <SafeAreaView edges={['bottom']} style={styles.saveBar}>
        <Button
          title={saving ? 'Saving…' : 'Save preferences'}
          onPress={onSave}
          loading={saving}
          icon={<Sparkles size={18} color={C.white} />}
          testID="prefs-save-btn"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.lg },
  sectionTitle: {
    ...Typography.h3,
    color: C.textPrimary,
    fontSize: 18,
  },
  sectionHint: {
    ...Typography.bodySm,
    color: C.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: C.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  menuContent: {
    backgroundColor: C.surface,
    borderRadius: 14,
    minWidth: 280,
    maxWidth: '92%',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  tagActive: {
    backgroundColor: C.brandPurple,
    borderColor: C.brandPurple,
  },
  tagInactive: {
    backgroundColor: C.surface,
    borderColor: 'rgba(95,37,159,0.18)',
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  alumniCard: {
    marginTop: Spacing.lg,
    backgroundColor: C.palePurple,
    borderLeftWidth: 4,
    borderLeftColor: C.brandPurple,
  },
  alumniIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    ...Shadows.md,
  },
});
