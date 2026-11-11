// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function EchoRegisterIndexPage() {
  const { slug, event } = useLocalSearchParams<{ slug?: string | string[]; event?: string | string[] }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const slugParam = Array.isArray(slug) ? slug[0] : slug;
  const eventParam = Array.isArray(event) ? event[0] : event;
  const eventSlug = eventParam || slugParam || '';

  React.useEffect(() => {
    if (initialized && eventSlug && !user) {
      router.replace({ pathname: '/login', params: { returnTo: `/echo/${eventSlug}/register` } });
    }
  }, [eventSlug, initialized, router, user]);

  if (eventSlug && (!initialized || !user)) {
    return <View style={[s.container, s.loading]}><Text style={s.loadingText}>Please sign in to register for this ECHO event.</Text></View>;
  }

  return (
    <View style={s.container}>
      <EchoEventsPage initialView={eventSlug ? 'reg' : 'list'} initialSlug={eventSlug} />
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
