// @ts-nocheck
import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { StatusPageRN, StatusPageCode } from '@/src/views/web/status/StatusPageRN';

export default function StatusDynamicRoute() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const validCodes: StatusPageCode[] = ['404', '403', '401', '500', '503', '408', 'offline', 'empty', 'browser'];
  const sanitizedCode: StatusPageCode = validCodes.includes(code as StatusPageCode) ? (code as StatusPageCode) : '404';

  return (
    <>
      <Stack.Screen options={{ title: `Status ${sanitizedCode} · Student Alumni`, headerShown: false }} />
      <StatusPageRN initialCode={sanitizedCode} />
    </>
  );
}
