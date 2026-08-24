// @ts-nocheck
import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EchoEventsPage } from '@/src/views/web/echo/EchoEventsPage';

export default function EchoShowcasePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View className="flex-1 bg-navy">
      <EchoEventsPage initialView="detail" initialSlug={slug || 'snist'} />
    </View>
  );
}