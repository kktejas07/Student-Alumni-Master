/**
 * Home Tab — Role-aware dashboard.
 * Routes to the correct dashboard view based on user.role:
 *   • student / alumni → StudentDashboardMobileView
 *   • mentor          → MentorDashboardView
 *   • college         → CollegeDashboardView
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentDashboardMobileView } from '@/src/views/web/StudentDashboardMobileView';
import { MentorDashboardView } from '@/src/views/web/MentorDashboardView';
import { CollegeDashboardView } from '@/src/views/web/CollegeDashboardView';

const PAGE_BG: Record<string, [string, string]> = {
  student: ['#1A0438', '#2D0760'],
  alumni: ['#1A0438', '#2D0760'],
  mentor: ['#022C22', '#064E3B'],
  college: ['#0F172A', '#1E3A8A'],
};

export default function HomeTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';
  const fullName = user?.full_name || 'there';
  const bg = PAGE_BG[role] || PAGE_BG.student;

  return (
    <View style={styles.shell}>
      <LinearGradient colors={bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {role === 'mentor' ? (
          <MentorDashboardView
            userName={fullName}
            notifCount={2}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/(tabs)/profile' as any)}
            onActionPress={(id) => {
              if (id === 'create-event') router.push('/events');
              else if (id === 'earnings') router.push('/wallet' as any);
              else if (id === 'analytics') router.push('/analytics' as any);
              else if (id === 'feedback') router.push('/network');
            }}
          />
        ) : role === 'college' ? (
          <CollegeDashboardView
            collegeName={fullName ? `${fullName} Admin` : 'College Admin'}
            notifCount={4}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/(tabs)/profile' as any)}
            onActionPress={(id) => {
              if (id === 'announce') router.push('/notifications');
              else if (id === 'new-event' || id === 'events') router.push('/events');
              else if (id === 'analytics' || id === 'placement') router.push('/analytics' as any);
              else if (id === 'students' || id === 'alumni') router.push('/network');
            }}
          />
        ) : (
          <StudentDashboardMobileView
            userName={fullName}
            notifCount={3}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/(tabs)/profile' as any)}
            onActionPress={(id) => {
              // The dashboard emits `job-<id>`, `event-<id>` and `course-<id>` for
              // its cards; the bare ids are kept for the quick-action tiles.
              if (id.startsWith('event-')) { router.push(`/event/${id.slice('event-'.length)}` as any); return; }
              if (id.startsWith('job-')) { router.push('/internships'); return; }
              if (id.startsWith('course-')) { router.push('/courses'); return; }
              switch (id) {
                case 'alumni': router.push('/network'); break;
                case 'jobs': router.push('/internships'); break;
                case 'events': router.push('/events'); break;
                case 'mentorship': router.push('/network'); break;
                case 'announce': router.push('/notifications'); break;
                case 'leaderboard': router.push('/network'); break;
                case 'resources': router.push('/resources' as any); break;
                case 'settings': router.push('/(tabs)/profile' as any); break;
              }
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
