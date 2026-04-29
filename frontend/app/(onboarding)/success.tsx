/**
 * Onboarding step 5 — Success / Generated unique ID + QR code
 */
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const C = Colors.light;

export default function OnboardingSuccess() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <CheckCircle2 size={40} color={C.accentMint} />
          </View>
          <Text style={styles.kicker}>YOU'RE ALL SET! 🎉</Text>
        </View>

        <Text style={styles.h1}>
          Welcome to{'\n'}
          <Text style={{ color: C.accentPink }}>your career platform</Text>
        </Text>

        <NeoCard bg={C.accentYellow} shadow="md" style={{ marginTop: Spacing.lg }}>
          <Text style={[Typography.caption, { color: C.textPrimary }]}>YOUR UNIQUE ID</Text>
          <Text style={[Typography.h3, { color: C.textPrimary, marginTop: 4 }]} testID="success-unique-id">
            {user?.unique_id || '—'}
          </Text>
          <Text style={[Typography.bodySm, { color: C.textPrimary, marginTop: 4 }]}>
            Use this ID anywhere on the platform.
          </Text>
        </NeoCard>

        <NeoCard shadow="md" style={{ marginTop: Spacing.md }}>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[Typography.caption, { color: C.textSecondary }]}>YOUR PLATFORM QR</Text>
            {user?.qr_code_base64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
                style={styles.qr}
                testID="success-qr-image"
              />
            ) : (
              <View style={[styles.qr, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[Typography.bodySm, { color: C.textSecondary }]}>QR not available</Text>
              </View>
            )}
            <Text style={[Typography.bodySm, { color: C.textSecondary, textAlign: 'center' }]}>
              Mentors can scan this to connect with you instantly.
            </Text>
          </View>
        </NeoCard>

        <NeoCard bg={C.accentMint} shadow="md" style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Sparkles size={28} color={C.textPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>
                Your AI roadmap is ready
              </Text>
              <Text style={[Typography.bodySm, { color: C.textPrimary, marginTop: 4 }]}>
                We've crafted personalized milestones, courses and mentors based on your career path.
              </Text>
            </View>
          </View>
        </NeoCard>

        <Button
          title="Go to my dashboard"
          onPress={() => router.replace('/(tabs)')}
          testID="success-dashboard-btn"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { ...Typography.caption, color: C.textSecondary, flex: 1 },
  h1: { ...Typography.h1, fontSize: 36, lineHeight: 40, color: C.textPrimary },
  qr: { width: 220, height: 220, borderRadius: 12, backgroundColor: C.surfaceMuted },
});
