/**
 * Member ID — shown after Student onboarding step 7 (Badge).
 *
 * Backend auto-generates `unique_id` + `qr_code_base64` on onboarding submit.
 * We just display them here + let the user continue to Email Verification.
 */
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { PrimaryButton } from '@/src/views/auth/AuthControls';
import { FONTS, AC } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Copy, ShieldCheck, BadgeCheck } from 'lucide-react-native';
import { useToast } from '@/src/views/components';

export default function MemberId() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const role = (user?.role as any) || 'student';

  const uid = user?.unique_id || 'SA-XXXXXX';
  const qr = user?.qr_code_base64;

  const onCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        (navigator as any).clipboard.writeText(uid);
        toast.success('Copied', 'Member ID copied to clipboard.');
      }
    } catch {}
  };

  const onContinue = () => router.replace({ pathname: '/(auth)/email-verify', params: { email: user?.email || '', next: 'onboard' } } as any);

  return (
    <AuthShell role={role}>
      <View style={s.center}>
        <View style={s.shield}>
          <BadgeCheck size={36} color="#B07FDF" />
        </View>
        <Text style={s.title}>Your Member ID</Text>
        <Text style={s.sub}>Your unique SA identity — share it to connect with alumni, mentors, and colleges.</Text>

        <View style={s.card}>
          {qr ? (
            <Image source={{ uri: qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}` }} style={s.qr} resizeMode="contain" />
          ) : (
            <View style={[s.qr, { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.med, fontSize: 12 }}>QR loading…</Text>
            </View>
          )}
          <View style={s.idRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.idLabel}>MEMBER ID</Text>
              <Text style={s.idValue}>{uid}</Text>
            </View>
            <Pressable onPress={onCopy} style={s.copyBtn}><Copy size={14} color="#FFF" /><Text style={s.copyText}>Copy</Text></Pressable>
          </View>
          <View style={s.divider} />
          <View style={s.userRow}>
            <Text style={s.userName}>{user?.full_name || 'SA Member'}</Text>
            <Text style={s.userRole}>{role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.footNote}>
          <ShieldCheck size={14} color="rgba(255,255,255,0.45)" />
          <Text style={s.footText}>Keep this ID safe — it's your gateway to SA.</Text>
        </View>

        <View style={{ width: '100%', marginTop: 22 }}>
          <PrimaryButton label="Continue to verify your email →" onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 10 },
  shield: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 8, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', marginBottom: 22, paddingHorizontal: 10, lineHeight: 20 },
  card: { width: '100%', padding: 22, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 14 },
  qr: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#FFF' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  idLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  idValue: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 18, letterSpacing: 0.8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.28)', borderWidth: 1, borderColor: 'rgba(176,127,223,0.4)' },
  copyText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 11 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  userRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 14 },
  userRole: { color: '#B07FDF', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1 },
  footNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  footText: { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.med, fontSize: 11.5 },
});
