/**
 * Mobile Deals tab now renders Internships explore screen with bento + glow.
 * (Repurposed from Deals — student-facing deals can move under Resources later.)
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import { INTERNSHIPS_HERO, INTERNSHIPS_SECTIONS } from '@/src/views/web/exploreData';

export default function InternshipsTab() {
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ExploreScreen
          pageTitle="Internships"
          pageSubtitle="Discover roles tailored to your career path & skills."
          searchPlaceholder="Search roles, companies, locations…"
          hero={INTERNSHIPS_HERO}
          sections={INTERNSHIPS_SECTIONS}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
