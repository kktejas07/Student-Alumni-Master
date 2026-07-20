/**
 * Onboarding step 1 — Role-aware intro (Web split-screen + Native dark theme).
 */
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, BookOpen, Handshake, Briefcase, Tag, Landmark, GraduationCap, MessageSquare, Trophy, Calendar, DollarSign, BarChart3, Star, Shield } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { OnboardingShell } from '@/src/views/web/OnboardingShell';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Sparkles, BookOpen, Handshake, Briefcase, Tag, Landmark, GraduationCap,
  MessageSquare, Trophy, Calendar, DollarSign, BarChart3, Star, Shield,
};

const ROLE_CONTENT: Record<string, {
  highlight: string;
  subtitle: string;
  perks: { icon: string; title: string; desc: string }[];
}> = {
  student: {
    highlight: 'career profile',
    subtitle: "A few quick steps and we'll generate your unique ID, QR badge, and a personalized AI roadmap.",
    perks: [
      { icon: 'Sparkles', title: 'AI Career Roadmap', desc: 'Personalized path based on your goals' },
      { icon: 'BookOpen', title: 'Free + Paid Courses', desc: 'From edX, Coursera, MIT and more' },
      { icon: 'Handshake', title: 'Mentors & Alumni', desc: 'Network with people in your field' },
      { icon: 'Briefcase', title: 'Internships & Jobs', desc: 'Discover global opportunities' },
      { icon: 'Tag', title: 'Student Deals', desc: 'Exclusive coupons on top brands' },
      { icon: 'Landmark', title: 'Resources', desc: 'Insurance, housing, education loans' },
    ],
  },
  alumni: {
    highlight: 'alumni profile',
    subtitle: "A few quick steps and we'll connect you with juniors, peers, and mentorship opportunities.",
    perks: [
      { icon: 'Handshake', title: 'Reconnect with Peers', desc: 'Find batchmates from your campus' },
      { icon: 'GraduationCap', title: 'Mentor Juniors', desc: 'Pay it forward with your experience' },
      { icon: 'Briefcase', title: 'Refer Talent', desc: 'Hire from your alma mater' },
      { icon: 'MessageSquare', title: 'Knowledge Rooms', desc: 'Share insights with the community' },
      { icon: 'Trophy', title: 'Showcase Work', desc: 'Get featured for your achievements' },
      { icon: 'Tag', title: 'Alumni Perks', desc: 'Exclusive deals just for graduates' },
    ],
  },
  mentor: {
    highlight: 'mentor portal',
    subtitle: 'Set up your mentor profile, post sessions, and start earning while shaping student careers.',
    perks: [
      { icon: 'Calendar', title: 'Post Sessions', desc: 'Open 1:1 or group slots students can book' },
      { icon: 'DollarSign', title: 'Earn from Sessions', desc: 'Set your rate, get paid per booking' },
      { icon: 'BarChart3', title: 'Mentor Analytics', desc: 'Track sessions, hours, ratings & growth' },
      { icon: 'Star', title: 'Build Reputation', desc: 'Collect verified reviews from students' },
      { icon: 'MessageSquare', title: 'Knowledge Rooms', desc: 'Host live discussions with cohorts' },
      { icon: 'Shield', title: 'Verified Profile', desc: 'Stand out with your face-verified badge' },
    ],
  },
  college: {
    highlight: 'institution dashboard',
    subtitle: 'Onboard your students, run events with QR check-in, and access tenant-wide analytics.',
    perks: [
      { icon: 'Handshake', title: 'Manage Students', desc: 'Bulk-add, verify, and roster control' },
      { icon: 'Calendar', title: 'Run Events', desc: 'QR-based registration & attendance' },
      { icon: 'BarChart3', title: 'Tenant Analytics', desc: 'Engagement, placements, outcomes' },
      { icon: 'GraduationCap', title: 'Alumni Engine', desc: 'Re-engage your alumni network' },
      { icon: 'Briefcase', title: 'Recruiter Hub', desc: 'Connect with hiring partners' },
      { icon: 'Shield', title: 'Verified Tenant', desc: 'Officially recognised college badge' },
    ],
  },
};

const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function RoleInfo() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || 'student') as keyof typeof ROLE_CONTENT;
  const content = ROLE_CONTENT[role] || ROLE_CONTENT.student;
  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <OnboardingShell
      step={0}
      stepBarSteps={STEPS}
      kicker={firstName ? `Welcome, ${firstName}` : 'Welcome'}
      title={
        <>
          Let's set up your{' '}
          <Text style={{ color: '#C4B5FD' }}>{content.highlight}</Text>
        </>
      }
      subtitle={content.subtitle}
      primaryLabel="Continue →"
      primaryTestID="onboarding-role-info-next-btn"
      onPrimary={() => router.push('/(onboarding)/school-info')}
      showBack={false}
    >
      <View style={styles.grid}>
        {content.perks.map((p) => {
          const IconComp = ICON_MAP[p.icon];
          return (
          <View key={p.title} style={styles.tile}>
            <View style={styles.tileIcon}>
              {IconComp && <IconComp size={22} color="#C4B5FD" />}
            </View>
            <Text style={styles.tileTitle}>{p.title}</Text>
            <Text style={styles.tileDesc} numberOfLines={2}>{p.desc}</Text>
          </View>
        );})}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  tileIcon: {
    width: 40, height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14, marginTop: 6 },
  tileDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17 },
});
