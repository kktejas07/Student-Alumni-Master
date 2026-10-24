import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// `window` is defined on React Native too, so storage access must be gated on
// Platform and wrapped in try/catch (private mode, SSR, blocked storage).
const hasWebStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export interface Vendor {
  vendor_id: string;
  name: string;
}

export interface VendorAuthState {
  token: string | null;
  vendor: Vendor | null;
  login: (token: string, vendor: Vendor) => void;
  logout: () => void;
}

export const useVendorAuthStore = create<VendorAuthState>((set) => {
  // Try to load initial state from localStorage (web only for simplicity in this workaround)
  let initialToken = null;
  let initialVendor = null;
  if (hasWebStorage()) {
    try {
      const stored = window.localStorage.getItem('vendor-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        initialToken = parsed.token;
        initialVendor = parsed.vendor;
      }
    } catch (e) {}
  }

  return {
    token: initialToken,
    vendor: initialVendor,
    login: (token, vendor) => {
      if (hasWebStorage()) {
        try {
          window.localStorage.setItem('vendor-auth-storage', JSON.stringify({ token, vendor }));
        } catch {}
      }
      set({ token, vendor });
    },
    logout: () => {
      if (hasWebStorage()) {
        try {
          window.localStorage.removeItem('vendor-auth-storage');
        } catch {}
      }
      set({ token: null, vendor: null });
    },
  };
});
