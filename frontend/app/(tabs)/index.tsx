/**
 * Home Tab — Role-aware dashboard.
 * Routes to the correct dashboard view based on user.role:
 *   • student / alumni → StudentDashboardMobileView
 *   • mentor          → MentorDashboardView
 *   • college         → CollegeDashboardView
 */
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentDashboardMobileView } from '@/src/views/web/StudentDashboardMobileView';
import { MentorDashboardView } from '@/src/views/web/MentorDashboardView';
import { CollegeDashboardView } from '@/src/views/web/CollegeDashboardView';

const PAGE_BG: Record<string, [string, string]> = {
  student: ['#1A0438', '#2D0760'],
  alumni:  ['#1A0438', '#2D0760'],
  mentor:  ['#022C22', '#064E3B'],
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
            onOpenProfile={() => router.push('/profile' as any)}
            onActionPress={(id) => {
              if (id === 'create-event') router.push('/courses');
              else if (id === 'earnings')  router.push('/deals');
              else if (id === 'feedback' || id === 'analytics') router.push('/network');
            }}
          />
        ) : role === 'college' ? (
          <CollegeDashboardView
            collegeName={fullName ? `${fullName} Admin` : 'College Admin'}
            notifCount={4}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/profile' as any)}
            onActionPress={(id) => {
              if (id === 'announce')   router.push('/notifications');
              else if (id === 'new-event') router.push('/deals');
              else if (id === 'analytics') router.push('/network');
              else if (id === 'students')  router.push('/network');
            }}
          />
        ) : (
          <StudentDashboardMobileView
            userName={fullName}
            notifCount={3}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/profile' as any)}
            onActionPress={(id) => {
              switch (id) {
                case 'alumni':     router.push('/network'); break;
                case 'jobs':       router.push('/courses'); break;
                case 'events':     router.push('/deals');   break;
                case 'mentorship': router.push('/network'); break;
                case 'announce':   router.push('/notifications');  break;
                case 'leaderboard':router.push('/network'); break;
                case 'resources':  router.push('/courses'); break;
                case 'settings':   router.push('/profile' as any);        break;
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
