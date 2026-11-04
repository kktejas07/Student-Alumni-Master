// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EchoShowcaseView } from '@/src/views/web/portals/student/views/EchoShowcaseView';

export default function EchoShowcasePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  return (
    <View style={s.container}>
      <EchoShowcaseView slug={slug} onBack={() => router.push('/echo')} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});