/**
 * Onboarding step 4 — Face capture / Profile photo
 * Uses expo-image-picker (works on iOS, Android, Web)
 * with optional expo-camera for live capture on native.
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera as CameraIcon, ImagePlus, RotateCcw, Loader2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';

const C = Colors.light;

export default function FaceCapture() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureCameraPerm = async (): Promise<boolean> => {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    return res.granted;
  };

  const pickFromCamera = async () => {
    setError(null);
    if (Platform.OS !== 'web') {
      const ok = await ensureCameraPerm();
      if (!ok) {
        Alert.alert('Permission required', 'Please grant camera access to capture your face photo.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      onboarding.setFaceImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickFromLibrary = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      onboarding.setFaceImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Build role-specific payload sections based on current onboarding state.
      // Backend will validate based on the user's role.
      const payload: any = {
        school_info: onboarding.school_info,
        career_path: onboarding.career_path,
        interests: onboarding.interests,
        skills: onboarding.skills,
        bio: onboarding.bio,
        face_image_base64: onboarding.face_image_base64,
      };

      // Student-specific data (age, education_level, career_interests, career_goal)
      if (onboarding.student_age || onboarding.student_education_level || onboarding.student_career_goal) {
        payload.student_info = {
          age: onboarding.student_age || 18,
          education_level: onboarding.student_education_level || 'btech',
          career_interests: onboarding.interests,
          career_goal: onboarding.student_career_goal || undefined,
        };
      }

      // Mentor-specific data (category, organization, job_title, linkedin)
      if (onboarding.mentor_organization || onboarding.mentor_job_title) {
        payload.mentor_info = {
          category: onboarding.mentor_category || 'it_software',
          organization: onboarding.mentor_organization || '',
          job_title: onboarding.mentor_job_title || '',
          linkedin_url: onboarding.mentor_linkedin_url || undefined,
          years_of_experience: onboarding.mentor_years_of_experience,
          bio: onboarding.bio,
        };
      }

      // Alumni-specific data (employment_status, employer, role, linkedin, opt-in mentor)
      if (onboarding.alumni_employment_status) {
        payload.alumni_info = {
          graduation_year:
            onboarding.school_info.graduation_year || new Date().getFullYear(),
          university: onboarding.school_info.institution_name || '',
          current_employer: onboarding.alumni_employer || undefined,
          current_role: onboarding.alumni_role || undefined,
          employment_status: onboarding.alumni_employment_status,
          // Per spec — LinkedIn highly recommended for alumni
          linkedin_url: onboarding.alumni_linkedin_url || undefined,
          // Per spec — alumni can opt-in to mentor with a category
          wants_to_mentor: !!onboarding.alumni_wants_to_mentor,
          mentor_category: onboarding.alumni_mentor_category || undefined,
        };
      }

      await api.completeOnboarding(payload);
      await refreshUser();
      onboarding.reset();
      router.replace('/(onboarding)/success');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="face-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.step}>FINAL STEP</Text>
        <Text style={styles.h1}>Add your{'\n'}profile photo</Text>
        <Text style={styles.subtitle}>
          We'll use this for your unique platform ID and so mentors and alumni can recognize you.
        </Text>

        <View style={styles.photoArea}>
          <NeoCard bg={C.surfaceMuted} shadow="md" style={styles.photoCard}>
            {onboarding.face_image_base64 ? (
              <Image source={{ uri: onboarding.face_image_base64 }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <CameraIcon size={48} color={C.textSecondary} />
                <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 8 }]}>
                  No photo yet
                </Text>
              </View>
            )}
          </NeoCard>
        </View>

        <View style={{ gap: Spacing.sm }}>
          <Button
            title={onboarding.face_image_base64 ? 'Retake with camera' : 'Capture with camera'}
            icon={onboarding.face_image_base64 ? <RotateCcw size={18} color={C.primaryText} /> : <CameraIcon size={18} color={C.primaryText} />}
            onPress={pickFromCamera}
            testID="face-capture-camera-btn"
          />
          <Button
            title="Choose from gallery"
            variant="secondary"
            icon={<ImagePlus size={18} color={C.primary} />}
            onPress={pickFromLibrary}
            testID="face-capture-gallery-btn"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
          <Button
            title={submitting ? 'Setting up...' : 'Finish & generate my ID'}
            onPress={submit}
            loading={submitting}
            testID="face-finish-btn"
          />
          <TouchableOpacity onPress={submit} testID="face-skip-btn" style={{ alignItems: 'center', padding: 12 }}>
            <Text style={[Typography.bodySm, { color: C.textSecondary }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  step: { ...Typography.caption, color: C.textSecondary },
  h1: { ...Typography.h2, color: C.textPrimary, marginVertical: Spacing.xs },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.lg },
  photoArea: { alignItems: 'center', marginVertical: Spacing.lg },
  photoCard: { width: 240, height: 240 },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { ...Typography.bodySm, color: C.danger, marginTop: 12 },
});
