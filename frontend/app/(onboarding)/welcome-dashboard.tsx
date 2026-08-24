import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const CHIPS = [
  { id: 'career', label: 'Career AI',    emoji: '🧭' },
  { id: 'intern', label: 'Internships',  emoji: '💼' },
  { id: 'net',    label: 'Network',      emoji: '🤝' },
  { id: 'events', label: 'Events',       emoji: '📅' },
  { id: 'wallet', label: 'Wallet',       emoji: '💰' },
];

const ROLE_LABEL: Record<string, string> = {
  student: 'Student', mentor: 'Mentor', alumni: 'Alumni',
  college: 'College', admin: 'Admin',
};

export default function DashboardPreview() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';
  const roleName = ROLE_LABEL[role] || 'Student';

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(Platform.OS === 'web' ? '/platform' : '/(tabs)');
    }, 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <AuthShell role={role as any}>
      <View className="items-center py-6">
        <View className="w-[72px] h-[72px] rounded-[36px] bg-violet/18 border-[1.5px] border-violet/40 items-center justify-center mb-[22px]">
          <ActivityIndicator size="large" color="#B07FDF" />
        </View>
        <Text className="text-gray-900 font-body-bold text-[28px] mb-2.5 text-center">Welcome to SA! 🎉</Text>
        <Text className="text-gray-700 font-body text-[15px] mb-1.5 text-center">
          You're all set as a <Text className="text-violet font-body-bold">{roleName}</Text>.
        </Text>
        <Text className="text-gray-500 font-body text-[13px] mb-7 text-center">
          Redirecting to your <Text className="text-gray-900 font-body-bold">{roleName} Dashboard</Text>...
        </Text>

        <View className="flex-row flex-wrap gap-2 justify-center mb-7">
          {CHIPS.map((c) => (
            <View key={c.id} className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-violet/16 border border-violet/38">
              <Text className="text-[13px]">{c.emoji}</Text>
              <Text className="text-purple-200 font-body text-[12.5px]">{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </AuthShell>
  );
}
