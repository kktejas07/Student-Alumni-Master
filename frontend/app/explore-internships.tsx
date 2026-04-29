import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import { INTERNSHIPS_HERO, INTERNSHIPS_SECTIONS } from '@/src/views/web/exploreData';

export default function ExploreInternshipsPreview() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#1A0438', '#2D0760']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top','bottom']}>
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
