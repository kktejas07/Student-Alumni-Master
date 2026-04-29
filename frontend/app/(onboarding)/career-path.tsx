/**
 * Onboarding step 3 — Career path selection (Student / Alumni only)
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Briefcase, GraduationCap, Rocket, TrendingUp } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard, Chip, Input } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import type { CareerPath } from '@/src/models/entities';

const C = Colors.light;

const PATHS: {
  id: CareerPath;
  title: string;
  description: string;
  color: string;
  icon: any;
}[] = [
  {
    id: 'job',
    title: 'Job',
    description: 'Land a great role in industry — tech, finance, design and more.',
    color: C.accentMint,
    icon: Briefcase,
  },
  {
    id: 'higher_education',
    title: 'Higher Education',
    description: 'Pursue Masters, PhD, or research at top global universities.',
    color: C.accentBlue,
    icon: GraduationCap,
  },
  {
    id: 'startup',
    title: 'Startup',
    description: 'Build your own product, find a co-founder, ship and raise funding.',
    color: C.accentPink,
    icon: Rocket,
  },
  {
    id: 'business',
    title: 'Business',
    description: 'Lead in corporate, family business or modernize legacy operations.',
    color: C.accentYellow,
    icon: TrendingUp,
  },
];

const SUGGESTED_INTERESTS = [
  'AI/ML', 'Web Dev', 'Mobile Dev', 'Data Science', 'Cybersecurity', 'Product', 'Marketing',
  'Finance', 'Design', 'Robotics', 'Biotech', 'Climate', 'EdTech', 'FinTech', 'Gaming',
];

export default function CareerPathScreen() {
  const router = useRouter();
  const { career_path, setCareerPath, interests, setInterests, skills, setSkills, bio, setBio } =
    useOnboardingStore();
  const [skillInput, setSkillInput] = useState('');

  const toggleInterest = (i: string) =>
    setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]);

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) setSkills([...skills, v]);
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="career-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.step}>STEP 2 OF 4</Text>
        <Text style={styles.h1}>Pick your{'\n'}career path</Text>
        <Text style={styles.subtitle}>
          We'll customize your roadmap, courses, mentors and deals based on this choice.
        </Text>

        <View style={styles.pathGrid}>
          {PATHS.map((p) => {
            const Icon = p.icon;
            const active = career_path === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setCareerPath(p.id)}
                activeOpacity={0.85}
                testID={`career-path-${p.id}`}
                style={styles.pathItem}
              >
                <NeoCard bg={active ? p.color : C.surface} shadow={active ? 'md' : 'sm'}>
                  <View style={{ gap: 8 }}>
                    <Icon size={28} color={C.textPrimary} />
                    <Text style={[Typography.h4, { color: C.textPrimary }]}>{p.title}</Text>
                    <Text style={[Typography.bodySm, { color: C.textPrimary, opacity: 0.85 }]}>
                      {p.description}
                    </Text>
                  </View>
                </NeoCard>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.h3, { marginTop: Spacing.xl }]}>Your interests</Text>
        <Text style={styles.subtitle}>Pick a few areas you're curious about.</Text>
        <View style={styles.chipRow}>
          {SUGGESTED_INTERESTS.map((i) => (
            <Chip
              key={i}
              label={i}
              active={interests.includes(i)}
              onPress={() => toggleInterest(i)}
              color={C.accentMint}
              testID={`interest-${i}`}
            />
          ))}
        </View>

        <Text style={[styles.h3, { marginTop: Spacing.lg }]}>Your skills (optional)</Text>
        <Text style={styles.subtitle}>Type a skill and press Add.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="e.g., Python, Public Speaking"
              value={skillInput}
              onChangeText={setSkillInput}
              onSubmitEditing={addSkill}
              testID="skill-input"
            />
          </View>
          <Button title="Add" variant="secondary" onPress={addSkill} testID="skill-add-btn" />
        </View>
        <View style={[styles.chipRow, { marginTop: 12 }]}>
          {skills.map((s) => (
            <Chip
              key={s}
              label={`${s} ×`}
              active
              onPress={() => removeSkill(s)}
              color={C.accentBlue}
              testID={`skill-chip-${s}`}
            />
          ))}
        </View>

        <Text style={[styles.h3, { marginTop: Spacing.lg }]}>Short bio (optional)</Text>
        <Input
          placeholder="A line or two about you..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          testID="bio-input"
          containerStyle={{ marginTop: 4 }}
        />

        <Button
          title="Continue →"
          onPress={() => {
            if (!career_path) return;
            router.push('/(onboarding)/face-capture');
          }}
          disabled={!career_path}
          testID="career-next-btn"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 80 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  step: { ...Typography.caption, color: C.textSecondary },
  h1: { ...Typography.h2, color: C.textPrimary, marginVertical: Spacing.xs },
  h3: { ...Typography.h3, color: C.textPrimary },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },
  pathGrid: { gap: Spacing.md, marginTop: Spacing.sm },
  pathItem: {},
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
