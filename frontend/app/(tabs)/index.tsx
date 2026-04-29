/**
 * Home Tab — Student Dashboard.
 *
 * Uses the dedicated mobile dashboard view (StudentDashboardMobileView)
 * that matches the SA "Mobile Standalone" prototype with quick-action grid,
 * member spotlight carousel, and recent activity feed.
 */
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentDashboardMobileView } from '@/src/views/web/StudentDashboardMobileView';

export default function HomeTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fullName = user?.full_name || 'Student';

  // Quick-action routing map
  const handleAction = (id: string) => {
    switch (id) {
      case 'alumni':     router.push('/(tabs)/network'); break;
      case 'jobs':       router.push('/(tabs)/courses'); break;
      case 'events':     router.push('/(tabs)/deals');   break;
      case 'mentorship': router.push('/(tabs)/network'); break;
      case 'announce':   router.push('/notifications');  break;
      case 'leaderboard':router.push('/(tabs)/network'); break;
      case 'resources':  router.push('/(tabs)/courses'); break;
      case 'settings':   router.push('/profile');        break;
    }
  };

  return (
    <View style={styles.shell}>
      {/* Page background gradient — matches design spec #1A0438 → #2D0760 */}
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StudentDashboardMobileView
          userName={fullName}
          notifCount={3}
          onOpenNotifications={() => router.push('/notifications')}
          onOpenProfile={() => router.push('/profile')}
          onActionPress={handleAction}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
