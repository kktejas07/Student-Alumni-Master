import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  // If explicitly set to something other than localhost, trust it (e.g. prod URL)
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // Native mobile apps (Android/iOS) cannot connect to host's localhost.
  // We use Expo's hostUri to get the developer's machine IP.
  if (Platform.OS !== 'web') {
    // @ts-ignore - expo-constants types don't always include manifest2
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:8002`;
    }
  }

  // Web fallback: if accessed via network IP (e.g. 192.168.1.5), use that IP instead of localhost
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname && hostname !== 'localhost') {
      return `${protocol}//${hostname}:8002`;
    }
  }

  return 'http://localhost:8002';
}
