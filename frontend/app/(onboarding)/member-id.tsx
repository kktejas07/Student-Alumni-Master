/**
 * Member ID — shown after Student/Mentor/Alumni/College onboarding.
 *
 * Features:
 *   • Interactive flip card (QR side ↔ barcode side, 3D Y-axis rotation)
 *   • Role-aware sub-label (STUDENT MEMBER / VERIFIED MENTOR / VERIFIED ALUMNI / INSTITUTION PARTNER)
 *   • Tier badge (defaults to Gold)
 *   • Copy ID / Save Card / Share actions
 *
 * After "Continue" → /(onboarding)/generating-experience → portal (role-based)
 */
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { PrimaryButton } from '@/src/views/auth/AuthControls';
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Copy, ShieldCheck, Save, Share2, CheckCircle2, Info, ArrowLeft } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { MemberIdCard, MemberRole, MemberTier } from '@/src/views/components/MemberIdCard';

export default function MemberId() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const role = (user?.role as MemberRole) || 'student';

  const uid = user?.unique_id || 'SA-XXX-XXXX-XXXXXX';
  const qr  = user?.qr_code_base64;

  // Per spec — badge validity = registration year (front line: "Valid from {year} · Lifetime membership")
  const regYear = new Date(user?.created_at || Date.now()).getFullYear();

  // Tier — fallback to gold for verified onboarded members
  const tier = ((user as any)?.ranking_tier as MemberTier) || 'gold';

  const onCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(uid);
        toast.success('Copied', 'Member ID copied to clipboard.');
        return;
      }
      toast.success('Member ID', uid);
    } catch {
      toast.error('Copy failed', 'Please try again.');
    }
  };

  const onSaveCard = async () => {
    try {
      // On web — best-effort: download the QR image as PNG so the user has the card on disk.
      if (Platform.OS === 'web' && qr) {
        const a = document.createElement('a');
        a.href = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
        a.download = `${uid}-member-id.png`;
        document.body.appendChild(a); a.click(); a.remove();
        toast.success('Card saved', 'Member ID image downloaded to your device.');
        return;
      }
      toast.success('Saved', 'Your Member ID is securely saved to your account.');
    } catch {
      toast.error('Save failed', 'Please try again.');
    }
  };

  const onShare = async () => {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://studentalumni.ai';
      const text = `I'm an SA member! 🎓\nMember ID: ${uid}\nVerify: ${baseUrl}/verify/${uid.split('-').pop()}`;
      if (Platform.OS === 'web' && (navigator as any).share) {
        await (navigator as any).share({ title: 'My SA Member ID', text });
        return;
      }
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(text);
        toast.success('Copied', 'Share text copied — paste it anywhere.');
      }
    } catch {/* user cancelled */}
  };

  const onContinue = () =>
    router.replace('/(onboarding)/generating-experience' as any);

  return (
    <AuthShell role={role}>
      <Pressable
        onPress={() => {
          if (params.from === 'onboarding') {
            if (role === 'college') {
              router.replace({ pathname: '/(onboarding)/college-onboard', params: { step: '5' } } as any);
            } else if (role === 'student') {
              router.replace({ pathname: '/(onboarding)/student-onboard', params: { step: '7' } } as any);
            } else if (role === 'alumni') {
              router.replace({ pathname: '/(onboarding)/alumni-onboard', params: { step: '5' } } as any);
            } else if (role === 'mentor') {
              router.replace({ pathname: '/(onboarding)/mentor-onboard', params: { step: '7' } } as any);
            } else {
              router.replace('/welcome');
            }
          } else {
            if (router.canGoBack()) {
              router.back();
            } else {
              if (role === 'college') {
                router.replace('/(onboarding)/college-onboard');
              } else if (role === 'student') {
                router.replace('/(onboarding)/student-onboard');
              } else if (role === 'alumni') {
                router.replace('/(onboarding)/alumni-onboard');
              } else {
                router.replace('/welcome');
              }
            }
          }
        }}
        style={({ hovered }: any) => hovered ? { opacity: 1 } : undefined}
        className="flex-row items-center gap-1.5 py-1.5 mb-2.5 self-start opacity-75 cursor-pointer transition duration-[160ms]"
        testID="member-id-back"
      >
        <ArrowLeft size={16} color="#4B5563" />
        <Text style={{ fontFamily: FONTS.med }} className="text-[#4B5563] text-[13px]">Back</Text>
      </Pressable>

      <View className="items-center py-1 w-full">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] mb-3.5">
          <CheckCircle2 size={13} color="#34D399" />
          <Text style={{ fontFamily: FONTS.bold }} className="text-[#059669] text-[11.5px] tracking-[0.3px]">Identity Verified</Text>
        </View>

        <Text style={{ fontFamily: FONTS.bold }} className="text-text text-2xl mb-1.5 text-center">Your Member ID</Text>
        <Text style={{ fontFamily: FONTS.med }} className="text-muted text-[12.5px] text-center mb-[18px] px-2.5 leading-[18px]">Your unique Student Alumni identity card</Text>

        <MemberIdCard
          uniqueId={uid}
          role={role}
          tier={tier}
          qrBase64={qr}
          validFromYear={regYear}
          verifyBaseUrl={(process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://studentalumni.ai').replace(/^https?:\/\//, '') + '/verify'}
        />

        <View className="flex-row gap-2 mt-3.5 w-full">
          <Pressable onPress={onCopy} className="flex-1 flex-row justify-center items-center gap-1.5 py-[11px] rounded-[10px] bg-white border border-glass-border cursor-pointer" testID="member-id-copy">
            <Copy size={14} color="#111827" />
            <Text style={{ fontFamily: FONTS.bold }} className="text-text text-xs">Copy ID</Text>
          </Pressable>
          <Pressable onPress={onSaveCard} className="flex-1 flex-row justify-center items-center gap-1.5 py-[11px] rounded-[10px] bg-white border border-glass-border cursor-pointer" testID="member-id-save">
            <Save size={14} color="#111827" />
            <Text style={{ fontFamily: FONTS.bold }} className="text-text text-xs">Save Card</Text>
          </Pressable>
          <Pressable onPress={onShare} className="flex-1 flex-row justify-center items-center gap-1.5 py-[11px] rounded-[10px] bg-white border border-glass-border cursor-pointer" testID="member-id-share">
            <Share2 size={14} color="#111827" />
            <Text style={{ fontFamily: FONTS.bold }} className="text-text text-xs">Share</Text>
          </Pressable>
        </View>

        <View className="w-full flex-row items-start gap-2 px-3.5 py-3 rounded-xl bg-white border border-glass-border mt-3.5">
          <Info size={14} color="#6B7280" />
          <Text style={{ fontFamily: FONTS.med }} className="flex-1 text-muted text-[11.5px] leading-[17px]">
            Your Member ID is permanent and unique to you. It appears on your profile, session receipts, certificates and placement letters.
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 mt-3">
          <ShieldCheck size={12} color="#9CA3AF" />
          <Text style={{ fontFamily: FONTS.med }} className="text-dim text-[11px]">Keep this ID safe — it's your gateway to SA.</Text>
        </View>

        <View className="w-full mt-[18px]">
          <PrimaryButton label="Continue to Your Dashboard →" onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}
