import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, MapPin, Globe, Phone, Mail, Building2 } from 'lucide-react-native';
import { CC } from '../tokens';
import { Av, Badge } from '../atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function ProfileView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  
  const user: any = useAuthStore((s) => s.user);
  const collegeName = user?.institution || "College Admin";
  const initials = collegeName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() || "C";
  const city = user?.city || "City";
  const state = user?.state || "State";
  const location = `${city}, ${state}`.replace(/^, | , $/g, '');
  const affiliation = user?.affiliation || "Unknown Affiliation";
  const studentsCount = user?.students_count || "0";
  const email = user?.email || "admin@college.edu";
  
  return (
    <View className={stack ? 'flex-col gap-4' : 'flex-row gap-4'}>
      <View className={`${stack ? '' : 'flex-[1.5]'} gap-3`}>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[18px]">
          <View className="flex-row items-center gap-[14px]">
            <Av initials={initials} size={70} color={CC.primary} />
            <View className="flex-1 min-w-0">
              <Text className="text-text font-display-bold text-[20px]">{collegeName}</Text>
              <View className="flex-row gap-[6px] mt-2 flex-wrap">
                <Badge label="Verified ✓" color="green" />
              </View>
            </View>
            <Pressable className="px-[14px] h-8 rounded-lg border border-glass-border bg-glass-soft items-center justify-center">
              <Text className="text-teal font-body-bold text-xs">Edit</Text>
            </Pressable>
          </View>
          <View className="mt-[18px] gap-2">
            <Row Icon={MapPin}    label="Location"  value={location} />
            <Row Icon={Mail}      label="Email"     value={email} />
            <Row Icon={Building2} label="Affiliation" value={affiliation} />
          </View>
        </View>
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[18px]">
          <Text className="text-text font-display-bold text-[14px]">Accreditations</Text>
          <View className="flex-row flex-wrap gap-[10px] mt-3">
            {[{ l:'AICTE',c:'#A78BFA' }, { l:'Autonomous',c:'#22C55E' }].map((x) => (
              <View key={x.l} className="w-[110px] items-center p-3 rounded-xl border bg-glass-soft gap-[6px]" style={{ borderColor: x.c + '60' }}>
                <Award size={20} color={x.c} />
                <Text className="text-text font-body-bold text-[10.5px] text-center">{x.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View className={stack ? 'w-full' : 'w-[320px]'}>
        <LinearGradient colors={[CC.primary, CC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-[18px] p-[22px] items-start">
          <Text className="text-text font-display-bold text-[10px] tracking-widest">ADMIN PORTAL · DIGITAL ID</Text>
          <Av initials={initials} size={56} color="#fff" />
          <Text className="text-text font-display-bold text-[18px] mt-[10px]">{collegeName}</Text>
          <Text className="text-teal font-body-bold text-[11.5px] mt-[2px]">Admin Code: ADM-2026</Text>
          <View className="flex-row items-center self-stretch mt-[14px] py-[10px] border-t border-b border-[rgba(255,255,255,0.20)]">
            <Stat label="Students" value={studentsCount} /><View className="w-px h-6 bg-[rgba(255,255,255,0.20)]" />
            <Stat label="Alumni"   value="—" /><View className="w-px h-6 bg-[rgba(255,255,255,0.20)]" />
            <Stat label="Placement" value="—" />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
function Row({ Icon, label, value }: any) {
  return (
    <View className="flex-row items-center gap-[10px]">
      <View className="w-[26px] h-[26px] rounded-lg bg-[rgba(99,102,241,0.10)] items-center justify-center">
        <Icon size={13} color={CC.accentBright} />
      </View>
      <Text className="text-muted font-body-bold text-[11px] w-[90px]">{label}</Text>
      <Text numberOfLines={1} className="text-text font-body text-[12.5px] flex-1">{value}</Text>
    </View>
  );
}
function Stat({ label, value }: any) {
  return (<View className="flex-1 items-center"><Text className="text-text font-display-bold text-[16px]">{value}</Text><Text className="text-[rgba(255,255,255,0.7)] font-body-bold text-[9.5px] tracking-widest mt-[2px]">{label}</Text></View>);
}
