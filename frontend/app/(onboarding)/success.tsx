/**
 * Onboarding step 6 — Success / Generated unique ID + QR code.
 * Web: split-screen.  Native: full-screen dark.
 */
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
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
      {/* Success header */}
      <View style={styles.successRow}>
        <View style={styles.iconBox}>
          <CheckCircle2 size={26} color="#34D399" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Profile created</Text>
          <Text style={styles.heroSub}>Your platform identity is ready.</Text>
        </View>
      </View>

      {/* Unique ID card */}
      <View style={[styles.card, styles.cardIdBox]}>
        <Text style={styles.cardLabel}>YOUR UNIQUE ID</Text>
        <Text style={styles.cardIdText} testID="success-unique-id">{user?.unique_id || '—'}</Text>
        <Text style={styles.cardSub}>Use this ID anywhere on the platform.</Text>
      </View>

      {/* QR code card */}
      <View style={styles.card}>
        <Text style={[styles.cardLabel, { textAlign: 'center' }]}>YOUR PLATFORM QR</Text>
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          {user?.qr_code_base64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
              style={styles.qr}
              testID="success-qr-image"
            />
          ) : (
            <View style={[styles.qr, styles.qrPlaceholder]}>
              <Text style={styles.qrPlaceholderText}>QR not available</Text>
            </View>
          )}
          <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 10 }]}>
            Mentors can scan this to connect with you instantly.
          </Text>
        </View>
      </View>

      {/* AI roadmap CTA */}
      <View style={[styles.card, styles.aiCard]}>
        <Sparkles size={22} color="#FCD34D" />
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Your AI roadmap is ready</Text>
          <Text style={styles.aiSub}>
            Personalized milestones, courses and mentor matches based on your career path.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(52,211,153,0.40)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 2 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardIdBox: {
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderColor: 'rgba(196,181,253,0.30)',
  },
  cardIdText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  cardLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 1.2 },
  cardSub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6, lineHeight: 17 },

  qr: {
    width: 180, height: 180, borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  qrPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  qrPlaceholderText: { color: '#7C3AED', fontFamily: 'DMSans_500Medium' },

  aiCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.28)',
  },
  aiTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  aiSub: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginTop: 4, lineHeight: 18 },
});
