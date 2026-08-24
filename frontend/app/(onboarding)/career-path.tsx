import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
      toast.success('Skill added', `\u201c${v}\u201d added to your profile.`);
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
      <View className="flex-row flex-wrap gap-[10px] mb-[22px]">
        {PATHS.map((p) => {
          const active = career_path === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setCareerPath(p.id)}
              testID={`career-path-${p.id}`}
              className={`flex-[1_1_48%] py-4 px-3.5 rounded-[14px] border gap-1.5 ${active ? 'border-violet bg-violet/16' : 'border-glass-border bg-bg2'}`}
              style={({ hovered, pressed }: any) => [
                hovered && !active && { borderColor: 'rgba(196,181,253,0.30)', backgroundColor: 'rgba(124,58,237,0.10)' },
                pressed && { transform: [{ scale: 0.99 }] },
                { cursor: 'pointer', transitionDuration: '160ms' },
              ]}
            >
              <Text className="text-[28px]">{p.emoji}</Text>
              <Text className={`font-body-bold text-[15px] mt-1.5 ${active ? 'text-gray-900' : 'text-gray-800'}`}>{p.title}</Text>
              <Text className="text-text/50 font-body text-xs leading-[17px]" numberOfLines={3}>{p.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-gray-900 font-body-bold text-base mt-1 mb-1">Your interests</Text>
      <Text className="text-text/50 font-body text-[12.5px] mb-2.5">Pick a few areas you're curious about.</Text>
      <View className="flex-row flex-wrap gap-2 mb-3.5">
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

      <Text className="text-gray-900 font-body-bold text-base mt-1.5 mb-1">Your skills (optional)</Text>
      <Text className="text-text/50 font-body text-[12.5px] mb-2.5">Type a skill and press Add.</Text>
      <View className="flex-row gap-2 items-end">
        <View className="flex-1">
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
          className="px-[18px] py-[13px] rounded-xl bg-violet/20 border border-violet/32 mb-3.5"
          style={({ hovered, pressed }: any) => [
            hovered && { backgroundColor: 'rgba(124,58,237,0.30)' },
            pressed && { transform: [{ scale: 0.97 }] },
            { cursor: 'pointer', transitionDuration: '160ms' },
          ]}
        >
          <Text className="text-gray-900 font-body-bold text-sm">Add</Text>
        </Pressable>
      </View>
      {skills.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3 mb-3.5">
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

      <Text className="text-gray-900 font-body-bold text-base mt-3 mb-1">Short bio (optional)</Text>
      <WebField
        placeholder="A line or two about you..."
        value={bio}
        onChangeText={setBio}
        testID="bio-input"
      />
    </OnboardingShell>
  );
}
