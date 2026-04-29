/**
 * Home Tab — Student Dashboard (matches SA Web Design spec).
 *
 * Same StudentDashboardView component used on web, adapts to mobile via
 * useWindowDimensions inside the view.
 */
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentDashboardView } from '@/src/views/web/StudentDashboardView';

export default function HomeTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name?.split(' ')[0] || 'there';

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
        <StudentDashboardView
          userName={firstName}
          onOpenNotifications={() => router.push('/notifications')}
          onSeeAllInternships={() => router.push('/(tabs)/courses')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
