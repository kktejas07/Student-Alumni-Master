import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  // If explicitly set to something other than localhost, trust it (e.g. prod URL)
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // Extract port from envUrl if present, otherwise default to 8002
  let port = '8002';
  if (envUrl) {
    const match = envUrl.match(/:(\d+)/);
    if (match) {
      port = match[1];
    }
  }

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
  // Otherwise, construct url with accessed port.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    let hn = window.location.hostname;
    if (hn === 'localhost') hn = '127.0.0.1'; // Force IPv4 to avoid ::1 resolution issues with Uvicorn
    if (hn !== '127.0.0.1' && !hn.startsWith('192.168.') && !hn.startsWith('10.')) {
      return '';
    }
    return `${window.location.protocol}//${hn}:${port}`;
  }

  return `http://localhost:${port}`;
}

export const BASE = getBaseUrl();

