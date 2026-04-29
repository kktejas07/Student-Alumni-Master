/**
 * Mobile Courses tab — bento + glow category browser.
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import { COURSES_HERO, COURSES_SECTIONS } from '@/src/views/web/exploreData';

export default function CoursesTab() {
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ExploreScreen
          pageTitle="Courses"
          pageSubtitle="Skill up with curated tracks, free certifications & expert mentors."
          searchPlaceholder="Search courses, skills, instructors…"
          hero={COURSES_HERO}
          sections={COURSES_SECTIONS}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
