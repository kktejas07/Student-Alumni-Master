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
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, Divider } from 'react-native-paper';
import { ArrowLeft, ChevronDown, GraduationCap, Sparkles, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors as C, Typography, Spacing, Radius, Shadows, Gradients } from '@/src/theme';
import { AnimatedCard, Button, useToast, useConfirm } from '@/src/views/components';
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
  const toast = useToast();
  const { confirm } = useConfirm();
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
      try { await refreshUser?.(); } catch {}
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      toast.error('Update failed', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onTransitionAlumni = async () => {
    const ok = await confirm({
      title: 'Become an alumni?',
      message: "This will mark you as a graduate. You'll unlock mentor mode and Knowledge Rooms.",
      confirmText: 'Confirm',
    });
    if (!ok) return;
    try {
      await api.transitionToAlumni();
      await refreshUser?.();
      router.replace('/(tabs)');
    } catch (e: any) {
      toast.error('Could not transition', e.message || 'Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-bg2">
      <LinearGradient colors={Gradients.heroDiagonal as any} className="px-4 pb-4 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center pt-2 gap-3">
            <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full items-center justify-center bg-glass border border-glass-border" testID="prefs-back-btn">
              <ArrowLeft size={20} color={C.white} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-muted text-xs font-body-semibold">SETTINGS</Text>
              <Text className="text-text font-display-bold text-lg">Your Preferences</Text>
            </View>
          </View>
          <Text className="text-muted text-sm mt-1">
            Update your focus to re-prioritize your feed.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text font-display-bold text-lg">What's your goal?</Text>
        <Text className="text-muted text-xs mt-1 mb-3">Drives mentors, courses, and jobs you see</Text>

        <Menu
          visible={showCareerMenu}
          onDismiss={() => setShowCareerMenu(false)}
          anchorPosition="bottom"
          contentStyle={{ backgroundColor: C.surface, borderRadius: 14, minWidth: 280, maxWidth: '92%' }}
          anchor={
            <AnimatedCard
              onPress={() => setShowCareerMenu(true)}
              className="bg-glass p-4 border border-glass-border"
              testID="career-dropdown"
              index={0}
            >
              <Text className="text-violet text-xs font-body-semibold">CAREER PATH</Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-text font-body-bold text-base">
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
                onPress={() => { setCareerPath(opt.id); setShowCareerMenu(false); }}
                title={opt.label}
                titleStyle={[
                  { color: opt.id === careerPath ? C.brandPurple : C.textPrimary, fontFamily: 'DMSans_500Medium' },
                ]}
                trailingIcon={opt.id === careerPath ? () => <Check size={18} color={C.brandPurple} /> : undefined}
                testID={`career-opt-${opt.id}`}
              />
              {idx < CAREER_OPTIONS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Menu>

        <Text className="text-text font-display-bold text-lg mt-4">Your level</Text>
        <Text className="text-muted text-xs mt-1 mb-3">Tunes content for your stage</Text>

        <Menu
          visible={showEduMenu}
          onDismiss={() => setShowEduMenu(false)}
          anchorPosition="bottom"
          contentStyle={{ backgroundColor: C.surface, borderRadius: 14, minWidth: 280, maxWidth: '92%' }}
          anchor={
            <AnimatedCard
              onPress={() => setShowEduMenu(true)}
              className="bg-glass p-4 border border-glass-border"
              testID="edu-dropdown"
              index={1}
            >
              <Text className="text-violet text-xs font-body-semibold">EDUCATION LEVEL</Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-text font-body-bold text-base">
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
                onPress={() => { setEduLevel(opt.id); setShowEduMenu(false); }}
                title={opt.label}
                titleStyle={[
                  { color: opt.id === eduLevel ? C.brandPurple : C.textPrimary, fontFamily: 'DMSans_500Medium' },
                ]}
                trailingIcon={opt.id === eduLevel ? () => <Check size={18} color={C.brandPurple} /> : undefined}
                testID={`edu-opt-${opt.id}`}
              />
              {idx < EDU_OPTIONS.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Menu>

        <Text className="text-text font-display-bold text-lg mt-4">Your interests</Text>
        <Text className="text-muted text-xs mt-1 mb-3">Tap to add/remove (powers AI matching)</Text>
        <View className="flex-row flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => {
            const active = interests.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleInterest(tag)}
                className="px-3.5 py-2 rounded-full border-2"
                style={active ? { backgroundColor: C.brandPurple, borderColor: C.brandPurple } : { backgroundColor: C.surface, borderColor: 'rgba(95,37,159,0.18)' }}
                testID={`tag-${tag.replace(/[^a-zA-Z0-9]/g, '-')}`}
              >
                <Text className="text-sm font-body-semibold" style={{ color: active ? C.white : C.textPrimary }}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {user?.role === 'student' && (
          <AnimatedCard
            className="mt-4 bg-glass border-l-4 border-l-violet"
            onPress={onTransitionAlumni}
            index={2}
            testID="prefs-alumni-cta"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full items-center justify-center bg-violet">
                <GraduationCap size={22} color={C.white} />
              </View>
              <View className="flex-1">
                <Text className="text-text font-body-bold" style={{ color: C.deepPurple }}>
                  Just graduated?
                </Text>
                <Text className="text-muted text-xs mt-0.5">
                  Transition to alumni → unlock mentor mode + Knowledge Rooms.
                </Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        <View className="h-28" />
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-4 pt-3 bg-glass border-t border-glass-border">
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
