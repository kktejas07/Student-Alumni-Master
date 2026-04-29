/**
 * Onboarding step 2 — School / Institution info with Class 11+ validation
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Input, NeoCard, Chip } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import type { InstitutionType } from '@/src/models/entities';

const C = Colors.light;

const INSTITUTION_TYPES: { id: InstitutionType; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'university', label: 'University' },
];

const CLASS_PRESETS = ['11', '12', 'B.Tech 1st Year', 'B.Tech 2nd Year', 'B.Tech 3rd Year', 'B.Tech 4th Year', 'BBA', 'B.Com', 'B.Sc', 'M.Tech', 'MBA 1st Year', 'MBA 2nd Year', 'PhD'];

export default function SchoolInfoScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { school_info, setSchoolInfo } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  const isStudent = user?.role === 'student';
  const isAlumni = user?.role === 'alumni';

  const validate = (): boolean => {
    setError(null);
    const s = school_info;
    if (!s.institution_name?.trim()) {
      setError('Please enter your institution name');
      return false;
    }
    if (!s.class_or_year?.trim()) {
      setError('Please enter your class or year');
      return false;
    }
    if (isStudent) {
      const cls = s.class_or_year.trim().toLowerCase();
      // Reject classes 1-10 if numeric
      if (/^\d+$/.test(cls)) {
        const n = parseInt(cls, 10);
        if (n < 11) {
          setError('Students must be in Class 11 (+1) or above to register on this platform.');
          return false;
        }
      }
      // Reject explicit class 1-10 mentions
      if (/^class\s*([1-9]|10)$/.test(cls) || /^[1-9](st|nd|rd|th)?$/.test(cls) || cls === '10' || cls === '10th') {
        setError('Students must be in Class 11 (+1) or above to register on this platform.');
        return false;
      }
    }
    if (isAlumni && !s.graduation_year) {
      setError('Please enter your graduation year');
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    // All roles now go through role-details next, which captures
    // role-specific fields (student age/edu, mentor org/title, alumni status).
    router.push('/(onboarding)/role-details');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="school-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.step}>STEP 1 OF {isStudent || isAlumni ? '4' : '3'}</Text>
          <Text style={styles.h1}>Tell us about your{'\n'}institution</Text>
          <Text style={styles.subtitle}>
            We'll use this to connect you with the right alumni, mentors, and resources.
          </Text>

          {isStudent && (
            <NeoCard bg={C.accentYellow} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <Text style={[Typography.bodySm, { color: C.textPrimary }]}>
                Note: Students must be in Class 11 (+1) or above to register.
              </Text>
            </NeoCard>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Type of institution</Text>
            <View style={styles.chipRow}>
              {INSTITUTION_TYPES.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  active={school_info.institution_type === t.id}
                  onPress={() => setSchoolInfo({ institution_type: t.id })}
                  color={C.accentBlue}
                  testID={`school-type-${t.id}`}
                />
              ))}
            </View>
          </View>

          <Input
            label="Institution name"
            placeholder="e.g., IIT Bombay / DPS Vasant Kunj"
            value={school_info.institution_name || ''}
            onChangeText={(v) => setSchoolInfo({ institution_name: v })}
            testID="school-name-input"
          />

          <View style={styles.section}>
            <Text style={styles.label}>{isAlumni ? 'Last class / Year completed' : 'Current class / Year'}</Text>
            <Input
              placeholder="e.g., 11, 12, B.Tech 2nd Year, MBA 1st Year"
              value={school_info.class_or_year || ''}
              onChangeText={(v) => setSchoolInfo({ class_or_year: v })}
              testID="school-class-input"
            />
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {CLASS_PRESETS.slice(0, 6).map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={school_info.class_or_year === c}
                  onPress={() => setSchoolInfo({ class_or_year: c })}
                  color={C.accentMint}
                />
              ))}
            </View>
          </View>

          <Input
            label="Branch / Stream (optional)"
            placeholder="e.g., Computer Science, Commerce, PCM"
            value={school_info.branch_or_stream || ''}
            onChangeText={(v) => setSchoolInfo({ branch_or_stream: v })}
            testID="school-branch-input"
          />

          <Input
            label="Board / University (optional)"
            placeholder="e.g., CBSE, Anna University"
            value={school_info.board_or_university || ''}
            onChangeText={(v) => setSchoolInfo({ board_or_university: v })}
            testID="school-board-input"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="City"
                placeholder="Bangalore"
                value={school_info.city || ''}
                onChangeText={(v) => setSchoolInfo({ city: v })}
                testID="school-city-input"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="State"
                placeholder="Karnataka"
                value={school_info.state || ''}
                onChangeText={(v) => setSchoolInfo({ state: v })}
                testID="school-state-input"
              />
            </View>
          </View>

          {isAlumni && (
            <Input
              label="Graduation year"
              placeholder="e.g., 2020"
              keyboardType="numeric"
              value={school_info.graduation_year ? String(school_info.graduation_year) : ''}
              onChangeText={(v) => setSchoolInfo({ graduation_year: parseInt(v) || undefined })}
              testID="school-grad-year-input"
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title="Continue →" onPress={next} testID="school-next-btn" style={{ marginTop: Spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 80 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  step: { ...Typography.caption, color: C.textSecondary },
  h1: { ...Typography.h2, color: C.textPrimary, marginVertical: Spacing.xs },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },
  label: { ...Typography.caption, color: C.textSecondary, marginBottom: 6 },
  section: { gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: Spacing.md },
  error: { ...Typography.bodySm, color: C.danger, marginTop: 4 },
});
