/**
 * Preview route — renders StudentDashboardView as it appears on native
 * iOS/Android (no web sidebar). Useful for design QA.
 *
 * URL: /dash-preview
 */
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudentDashboardView } from '@/src/views/web/StudentDashboardView';

export default function DashPreview() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StudentDashboardView userName="Aarav" />
      </SafeAreaView>
    </View>
  );
}
