// @ts-nocheck
import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EchoEventsPage } from '@/src/views/web/echo/EchoEventsPage';

export default function EchoRegisterSlugPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View className="flex-1 bg-navy">
      <EchoEventsPage initialView="reg" initialSlug={slug || 'snist'} />
    </View>
  );
}
