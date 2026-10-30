import { Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';

export default function EchoLayout() {
  const pathname = usePathname();
  // The ECHO pages are web-only, except the coupon scanner (/echo/scan/[code])
  // which is native-safe and must stay reachable from the camera flow.
  const isScanRoute = /^\/echo\/scan(\/|$)/.test(pathname || '');
  if (Platform.OS !== 'web' && !isScanRoute) return <WebOnlyRoute />;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
