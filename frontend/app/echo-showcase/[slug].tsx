// @ts-nocheck
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EchoShowcaseView } from '@/src/views/web/portals/student/views/EchoShowcaseView';

export default function DynamicEchoShowcasePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <EchoShowcaseView
          slug={slug || 'vnr-echo-2026'}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/student-portal');
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  content: {
    padding: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
});
