/**
 * Preview routes (no auth required) for designer QA at any viewport.
 *   /explore-courses
 *   /explore-internships
 *   /explore-network
 */
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import { COURSES_HERO, COURSES_SECTIONS } from '@/src/views/web/exploreData';

export default function ExploreCoursesPreview() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top','bottom']}>
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
