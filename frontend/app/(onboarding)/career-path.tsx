/**
 * Onboarding step 4 — Career path selection (Student / Alumni only).
 * Web: split-screen.  Native: full-screen dark.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import type { CareerPath } from '@/src/models/entities';
import { OnboardingShell, DarkChip } from '@/src/views/web/OnboardingShell';
import { WebField } from '@/src/views/web/AuthWebControls';

const PATHS: { id: CareerPath; emoji: string; title: string; desc: string }[] = [
  { id: 'job', emoji: '💼', title: 'Job', desc: 'Land a great role in industry — tech, finance, design and more.' },
  { id: 'higher_education', emoji: '🎓', title: 'Higher Education', desc: 'Pursue Masters, PhD, or research at top global universities.' },
  { id: 'startup', emoji: '🚀', title: 'Startup', desc: 'Build your own product, find a co-founder, ship and raise funding.' },
  { id: 'business', emoji: '📈', title: 'Business', desc: 'Lead in corporate, family business or modernize legacy operations.' },
];
const SUGGESTED_INTERESTS = ['AI/ML', 'Web Dev', 'Mobile Dev', 'Data Science', 'Cybersecurity', 'Product', 'Marketing', 'Finance', 'Design', 'Robotics', 'Biotech', 'Climate', 'EdTech', 'FinTech', 'Gaming'];
const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function CareerPathScreen() {
  const router = useRouter();
  const toast = useToast();
  const { career_path, setCareerPath, interests, setInterests, skills, setSkills, bio, setBio } = useOnboardingStore();
  const [skillInput, setSkillInput] = useState('');

  const toggleInterest = (i: string) =>
    setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]);

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) {
      setSkills([...skills, v]);
      toast.success('Skill added', `“${v}” added to your profile.`);
    }
    setSkillInput('');
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const next = () => {
    if (!career_path) {
      toast.error('Pick a path', 'Please choose a career path to continue.');
      return;
    }
    router.push('/(onboarding)/face-capture');
  };

  return (
    <OnboardingShell
      step={3}
      stepBarSteps={STEPS}
      title={<>Pick your{'\n'}career path</>}
      subtitle="We'll customize your roadmap, courses, mentors and deals based on this choice."
      primaryLabel="Continue →"
      primaryDisabled={!career_path}
      primaryTestID="career-next-btn"
      onPrimary={next}
      onBack={() => router.back()}
    >
      {/* Path tiles */}
      <View style={styles.pathGrid}>
        {PATHS.map((p) => {
          const active = career_path === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setCareerPath(p.id)}
              testID={`career-path-${p.id}`}
              style={({ hovered, pressed }: any) => [
                styles.pathTile,
                hovered && !active && { borderColor: 'rgba(196,181,253,0.30)', backgroundColor: 'rgba(124,58,237,0.10)' },
                active && styles.pathTileActive,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
              <Text style={[styles.pathTitle, active && { color: '#FFFFFF' }]}>{p.title}</Text>
              <Text style={styles.pathDesc} numberOfLines={3}>{p.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.h3}>Your interests</Text>
      <Text style={styles.helper}>Pick a few areas you're curious about.</Text>
      <View style={styles.chipRow}>
        {SUGGESTED_INTERESTS.map((i) => (
          <DarkChip
            key={i}
            label={i}
            active={interests.includes(i)}
            onPress={() => toggleInterest(i)}
            testID={`interest-${i}`}
          />
        ))}
      </View>

      <Text style={[styles.h3, { marginTop: 6 }]}>Your skills (optional)</Text>
      <Text style={styles.helper}>Type a skill and press Add.</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <WebField
            placeholder="e.g., Python, Public Speaking"
            value={skillInput}
            onChangeText={setSkillInput}
            testID="skill-input"
          />
        </View>
        <Pressable
          onPress={addSkill}
          testID="skill-add-btn"
          style={({ hovered, pressed }: any) => [
            styles.addBtn,
            hovered && { backgroundColor: 'rgba(124,58,237,0.30)' },
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      {skills.length > 0 && (
        <View style={[styles.chipRow, { marginTop: 12 }]}>
          {skills.map((s) => (
            <DarkChip
              key={s}
              label={`${s}  ×`}
              active
              onPress={() => removeSkill(s)}
              testID={`skill-chip-${s}`}
            />
          ))}
        </View>
      )}

      <Text style={[styles.h3, { marginTop: 12 }]}>Short bio (optional)</Text>
      <WebField
        placeholder="A line or two about you..."
        value={bio}
        onChangeText={setBio}
        testID="bio-input"
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  pathGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  pathTile: {
    flexBasis: '48%', flexGrow: 1,
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    gap: 6,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  pathTileActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.16)' },
  pathTitle: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 6 },
  pathDesc: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17 },
  h3: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16, marginTop: 4, marginBottom: 4 },
  helper: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  addBtn: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.20)',
    borderColor: 'rgba(196,181,253,0.32)',
    borderWidth: 1,
    marginBottom: 14,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  addBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
});
