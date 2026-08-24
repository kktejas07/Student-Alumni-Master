import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/src/theme';

const C = Colors.light;

export default function AboutPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ArrowLeft size={20} color={C.text} onPress={() => router.back()} />
          <Text style={styles.title}>About</Text>
        </View>
        <Text style={styles.body}>
          Student Alumni is an AI career platform for students, alumni, mentors, and colleges.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.text, lineHeight: 24 },
});
