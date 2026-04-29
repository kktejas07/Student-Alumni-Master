/**
 * Onboarding step 1 — Role-aware intro
 */
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, BookOpen, Users, Tag, Briefcase, Building2 } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const C = Colors.light;

const PERKS = [
  { icon: Sparkles, color: C.accentYellow, title: 'AI Career Roadmap', desc: 'Personalized path based on your goals' },
  { icon: BookOpen, color: C.accentMint, title: 'Free + Paid Courses', desc: 'From edX, Coursera, MIT and more' },
  { icon: Users, color: C.accentBlue, title: 'Mentors & Alumni', desc: 'Network with people in your field' },
  { icon: Briefcase, color: C.accentPink, title: 'Internships & Jobs', desc: 'Discover global opportunities' },
  { icon: Tag, color: C.accentPurple, title: 'Student Deals', desc: 'Exclusive coupons on top brands' },
  { icon: Building2, color: C.accentOrange, title: 'Resources', desc: 'Insurance, housing, education loans' },
];

export default function RoleInfo() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const next = () => router.push('/(onboarding)/school-info');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>WELCOME, {user?.full_name?.split(' ')[0]?.toUpperCase()} 👋</Text>
        <Text style={styles.h1}>
          Let's set up{'\n'}your{' '}
          <Text style={{ color: C.accentPink }}>career profile</Text>
        </Text>
        <Text style={styles.subtitle}>
          A few quick steps and we'll generate your unique ID, QR badge, and a personalized AI roadmap.
        </Text>

        <View style={styles.grid}>
          {PERKS.map((p) => {
            const Icon = p.icon;
            return (
              <View key={p.title} style={styles.gridItem}>
                <NeoCard bg={p.color}>
                  <View style={{ gap: 8 }}>
                    <Icon size={26} color={C.textPrimary} />
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{p.title}</Text>
                    <Text style={[Typography.bodySm, { color: C.textPrimary, opacity: 0.85 }]}>{p.desc}</Text>
                  </View>
                </NeoCard>
              </View>
            );
          })}
        </View>

        <Button
          title="Continue →"
          onPress={next}
          testID="onboarding-role-info-next-btn"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  kicker: { ...Typography.caption, color: C.textSecondary, marginBottom: Spacing.sm },
  h1: { ...Typography.h1, fontSize: 36, lineHeight: 40, color: C.textPrimary, marginBottom: Spacing.md },
  subtitle: { ...Typography.bodyLg, color: C.textSecondary, marginBottom: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
});
