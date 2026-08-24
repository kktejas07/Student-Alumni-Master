import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { OnboardingShell } from '@/src/views/web/OnboardingShell';

const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function OnboardingSuccess() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <OnboardingShell
      step={4}
      stepBarSteps={STEPS}
      kicker="You're all set! 🎉"
      title={
        <>
          Welcome to{'\n'}
          <Text style={{ color: '#C4B5FD' }}>your career platform</Text>
        </>
      }
      primaryLabel="Go to my dashboard →"
      primaryTestID="success-dashboard-btn"
      onPrimary={() => router.replace('/(onboarding)/welcome-dashboard')}
      showBack={false}
    >
      <View className="flex-row items-center gap-3 mb-[18px]">
        <View className="w-12 h-12 rounded-[14px] bg-[rgba(16,185,129,0.18)] border border-[rgba(52,211,153,0.40)] items-center justify-center">
          <CheckCircle2 size={26} color="#34D399" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-body-bold text-base">Profile created</Text>
          <Text className="text-gray-500 font-body text-[13px] mt-0.5">Your platform identity is ready.</Text>
        </View>
      </View>

      <View className="bg-violet/14 border border-violet/30 rounded-[14px] p-4 mb-3.5">
        <Text className="text-gray-500 font-body-bold text-[10.5px] tracking-[1.2px]">YOUR UNIQUE ID</Text>
        <Text className="text-gray-900 font-body-bold text-[22px] tracking-[1.5px] mt-1.5" testID="success-unique-id">{user?.unique_id || '—'}</Text>
        <Text className="text-gray-500 font-body text-xs mt-1.5 leading-[17px]">Use this ID anywhere on the platform.</Text>
      </View>

      <View className="bg-bg2 border border-gray-200 rounded-[14px] p-4 mb-3.5">
        <Text className="text-gray-500 font-body-bold text-[10.5px] tracking-[1.2px] text-center">YOUR PLATFORM QR</Text>
        <View className="items-center mt-1.5">
          {user?.qr_code_base64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
              className="w-[180px] h-[180px] rounded-xl bg-white"
              testID="success-qr-image"
            />
          ) : (
            <View className="w-[180px] h-[180px] rounded-xl bg-white items-center justify-center">
              <Text className="text-violet font-body-medium">QR not available</Text>
            </View>
          )}
          <Text className="text-gray-500 font-body text-xs mt-[10px] leading-[17px] text-center">
            Mentors can scan this to connect with you instantly.
          </Text>
        </View>
      </View>

      <View className="bg-[rgba(252,211,77,0.10)] border border-[rgba(252,211,77,0.28)] rounded-[14px] p-4 mb-3.5 flex-row items-start gap-3">
        <Sparkles size={22} color="#FCD34D" />
        <View className="flex-1">
          <Text className="text-gray-900 font-body-bold text-sm">Your AI roadmap is ready</Text>
          <Text className="text-gray-600 font-body text-[12.5px] mt-1 leading-[18px]">
            Personalized milestones, courses and mentor matches based on your career path.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}
