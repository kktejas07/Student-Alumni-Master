/**
 * Mobile Network tab — bento + glow category browser.
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import { NETWORK_HERO, NETWORK_SECTIONS } from '@/src/views/web/exploreData';

export default function NetworkTab() {
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['#1A0438', '#2D0760']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ExploreScreen
          pageTitle="Network"
          pageSubtitle="Mentors, alumni, peers, events — your circle of growth."
          searchPlaceholder="Find mentors, rooms, events…"
          hero={NETWORK_HERO}
          sections={NETWORK_SECTIONS}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
});
