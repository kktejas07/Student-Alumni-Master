/**
 * Onboarding step 1 — Role-aware intro
 *
 * Renders different perks/copy per role:
 *   - student / alumni : career-focused perks (default)
 *   - mentor           : mentor-portal perks (sessions, earnings, analytics)
 *   - college          : tenant/admin perks (manage students, events, analytics)
 */
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sparkles, BookOpen, Users, Tag, Briefcase, Building2,
  CalendarCheck, MessageSquare, BarChart3, Star, Wallet, ShieldCheck,
  GraduationCap, Trophy,
} from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const C = Colors.light;

// Per-role perk grid + heading + subtitle
const ROLE_CONTENT: Record<string, {
  highlight: string;
  subtitle: string;
  perks: { icon: any; color: string; title: string; desc: string }[];
}> = {
  student: {
    highlight: 'career profile',
    subtitle: "A few quick steps and we'll generate your unique ID, QR badge, and a personalized AI roadmap.",
    perks: [
      { icon: Sparkles, color: C.accentYellow, title: 'AI Career Roadmap', desc: 'Personalized path based on your goals' },
      { icon: BookOpen, color: C.accentMint, title: 'Free + Paid Courses', desc: 'From edX, Coursera, MIT and more' },
      { icon: Users, color: C.accentBlue, title: 'Mentors & Alumni', desc: 'Network with people in your field' },
      { icon: Briefcase, color: C.accentPink, title: 'Internships & Jobs', desc: 'Discover global opportunities' },
      { icon: Tag, color: C.accentPurple, title: 'Student Deals', desc: 'Exclusive coupons on top brands' },
      { icon: Building2, color: C.accentOrange, title: 'Resources', desc: 'Insurance, housing, education loans' },
    ],
  },
  alumni: {
    highlight: 'alumni profile',
    subtitle: 'A few quick steps and we’ll connect you with juniors, peers, and exciting mentorship opportunities.',
    perks: [
      { icon: Users, color: C.accentBlue, title: 'Reconnect with Peers', desc: 'Find batchmates from your campus' },
      { icon: GraduationCap, color: C.accentMint, title: 'Mentor Juniors', desc: 'Pay it forward with your experience' },
      { icon: Briefcase, color: C.accentPink, title: 'Refer Talent', desc: 'Hire from your alma mater' },
      { icon: MessageSquare, color: C.accentYellow, title: 'Knowledge Rooms', desc: 'Share insights with the community' },
      { icon: Trophy, color: C.accentPurple, title: 'Showcase Work', desc: 'Get featured for your achievements' },
      { icon: Tag, color: C.accentOrange, title: 'Alumni Perks', desc: 'Exclusive deals just for graduates' },
    ],
  },
  mentor: {
    highlight: 'mentor portal',
    subtitle: 'Set up your mentor profile, post sessions, and start earning while shaping student careers.',
    perks: [
      { icon: CalendarCheck, color: C.accentMint, title: 'Post Sessions', desc: 'Open 1:1 or group slots students can book' },
      { icon: Wallet, color: C.accentYellow, title: 'Earn from Sessions', desc: 'Set your rate, get paid per booking' },
      { icon: BarChart3, color: C.accentBlue, title: 'Mentor Analytics', desc: 'Track sessions, hours, ratings & growth' },
      { icon: Star, color: C.accentPink, title: 'Build Reputation', desc: 'Collect verified reviews from students' },
      { icon: MessageSquare, color: C.accentPurple, title: 'Knowledge Rooms', desc: 'Host live discussions with cohorts' },
      { icon: ShieldCheck, color: C.accentOrange, title: 'Verified Profile', desc: 'Stand out with your face-verified badge' },
    ],
  },
  college: {
    highlight: 'institution dashboard',
    subtitle: "Onboard your students, run events with QR check-in, and access tenant-wide analytics.",
    perks: [
      { icon: Users, color: C.accentBlue, title: 'Manage Students', desc: 'Bulk-add, verify, and roster control' },
      { icon: CalendarCheck, color: C.accentMint, title: 'Run Events', desc: 'QR-based registration & attendance' },
      { icon: BarChart3, color: C.accentYellow, title: 'Tenant Analytics', desc: 'Engagement, placements, outcomes' },
      { icon: GraduationCap, color: C.accentPink, title: 'Alumni Engine', desc: 'Re-engage your alumni network' },
      { icon: Briefcase, color: C.accentPurple, title: 'Recruiter Hub', desc: 'Connect with hiring partners' },
      { icon: ShieldCheck, color: C.accentOrange, title: 'Verified Tenant', desc: 'Officially recognised college badge' },
    ],
  },
};

export default function RoleInfo() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const role = (user?.role || 'student') as keyof typeof ROLE_CONTENT;
  const content = ROLE_CONTENT[role] || ROLE_CONTENT.student;

  const next = () => router.push('/(onboarding)/school-info');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>WELCOME, {user?.full_name?.split(' ')[0]?.toUpperCase()} 👋</Text>
        <Text style={styles.h1}>
          Let's set up{'\n'}your{' '}
          <Text style={{ color: C.accentPink }}>{content.highlight}</Text>
        </Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        <View style={styles.grid}>
          {content.perks.map((p) => {
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
