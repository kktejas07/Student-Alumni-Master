// @ts-nocheck
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EchoShowcaseView } from '@/src/views/web/portals/student/views/EchoShowcaseView';

export default function EchoShowcasePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug]);

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.assign('/echo');
      return;
    }
    router.replace('/echo');
  };

  return (
    <View style={s.container}>
      <EchoShowcaseView slug={slug} onBack={handleBack} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh',
    width: '100%',
    overflowY: 'auto',
    backgroundColor: '#0A0A14',
  },
});