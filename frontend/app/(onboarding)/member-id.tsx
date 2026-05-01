/**
 * Member ID — shown after Student onboarding step 7 (Badge).
 *
 * Per spec — includes:
 *   • QR code + unique_id from backend
 *   • Badge validity (year of registration → +5 years)
 *   • Default plan: BASIC (upgrade flow lives on dashboard)
 *   • Download / Save / Share actions
 *
 * After "Continue" → /(auth)/email-verify → /(auth)/two-fa-setup → /welcome-dashboard
 */
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { PrimaryButton } from '@/src/views/auth/AuthControls';
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Copy, ShieldCheck, BadgeCheck, Download, Share2, Save, Sparkles, CalendarCheck } from 'lucide-react-native';
import { useToast } from '@/src/views/components';

export default function MemberId() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const role = (user?.role as any) || 'student';

  const uid = user?.unique_id || 'SA-XXXXXX';
  const qr  = user?.qr_code_base64;

  // Per spec — badge validity = registration year → +5 years
  const regYear = new Date(user?.created_at || Date.now()).getFullYear();
  const validThrough = regYear + 5;

  // Web ref for download (HTMLDivElement on web only)
  const cardRef = useRef<any>(null);

  const onCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        (navigator as any).clipboard.writeText(uid);
        toast.success('Copied', 'Member ID copied to clipboard.');
      }
    } catch {}
  };

  const onSave = () => {
    // The Member ID is already saved server-side at onboarding-complete.
    // This button confirms it for the user — UX is essentially a "saved!" confirmation.
    toast.success('Saved', 'Your Member ID is securely saved to your account.');
  };

  const onDownload = async () => {
    try {
      // On web — best-effort: download the QR image as PNG.
      if (Platform.OS === 'web' && qr) {
        const a = document.createElement('a');
        a.href = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
        a.download = `${uid}-member-id.png`;
        document.body.appendChild(a); a.click(); a.remove();
        toast.success('Downloaded', 'Member ID QR saved to your device.');
        return;
      }
      toast.success('Coming soon', 'Native PDF download will land in v2.');
    } catch {
      toast.error('Download failed', 'Please try again.');
    }
  };

  const onShare = async () => {
    try {
      const text = `I'm an SA member! 🎓\nMember ID: ${uid}\nValid through ${validThrough}.\nJoin at https://studentalumni.app`;
      if (Platform.OS === 'web' && (navigator as any).share) {
        await (navigator as any).share({ title: 'My SA Member ID', text });
        return;
      }
      // Fallback: copy text
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(text);
        toast.success('Copied', 'Share text copied — paste it anywhere.');
      }
    } catch {/* user cancelled */}
  };

  const onContinue = () => router.replace({ pathname: '/(auth)/email-verify', params: { email: user?.email || '', next: 'onboard' } } as any);

  return (
    <AuthShell role={role}>
      <View style={s.center}>
        <View style={s.shield}>
          <BadgeCheck size={36} color="#B07FDF" />
        </View>
        <Text style={s.title}>Your Member ID</Text>
        <Text style={s.sub}>Your unique SA identity — save it to connect with alumni, mentors, and colleges.</Text>

        <View style={s.card} ref={cardRef as any}>
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

          <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <View style={s.metaCol}>
              <Text style={s.idLabel}>NAME</Text>
              <Text style={s.metaVal}>{user?.full_name || 'SA Member'}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.idLabel}>ROLE</Text>
              <Text style={s.metaVal}>{role.toUpperCase()}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.idLabel}>VALID THROUGH</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CalendarCheck size={12} color="#5EEAD4" />
                <Text style={s.metaVal}>{validThrough}</Text>
              </View>
            </View>
            <View style={s.metaCol}>
              <Text style={s.idLabel}>PLAN</Text>
              <View style={s.planPill}>
                <Sparkles size={11} color="#FCD34D" />
                <Text style={s.planText}>BASIC</Text>
              </View>
            </View>
          </View>
          <Text style={s.upgradeHint}>You can upgrade your plan anytime from your dashboard.</Text>
        </View>

        <View style={s.actionsRow}>
          <Pressable onPress={onDownload} style={s.actionBtn} testID="member-id-download">
            <Download size={15} color="#FFF" /><Text style={s.actionText}>Download</Text>
          </Pressable>
          <Pressable onPress={onSave} style={s.actionBtn} testID="member-id-save">
            <Save size={15} color="#FFF" /><Text style={s.actionText}>Save</Text>
          </Pressable>
          <Pressable onPress={onShare} style={s.actionBtn} testID="member-id-share">
            <Share2 size={15} color="#FFF" /><Text style={s.actionText}>Share</Text>
          </Pressable>
        </View>

        <View style={s.footNote}>
          <ShieldCheck size={14} color="rgba(255,255,255,0.45)" />
          <Text style={s.footText}>Keep this ID safe — it's your gateway to SA.</Text>
        </View>

        <View style={{ width: '100%', marginTop: 16 }}>
          <PrimaryButton label="Continue to verify your email →" onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 4 },
  shield: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 24, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', marginBottom: 18, paddingHorizontal: 10, lineHeight: 18 },
  card: { width: '100%', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 12 },
  qr: { width: 140, height: 140, borderRadius: 12, backgroundColor: '#FFF' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  idLabel: { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.8 },
  idValue: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 17, letterSpacing: 0.6, marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.28)', borderWidth: 1, borderColor: 'rgba(176,127,223,0.4)' },
  copyText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 11 },
  divider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  metaCol: { flex: 1, minWidth: '40%' },
  metaVal: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 13, marginTop: 2 },
  planPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.16)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.36)', marginTop: 4, alignSelf: 'flex-start' },
  planText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.6 },
  upgradeHint: { width: '100%', color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, marginTop: 4, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14, width: '100%' },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  actionText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },
  footNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  footText: { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.med, fontSize: 11.5 },
});
