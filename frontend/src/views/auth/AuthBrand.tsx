import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Users, Briefcase, GraduationCap } from 'lucide-react-native';

function SALogoBig({ size = 48 }: { size?: number }) {
  return (
    <View className="flex-row items-center gap-3">
      <Image
        source={require('../../../assets/images/sa-icon.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
      <View>
        <Text className="text-white font-display text-lg leading-5">StudentAlumni</Text>
      </View>
    </View>
  );
}

export function AuthBrand({ role, minWidth = 980 }: { role?: any; minWidth?: number }) {
  const router = useRouter();
  return (
    <View className="flex-1 p-12 justify-center items-center relative overflow-hidden">
      <Pressable className="absolute top-6 left-12" onPress={() => router.push('/')}>
        <SALogoBig size={40} />
      </Pressable>

      {/* Subtle purple glow */}
      <View
        className="absolute rounded-full"
        style={{
          top: '20%', left: '-20%', width: 500, height: 500,
          backgroundColor: 'rgba(124,58,237,0.15)',
          filter: 'blur(100px)',
        }}
      />

      <View className="w-full max-w-[500px] mt-5">
        <Text className="text-[52px] font-display text-white tracking-tight leading-[60px] mb-4">
          Turn ambition{'\n'}into <Text className="text-indigo">opportunity.</Text>
        </Text>
        
        <Text className="text-[15px] font-body text-white/70 leading-6 mb-10 max-w-[420px]">
          Connect with mentors, discover internships, and accelerate your future all in one place built for students.
        </Text>

        <View className="gap-5 mb-12">
          <View className="flex-row items-center gap-4">
            <View className="w-[42px] h-[42px] rounded-xl bg-white/[0.03] border border-white/[0.08] items-center justify-center">
              <Sparkles size={20} color="#C4B5FD" />
            </View>
            <Text className="text-white font-bold text-[14px]">AI Career Guidance</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-[42px] h-[42px] rounded-xl bg-white/[0.03] border border-white/[0.08] items-center justify-center">
              <Users size={20} color="#C4B5FD" />
            </View>
            <Text className="text-white font-bold text-[14px]">Mentor Connections</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-[42px] h-[42px] rounded-xl bg-white/[0.03] border border-white/[0.08] items-center justify-center">
              <Briefcase size={20} color="#C4B5FD" />
            </View>
            <Text className="text-white font-bold text-[14px]">Jobs & Internships</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-[42px] h-[42px] rounded-xl bg-white/[0.03] border border-white/[0.08] items-center justify-center">
              <GraduationCap size={20} color="#C4B5FD" />
            </View>
            <Text className="text-white font-bold text-[14px]">Alumni Network</Text>
          </View>
        </View>

        <View className="flex-row gap-8">
          <View className="gap-1">
            <Text className="text-white font-display text-lg tracking-tight">12.4K+</Text>
            <Text className="text-white/60 font-body text-sm">Students</Text>
          </View>
          <View className="gap-1">
            <Text className="text-white font-display text-lg tracking-tight">500+</Text>
            <Text className="text-white/60 font-body text-sm">Mentors</Text>
          </View>
          <View className="gap-1">
            <Text className="text-white font-display text-lg tracking-tight">200+</Text>
            <Text className="text-white/60 font-body text-sm">Colleges</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
