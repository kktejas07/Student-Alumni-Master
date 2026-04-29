/**
 * Welcome / Splash screen - first thing a non-logged-in user sees.
 */
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button } from '@/src/views/components';

const C = Colors.light;
const HERO =
  'https://images.unsplash.com/photo-1620650764255-6797e68c7904?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200';

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroWrap}>
          <View style={styles.heroShadow} />
          <Image source={{ uri: HERO }} style={styles.hero} />
        </View>

        <View style={styles.tagBox}>
          <Text style={styles.tagText}>FOR STUDENTS · ALUMNI · MENTORS · COLLEGES</Text>
        </View>

        <Text style={styles.h1}>
          Your career,{'\n'}
          <Text style={{ color: C.accentPink }}>your roadmap.</Text>
        </Text>

        <Text style={styles.subtitle}>
          AI-powered guidance, courses, mentors, internships and exclusive student deals — all in
          one place.
        </Text>

        <View style={styles.actions}>
          <Button
            title="Get started"
            onPress={() => router.push('/(auth)/register')}
            testID="welcome-get-started-btn"
          />
          <Button
            title="I already have an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
            testID="welcome-login-btn"
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heroWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.35,
    marginBottom: Spacing.lg,
  },
  heroShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: C.shadow,
    borderRadius: 20,
  },
  hero: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.border,
  },
  tagBox: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentYellow,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  tagText: { ...Typography.caption, color: C.textPrimary, fontSize: 11 },
  h1: { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.md },
  subtitle: {
    ...Typography.bodyLg,
    color: C.textSecondary,
    marginBottom: Spacing.xl,
  },
  actions: { gap: 4 },
});
