/**
 * Onboarding step 5 — Face capture / Profile photo.
 * Web: split-screen.  Native: full-screen dark.
 */
import { useState } from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera as CameraIcon, ImagePlus, RotateCcw, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/src/views/components';
import { WebcamModal } from '@/src/views/components/WebcamModal';
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
  const [webcamVisible, setWebcamVisible] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const confirmPhoto = () => {
    if (!pendingPhoto) return;
    onboarding.setFaceImage(pendingPhoto);
    setPendingPhoto(null);
    toast.success('Photo confirmed', 'Looking great!');
  };

  const retakePhoto = () => {
    setPendingPhoto(null);
    pickFromCamera();
  };

  const ensureCameraPerm = async (): Promise<boolean> => {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    return res.granted;
  };

  const pickFromCamera = async () => {
    setError(null);
    if (Platform.OS === 'web') {
      setWebcamVisible(true);
      return;
    }
    const ok = await ensureCameraPerm();
    if (!ok) {
      toast.error('Camera blocked', 'Please grant camera access to capture your face photo.');
      return;
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
      setPendingPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
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
      setPendingPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
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
        face_image_base64: onboarding.face_image_base64 || pendingPhoto || undefined,
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
      <View className="items-center my-2 mb-6">
        <View
          style={{ boxShadow: '0px 12px 32px rgba(99,102,241,0.35)' }}
          className="w-[220px] h-[220px] rounded-full bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(165,180,252,0.30)] overflow-hidden items-center justify-center"
        >
          {pendingPhoto ? (
            <Image source={{ uri: pendingPhoto }} className="w-full h-full" />
          ) : onboarding.face_image_base64 ? (
            <Image source={{ uri: onboarding.face_image_base64 }} className="w-full h-full" />
          ) : (
            <View className="items-center gap-2">
              <CameraIcon size={42} color="rgba(255,255,255,0.40)" />
              <Text style={{ fontFamily: 'DMSans_500Medium' }} className="text-dim text-[13px]">No photo yet</Text>
            </View>
          )}
        </View>
      </View>

      <View className="gap-2.5 mb-2">
        {pendingPhoto ? (
          <>
            <Pressable
              onPress={confirmPhoto}
              style={({ pressed }: any) => pressed ? { transform: [{ scale: 0.99 }] } : undefined}
              className="flex-row items-center justify-center gap-2.5 bg-[#818CF8] py-[13px] px-4 rounded-xl shadow-[0px_8px_16px_rgba(99,102,241,0.35)] cursor-pointer transition duration-[160ms]"
            >
              <Check size={18} color="#000" />
              <Text style={{ fontFamily: 'DMSans_700Bold' }} className="text-[#1E1B4B] text-sm">Confirm photo</Text>
            </Pressable>
            <WebGhostBtn
              label="Retake"
              onPress={retakePhoto}
              leftIcon={<RotateCcw size={18} color="#1F2937" />}
            />
          </>
        ) : (
          <>
            <Pressable
              onPress={pickFromCamera}
              testID="face-capture-camera-btn"
              style={({ hovered, pressed }: any) => [
                hovered && { backgroundColor: '#9059D9' },
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
              className="flex-row items-center justify-center gap-2.5 bg-[#6366F1] py-[13px] px-4 rounded-xl shadow-[0px_8px_16px_rgba(99,102,241,0.35)] cursor-pointer transition duration-[160ms]"
            >
              {onboarding.face_image_base64
                ? <RotateCcw size={18} color="#111827" />
                : <CameraIcon size={18} color="#111827" />}
              <Text style={{ fontFamily: 'DMSans_700Bold' }} className="text-[#EEF2FF] text-sm">
                {onboarding.face_image_base64 ? 'Retake with camera' : 'Capture with camera'}
              </Text>
            </Pressable>
            <WebGhostBtn
              label="Choose from gallery"
              onPress={pickFromLibrary}
              testID="face-capture-gallery-btn"
              leftIcon={<ImagePlus size={18} color="#1F2937" />}
            />
          </>
        )}
      </View>

      {error && (
        <Text
          style={{ fontFamily: 'DMSans_500Medium' }}
          className="text-[#FCA5A5] text-[13px] bg-[rgba(220,38,38,0.15)] border border-[rgba(252,165,165,0.3)] px-3 py-[9px] rounded-lg mt-1"
        >
          {error}
        </Text>
      )}

      <WebcamModal
        visible={webcamVisible}
        onClose={() => setWebcamVisible(false)}
        onCapture={(base64) => {
          setPendingPhoto(base64);
          setWebcamVisible(false);
        }}
      />
    </OnboardingShell>
  );
}
