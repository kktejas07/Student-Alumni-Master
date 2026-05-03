/**
 * Member ID — shown after Student/Mentor/Alumni/College onboarding.
 *
 * Features:
 *   • Interactive flip card (QR side ↔ barcode side, 3D Y-axis rotation)
 *   • Role-aware sub-label (STUDENT MEMBER / VERIFIED MENTOR / VERIFIED ALUMNI / INSTITUTION PARTNER)
 *   • Tier badge (defaults to Gold)
 *   • Copy ID / Save Card / Share actions
 *
 * After "Continue" → /(auth)/email-verify → /(auth)/two-fa-setup → /welcome-dashboard
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { PrimaryButton } from '@/src/views/auth/AuthControls';
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Copy, ShieldCheck, Save, Share2, CheckCircle2, Info } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { MemberIdCard, MemberRole, MemberTier } from '@/src/views/components/MemberIdCard';

export default function MemberId() {
  const router = useRouter();
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
      const text = `I'm an SA member! 🎓\nMember ID: ${uid}\nVerify: https://studentalumni.app/verify/${uid.split('-').pop()}`;
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
    router.replace({ pathname: '/(auth)/email-verify', params: { email: user?.email || '', next: 'onboard' } } as any);

  return (
    <AuthShell role={role}>
      <View style={s.center}>
        {/* Identity Verified pill */}
        <View style={s.verifiedPill}>
          <CheckCircle2 size={13} color="#34D399" />
          <Text style={s.verifiedText}>Identity Verified</Text>
        </View>

        <Text style={s.title}>Your Member ID</Text>
        <Text style={s.sub}>Your unique Student Alumni identity card</Text>

        {/* Interactive flip card */}
        <MemberIdCard
          uniqueId={uid}
          role={role}
          tier={tier}
          qrBase64={qr}
          validFromYear={regYear}
        />

        {/* Action buttons row */}
        <View style={s.actionsRow}>
          <Pressable onPress={onCopy} style={s.actionBtn} testID="member-id-copy">
            <Copy size={14} color="#FFF" />
            <Text style={s.actionText}>Copy ID</Text>
          </Pressable>
          <Pressable onPress={onSaveCard} style={s.actionBtn} testID="member-id-save">
            <Save size={14} color="#FFF" />
            <Text style={s.actionText}>Save Card</Text>
          </Pressable>
          <Pressable onPress={onShare} style={s.actionBtn} testID="member-id-share">
            <Share2 size={14} color="#FFF" />
            <Text style={s.actionText}>Share</Text>
          </Pressable>
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Info size={14} color="rgba(255,255,255,0.55)" />
          <Text style={s.infoText}>
            Your Member ID is permanent and unique to you. It appears on your profile, session receipts, certificates and placement letters.
          </Text>
        </View>

        <View style={s.footNote}>
          <ShieldCheck size={12} color="rgba(255,255,255,0.4)" />
          <Text style={s.footText}>Keep this ID safe — it's your gateway to SA.</Text>
        </View>

        <View style={{ width: '100%', marginTop: 18 }}>
          <PrimaryButton label="Continue to Email Verification →" onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 4, width: '100%' },

  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
    marginBottom: 14,
  },
  verifiedText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3 },

  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 24, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', marginBottom: 18, paddingHorizontal: 10, lineHeight: 18 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14, width: '100%' },
  actionBtn: {
    flex: 1, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  actionText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },

  infoBox: {
    width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 14,
  },
  infoText: { flex: 1, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17 },

  footNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  footText: { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.med, fontSize: 11 },
});
