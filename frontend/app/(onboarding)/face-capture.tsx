/**
 * Onboarding step 5 — Face capture / Profile photo.
 * Web: split-screen.  Native: full-screen dark.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera as CameraIcon, ImagePlus, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';
import { OnboardingShell } from '@/src/views/web/OnboardingShell';
import { WebGhostBtn } from '@/src/views/web/AuthWebControls';

const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function FaceCapture() {
  const router = useRouter();
  const toast = useToast();
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
        toast.error('Camera blocked', 'Grant camera permission in settings.');
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
      toast.success('Photo captured', 'Looking great!');
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
      toast.success('Photo selected', 'Picture uploaded.');
    }
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const payload: any = {
        school_info: onboarding.school_info,
        career_path: onboarding.career_path,
        interests: onboarding.interests,
        skills: onboarding.skills,
        bio: onboarding.bio,
        face_image_base64: onboarding.face_image_base64,
        // Collected during role-details for ALL roles per HTML spec
        phone: onboarding.phone,
      };
      if (onboarding.student_age || onboarding.student_education_level || onboarding.student_career_goal) {
        payload.student_info = {
          age: onboarding.student_age || 18,
          education_level: onboarding.student_education_level || 'btech',
          career_interests: onboarding.interests,
          career_goal: onboarding.student_career_goal || undefined,
          cgpa: onboarding.student_cgpa,
        };
      }
      if (onboarding.mentor_organization || onboarding.mentor_job_title) {
        payload.mentor_info = {
          category: onboarding.mentor_category || 'it_software',
          organization: onboarding.mentor_organization || '',
          job_title: onboarding.mentor_job_title || '',
          linkedin_url: onboarding.mentor_linkedin_url || undefined,
          years_of_experience: onboarding.mentor_years_of_experience,
          bio: onboarding.bio,
          session_price_inr: onboarding.mentor_session_price_inr,
        };
      }
      if (onboarding.alumni_employment_status) {
        payload.alumni_info = {
          graduation_year: onboarding.school_info.graduation_year || new Date().getFullYear(),
          university: onboarding.school_info.institution_name || '',
          current_employer: onboarding.alumni_employer || undefined,
          current_role: onboarding.alumni_role || undefined,
          employment_status: onboarding.alumni_employment_status,
          linkedin_url: onboarding.alumni_linkedin_url || undefined,
          wants_to_mentor: !!onboarding.alumni_wants_to_mentor,
          mentor_category: onboarding.alumni_mentor_category || onboarding.alumni_mentor_categories?.[0] || undefined,
          mentor_categories: onboarding.alumni_mentor_categories || (onboarding.alumni_mentor_category ? [onboarding.alumni_mentor_category] : undefined),
        };
      }
      await api.completeOnboarding(payload);
      await refreshUser();
      onboarding.reset();
      toast.success('Profile created!', 'Generating your unique ID and QR code.');
      router.replace('/(onboarding)/success');
    } catch (e: any) {
      setError(e.message);
      toast.error('Setup failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      stepBarSteps={STEPS}
      title={<>Add your{'\n'}profile photo</>}
      subtitle="We'll use this for your unique platform ID so mentors and alumni can recognize you."
      primaryLabel={submitting ? 'Setting up…' : 'Finish & generate my ID'}
      primaryLoading={submitting}
      primaryTestID="face-finish-btn"
      onPrimary={submit}
      secondaryLabel="Skip for now"
      onSecondary={submit}
      onBack={() => router.back()}
    >
      {/* Photo area */}
      <View style={styles.photoWrap}>
        <View style={styles.photoFrame}>
          {onboarding.face_image_base64 ? (
            <Image source={{ uri: onboarding.face_image_base64 }} style={styles.photo} />
          ) : (
            <View style={styles.photoEmpty}>
              <CameraIcon size={42} color="rgba(255,255,255,0.40)" />
              <Text style={styles.photoEmptyText}>No photo yet</Text>
            </View>
          )}
        </View>
      </View>

      {/* Picker buttons */}
      <View style={{ gap: 10, marginBottom: 8 }}>
        <Pressable
          onPress={pickFromCamera}
          testID="face-capture-camera-btn"
          style={({ hovered, pressed }: any) => [
            styles.cameraBtn,
            hovered && { backgroundColor: '#9059D9' },
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          {onboarding.face_image_base64
            ? <RotateCcw size={18} color="#FFFFFF" />
            : <CameraIcon size={18} color="#FFFFFF" />}
          <Text style={styles.cameraBtnText}>
            {onboarding.face_image_base64 ? 'Retake with camera' : 'Capture with camera'}
          </Text>
        </Pressable>
        <WebGhostBtn
          label="Choose from gallery"
          onPress={pickFromLibrary}
          testID="face-capture-gallery-btn"
          leftIcon={<ImagePlus size={18} color="rgba(255,255,255,0.85)" />}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  photoWrap: { alignItems: 'center', marginVertical: 8, marginBottom: 24 },
  photoFrame: {
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(196,181,253,0.30)',
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 12px 32px rgba(124,58,237,0.35)',
  },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { alignItems: 'center', gap: 8 },
  photoEmptyText: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    backgroundColor: '#7C3AED',
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12,
    boxShadow: '0px 8px 16px rgba(124,58,237,0.35)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  cameraBtnText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  error: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 13, backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgba(252,165,165,0.3)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginTop: 4 },
});
