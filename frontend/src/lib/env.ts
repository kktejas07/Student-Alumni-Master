import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  if (envUrl) {
    return envUrl;
  }

  // Default must match the documented local backend (backend/start.bat,
  // docker-compose, DOKPLOY.md): http://127.0.0.1:8000. start.ps1 also starts
  // uvicorn on this port, so dev defaults and docs never disagree.
  let port = '8000';

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

  // Web logic: if accessed via production domain, return empty string for relative routing.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let hn = window.location.hostname;
    if (hn !== 'localhost' && hn !== '127.0.0.1' && !hn.startsWith('192.168.') && !hn.startsWith('10.')) {
      return '';
    }
    return `${window.location.protocol}//${hn}:${port}`;
  }

  return `http://localhost:${port}`;
}
