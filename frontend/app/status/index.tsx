// @ts-nocheck
import React from 'react';
import { Stack } from 'expo-router';
import { StatusPageRN } from '@/src/views/web/status/StatusPageRN';

export default function StatusIndexRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'System Status · Student Alumni', headerShown: false }} />
      <StatusPageRN initialCode="404" />
    </>
  );
}
