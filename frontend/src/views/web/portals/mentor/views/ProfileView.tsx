// @ts-nocheck
/**
 * Mentor Portal — Profile view: editable profile + Digital ID card with QR.
 */
import React from 'react';
import { View, Text, Pressable, useWindowDimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode, Globe, MapPin, Briefcase, GraduationCap } from 'lucide-react-native';
import { Linkedin } from '../../student/iconShims';
import { MC, FONTS } from '../tokens';
import { Av, StarRow, Badge } from '../atoms';
import { MENTOR } from '../data';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';

export function ProfileView() {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const stack = width < 980;

  const user = useAuthStore((u) => u.user) as any;
  const fullName = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim() || MENTOR.name;
  const initials = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || MENTOR.avatar).toUpperCase();
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;
  const role = user?.mentor_info?.current_role || user?.mentor_info?.job_title || user?.current_role || user?.headline || MENTOR.role;
  const company = user?.mentor_info?.current_company || user?.mentor_info?.organization || user?.current_company || MENTOR.company;
  const college = user?.mentor_info?.college || user?.mentor_info?.education || user?.college || MENTOR.college;
  const batch = user?.mentor_info?.batch || user?.batch || MENTOR.batch;
  const rating = user?.mentor_info?.rating || user?.rating || MENTOR.rating;
  const sessions = user?.mentor_info?.sessions_completed || user?.sessions_completed || MENTOR.sessions;
  const price = user?.mentor_info?.session_price || user?.session_price || MENTOR.price;
  const expertise = user?.skills || user?.mentor_info?.expertise || user?.expertise || MENTOR.expertise;

  return (
    <View className="gap-4" style={{ flexDirection: stack ? 'column' : 'row' }}>
      <View className="flex-1 min-w-0 gap-3">
        <View className="bg-card border border-glass-border rounded-[14px] p-[18px]">
          <View className="flex-row items-center gap-3.5">
            <Av initials={initials} size={72} color={MC.teal} photo={photo} />
            <View className="flex-1 min-w-0">
              <Text className="text-white font-display-bold text-[22px] tracking-[-0.5px]">{fullName}</Text>
              <Text className="text-muted font-body-semibold text-[13px]">{role} · {company}</Text>
              <View className="flex-row gap-2 mt-1.5 items-center">
                <StarRow rating={Math.round(rating)} size={13} />
                <Text className="text-muted font-body-bold text-xs">{rating} · {sessions} sessions</Text>
              </View>
            </View>
            <Pressable onPress={() => toast.info('Edit profile', 'Use Settings to update your profile.')} className="px-[14px] h-8 rounded-lg border items-center justify-center" style={{ borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)' }}>
              <Text className="text-tealP font-body-bold text-xs">Edit Profile</Text>
            </Pressable>
          </View>

          <View className="mt-[18px] gap-2">
            <Row Icon={Briefcase} label="Role" value={`${role} at ${company}`} />
            <Row Icon={GraduationCap} label="Alma Mater" value={`${college} · Batch of ${batch}`} />
            <Row Icon={MapPin} label="Location" value="Mumbai, India" />
            <Row Icon={Linkedin} label="LinkedIn" value="linkedin.com/in/sureshrao" link="https://linkedin.com/in/sureshrao" />
            <Row Icon={Globe} label="Website" value="sureshrao.dev" link="https://sureshrao.dev" />
          </View>
        </View>

        <View className="bg-card border border-glass-border rounded-[14px] p-[18px]">
          <Text className="text-white font-display-bold text-[14px] mb-2">Expertise</Text>
          <View className="flex-row flex-wrap gap-2 mt-1">
            {expertise.map((e: string) => (
              <View key={e} className="bg-teal/[0.10] border rounded-lg px-2.5 py-[5px]" style={{ borderColor: MC.border2 }}>
                <Text className="text-tealP font-body-bold text-xs">{e}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-card border border-glass-border rounded-[14px] p-[18px]">
          <Text className="text-white font-display-bold text-[14px] mb-2">Pricing</Text>
          <View className="flex-row gap-3 mt-2">
            <View className="flex-1 p-3.5 rounded-xl border" style={{ borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)' }}>
              <Text className="text-tealP font-display-bold text-[11px] tracking-[0.6px]">1:1 SESSION</Text>
              <Text className="text-white font-display-bold text-[22px] mt-1">₹{price}</Text>
              <Text className="text-muted font-body-semibold text-[11px]">Per 30 min</Text>
            </View>
            <View className="flex-1 p-3.5 rounded-xl border bg-bg2" style={{ borderColor: MC.border }}>
              <Text className="text-muted font-display-bold text-[11px] tracking-[0.6px]">EVENT (PAID)</Text>
              <Text className="text-white font-display-bold text-[22px] mt-1">₹499</Text>
              <Text className="text-muted font-body-semibold text-[11px]">Per seat</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3" style={{ width: stack ? '100%' : 320 }}>
        <LinearGradient colors={['#0F3830', '#0A1A16'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-[18px] p-[22px] border" style={{ borderColor: MC.border2 }}>
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-1.5 h-1.5 rounded-[3px] bg-tealP" />
            <Text className="text-tealP font-display-bold text-[10px] tracking-[1px]">VERIFIED MENTOR</Text>
          </View>
          <Av initials={initials} size={64} color={MC.teal} photo={photo} />
          <Text className="text-white font-display-bold text-xl tracking-[-0.5px] mt-2.5">{fullName}</Text>
          <Text className="text-tealP font-body-bold text-xs mt-0.5">{role} · {company}</Text>

          <View className="flex-row items-center mt-3.5 py-3 border-b border-t border-glass-border">
            <View className="items-center flex-1">
              <Text className="text-white font-display-bold text-[16px]">{sessions}</Text>
              <Text className="text-muted font-body-bold text-[9.5px] tracking-[0.6px] mt-0.5">Sessions</Text>
            </View>
            <View className="w-px h-6 bg-glass-border" />
            <View className="items-center flex-1">
              <Text className="text-white font-display-bold text-[16px]">{rating}★</Text>
              <Text className="text-muted font-body-bold text-[9.5px] tracking-[0.6px] mt-0.5">Rating</Text>
            </View>
            <View className="w-px h-6 bg-glass-border" />
            <View className="items-center flex-1">
              <Text className="text-white font-display-bold text-[16px]">{batch}</Text>
              <Text className="text-muted font-body-bold text-[9.5px] tracking-[0.6px] mt-0.5">Batch</Text>
            </View>
          </View>

          <View className="items-center justify-center bg-white rounded-xl p-3.5 mt-3.5"><QrCode size={88} color={MC.tealP} /></View>
          <Text className="text-dim font-body-semibold text-[10px] text-center mt-2">Scan to view profile · sa.alumni/m/SR-CTO-08</Text>
          <Pressable onPress={() => Linking.openURL('https://www.studentalumni.in')} className="bg-tealP py-[11px] items-center rounded-[10px] mt-3">
            <Text className="text-bg font-display-bold text-xs">Share Mentor Card</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}

function Row({ Icon, label, value, link }: any) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="w-[26px] h-[26px] rounded-lg items-center justify-center bg-teal/[0.10]"><Icon size={13} color={MC.tealP} /></View>
      <Text className="text-muted font-body-bold text-[11px] w-[90px]">{label}</Text>
      {link ? (
        <Pressable onPress={() => Linking.openURL(link)}>
          <Text className="text-tealP font-body-semibold text-[13px]">{value}</Text>
        </Pressable>
      ) : (
        <Text className="text-white font-body-semibold text-[13px]">{value}</Text>
      )}
    </View>
  );
}
