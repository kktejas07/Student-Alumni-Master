// @ts-nocheck
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, usePathname, Stack } from 'expo-router';
import { StatusPageRN } from '@/src/views/web/status/StatusPageRN';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const fullPath = window.location.pathname;
      const lowerPath = fullPath.toLowerCase();

      // Normalize uppercase URLs (e.g. /WELCOME -> /welcome)
      if (fullPath !== lowerPath) {
        const normalized = lowerPath.length > 1 && lowerPath.endsWith('/') 
          ? lowerPath.slice(0, -1) 
          : lowerPath;
        router.replace(normalized as any);
      }
    }
  }, [pathname]);

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found · Student Alumni', headerShown: false }} />
      <StatusPageRN initialCode="404" />
    </>
  );
}
