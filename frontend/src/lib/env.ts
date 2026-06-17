import { Platform } from 'react-native';

export function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn !== 'localhost' && hn !== '127.0.0.1' && !hn.startsWith('192.168.') && !hn.startsWith('10.')) {
      return '';
    }
    return `${window.location.protocol}//${hn}:8000`;
  }
  return 'http://localhost:8000';
}
