// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function EchoRegisterIndexPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  React.useEffect(() => {
    if (initialized && !user) router.replace({ pathname: '/login', params: { returnTo: `/student-portal/${slug || 'snist'}` } });
  }, [initialized, router, slug, user]);

  if (!initialized || !user) {
    return <View style={[s.container, s.loading]}><Text style={s.loadingText}>Please sign in to register for this ECHO event.</Text></View>;
  }

  return (
    <View style={s.container}>
      <EchoEventsPage initialView="reg" initialSlug={slug || 'snist'} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  loading: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#A78BFA', fontSize: 15, textAlign: 'center' },
});
