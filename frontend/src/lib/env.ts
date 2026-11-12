import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBaseUrl() {
  // Web logic: if accessed in a browser, align dynamically with the active host.
  // In production (non-local domain), return empty string for relative routing.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hn = window.location.hostname;
    const protocol = window.location.protocol;
    if (hn !== 'localhost' && hn !== '127.0.0.1' && !hn.startsWith('192.168.') && !hn.startsWith('10.')) {
      return '';
    }
    // For local dev, match current host and use port 8002
    return `${protocol}//${hn}:8002`;
  }

  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }

  const port = '8002';

  // Native mobile apps (Android/iOS) cannot connect to host's localhost.
  // We use Expo's hostUri to get the developer's machine IP.
  if (Platform.OS !== 'web') {
    // @ts-ignore - expo-constants types don't always include manifest2
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:${port}`;
    }
  }

  return `http://localhost:${port}`;
}
